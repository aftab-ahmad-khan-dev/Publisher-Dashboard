/** Parse bulk paste: "Post 1 (Day 1)" blocks separated by blank lines */

const HEADER_PATTERNS = [
  /^Post\s+(\d+)\s*\(\s*Day\s+(\d+)\s*\)\s*$/i,
  /^Post\s+(\d+)\s*[-–:]\s*Day\s+(\d+)\s*$/i,
  /^Post\s+(\d+)\s*$/i,
  /^Day\s+(\d+)\s*$/i,
  /^#+\s*Post\s+(\d+)\s*\(\s*Day\s+(\d+)\s*\)\s*$/i,
]

function matchHeader(line) {
  const trimmed = line.trim()
  if (!trimmed) return null
  for (const re of HEADER_PATTERNS) {
    const m = trimmed.match(re)
    if (m) {
      const postNum = Number(m[1])
      const dayNum = m[2] != null ? Number(m[2]) : postNum
      return { postNum, dayNum, title: trimmed }
    }
  }
  return null
}

export function parseBulkContent(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const posts = []
  let current = null

  const flush = () => {
    if (!current) return
    current.body = current.body.trim()
    if (current.body || current.title) posts.push(current)
    current = null
  }

  for (const line of lines) {
    const header = matchHeader(line)
    if (header) {
      flush()
      current = {
        postNum: header.postNum,
        dayNum: header.dayNum,
        title: header.title,
        body: '',
      }
      continue
    }
    if (!current) {
      if (line.trim()) {
        current = { postNum: posts.length + 1, dayNum: posts.length + 1, title: `Post ${posts.length + 1}`, body: '' }
        current.body += (current.body ? '\n' : '') + line
      }
      continue
    }
    current.body += (current.body ? '\n' : '') + line
  }
  flush()

  return posts.map((p, i) => ({
    ...p,
    id: `bulk-${p.postNum ?? i + 1}`,
    postNum: p.postNum ?? i + 1,
    dayNum: p.dayNum ?? i + 1,
  }))
}

/** Extract leading number from filenames: 1.jpg, post-2.png, image_3.webp */
export function imageIndexFromFilename(name) {
  const base = name.replace(/\.[^.]+$/, '')
  const patterns = [
    /^(\d+)$/,
    /^post[-_]?(\d+)$/i,
    /^image[-_]?(\d+)$/i,
    /^day[-_]?(\d+)$/i,
    /^(\d+)[-_].+$/i,
  ]
  for (const re of patterns) {
    const m = base.match(re)
    if (m) return Number(m[1])
  }
  return null
}

export function buildImageMap(files) {
  const map = new Map()
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const idx = imageIndexFromFilename(file.name)
    if (idx != null && !map.has(idx)) map.set(idx, file)
  }
  return map
}

export function assignImagesToPosts(posts, imageMap) {
  return posts.map((p) => {
    const byPost = imageMap.get(p.postNum)
    const byDay = imageMap.get(p.dayNum)
    const file = byPost || byDay || null
    return { ...p, imageFile: file, imageName: file?.name || null }
  })
}

export function computeScheduleDate(startDateStr, dayNum, hour = 12, minute = 0) {
  const [y, m, d] = startDateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d, hour, minute, 0, 0)
  date.setDate(date.getDate() + (dayNum - 1))
  return date
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Resize/compress for API payload limits */
export async function compressImageFile(file, maxWidth = 1200, quality = 0.82) {
  if (!file.type.startsWith('image/')) return fileToDataUrl(file)
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
