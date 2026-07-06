/** Parse bulk paste: "Post 1 (Day 1)" or "Day 1" blocks (incl. Unicode bold headers). */

const HEADER_PATTERNS = [
  /^Post\s+(\d+)\s*\(\s*Day\s+(\d+)\s*\)\s*$/i,
  /^Post\s+(\d+)\s*[-–:]\s*Day\s+(\d+)\s*$/i,
  /^Post\s+(\d+)\s*$/i,
  /^Day\s+(\d+)\s*$/i,
  /^Day\s+(\d+)\s*[-–:]\s*.+$/i,
  /^#+\s*Post\s+(\d+)\s*\(\s*Day\s+(\d+)\s*\)\s*$/i,
  /^#+\s*Day\s+(\d+)\s*$/i,
]

/**
 * Fancy Unicode (𝗗𝗮𝘆 𝟭, 𝐃𝐚𝐲 𝟏, etc.) → plain ASCII so headers still match.
 */
export function normalizeBulkLine(line) {
  if (!line || typeof line !== 'string') return line
  let out = ''
  for (const ch of line) {
    const cp = ch.codePointAt(0)
    // Mathematical Sans-Serif Bold A–Z / a–z
    if (cp >= 0x1d5d4 && cp <= 0x1d5ed) {
      out += String.fromCharCode(0x41 + (cp - 0x1d5d4))
      continue
    }
    if (cp >= 0x1d5ee && cp <= 0x1d607) {
      out += String.fromCharCode(0x61 + (cp - 0x1d5ee))
      continue
    }
    // Mathematical Sans-Serif Bold digits 0–9
    if (cp >= 0x1d7e2 && cp <= 0x1d7eb) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7e2))
      continue
    }
    // Mathematical Sans-Serif digits 0–9 (non-bold — common in 𝗗𝗮𝘆 𝟭 paste)
    if (cp >= 0x1d7ec && cp <= 0x1d7f5) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7ec))
      continue
    }
    // Mathematical Monospace digits 0–9
    if (cp >= 0x1d7f6 && cp <= 0x1d7ff) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7f6))
      continue
    }
    // Mathematical Bold A–Z / a–z
    if (cp >= 0x1d400 && cp <= 0x1d419) {
      out += String.fromCharCode(0x41 + (cp - 0x1d400))
      continue
    }
    if (cp >= 0x1d41a && cp <= 0x1d433) {
      out += String.fromCharCode(0x61 + (cp - 0x1d41a))
      continue
    }
    // Mathematical Bold digits
    if (cp >= 0x1d7ce && cp <= 0x1d7d7) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7ce))
      continue
    }
    // Fullwidth digits
    if (cp >= 0xff10 && cp <= 0xff19) {
      out += String.fromCharCode(0x30 + (cp - 0xff10))
      continue
    }
    out += ch
  }
  return out
}

function matchHeader(line) {
  const trimmed = normalizeBulkLine(line).trim()
  if (!trimmed) return null
  for (const re of HEADER_PATTERNS) {
    const m = trimmed.match(re)
    if (m) {
      const postNum = Number(m[1])
      const dayNum = m[2] != null ? Number(m[2]) : postNum
      return { postNum, dayNum, title: line.trim() }
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

export function buildImageMap(files, { useUploadOrder = true } = {}) {
  const map = new Map()
  const unnumbered = []

  for (const file of files) {
    if (!file?.type?.startsWith('image/')) continue
    const idx = imageIndexFromFilename(file.name)
    if (idx != null && !map.has(idx)) {
      map.set(idx, file)
    } else if (idx == null) {
      unnumbered.push(file)
    }
  }

  if (useUploadOrder) {
    let slot = 1
    for (const file of unnumbered) {
      while (map.has(slot)) slot++
      map.set(slot, file)
      slot++
    }
  }

  return map
}

export function buildImageMapFromMediaItems(mediaItems = []) {
  const map = new Map()
  const unnumbered = []
  const sorted = [...mediaItems].sort((a, b) => (a.index ?? 9999) - (b.index ?? 9999))

  for (const item of sorted) {
    const file = item.file
    if (!file?.type?.startsWith('image/')) continue
    const idx = item.index ?? imageIndexFromFilename(file.name)
    if (idx != null && !map.has(idx)) {
      map.set(idx, file)
    } else {
      unnumbered.push(file)
    }
  }

  let slot = 1
  for (const file of unnumbered) {
    while (map.has(slot)) slot++
    map.set(slot, file)
    slot++
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

export { computeScheduleDate } from './scheduleUtils'

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function renderCompressedJpeg(file, maxWidth, quality) {
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

/** Resize/compress for single-post publish. */
export async function compressImageFile(file, maxWidth = 4096, quality = 0.92) {
  if (!file.type.startsWith('image/')) return fileToDataUrl(file)
  if (file.size <= 10_000_000) return fileToDataUrl(file)
  return renderCompressedJpeg(file, maxWidth, quality)
}

/** Smaller payload for bulk metadata-only requests (legacy fallback). */
export async function compressImageFileForBulk(file, maxBytes = 160_000) {
  if (!file.type.startsWith('image/')) return fileToDataUrl(file)

  let maxWidth = 900
  let quality = 0.72

  for (let attempt = 0; attempt < 7; attempt++) {
    const dataUrl = await renderCompressedJpeg(file, maxWidth, quality)
    const b64 = dataUrl.split(',')[1] || ''
    const approxBytes = (b64.length * 3) / 4
    if (approxBytes <= maxBytes) return dataUrl
    quality = Math.max(0.48, quality - 0.06)
    maxWidth = Math.round(maxWidth * 0.86)
  }

  return renderCompressedJpeg(file, 640, 0.5)
}

/**
 * Upload / schedule compression. Keeps original dimensions when the file is
 * under the byte cap (full-quality publish). Only downscales when necessary.
 */
export async function compressImageFileForUpload(file, maxBytes = 10_000_000) {
  if (!file.type.startsWith('image/')) return fileToDataUrl(file)

  if (file.size <= maxBytes) return fileToDataUrl(file)

  let maxWidth = 4096
  let quality = 0.92

  for (let attempt = 0; attempt < 12; attempt++) {
    const dataUrl = await renderCompressedJpeg(file, maxWidth, quality)
    const b64 = dataUrl.split(',')[1] || ''
    const approxBytes = (b64.length * 3) / 4
    if (approxBytes <= maxBytes) return dataUrl
    quality = Math.max(0.5, quality - 0.04)
    maxWidth = Math.round(maxWidth * 0.9)
  }

  return renderCompressedJpeg(file, 2560, 0.72)
}
