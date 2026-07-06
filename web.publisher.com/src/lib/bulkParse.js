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

/** Max decoded image size for publish/upload (under Express 15 MB JSON cap). */
export const PUBLISH_IMAGE_MAX_BYTES = 14_000_000

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function estimateDataUrlBytes(dataUrl) {
  const b64 = String(dataUrl).split(',')[1] || ''
  return Math.ceil((b64.length * 3) / 4)
}

function encodeCanvas(bitmap, width, height, mimeType, quality = 0.98) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  if (mimeType === 'image/png') return canvas.toDataURL('image/png')
  if (mimeType === 'image/webp') return canvas.toDataURL('image/webp', quality)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Prepare an image for publishing: original bytes when under the cap; otherwise
 * re-encode at full resolution first (high quality), shrinking only as a last resort.
 */
export async function prepareImageForPublish(
  file,
  maxBytes = PUBLISH_IMAGE_MAX_BYTES,
) {
  if (!file?.type?.startsWith('image/')) return fileToDataUrl(file)

  // Keep exact file bytes (dimensions + format) when within the upload limit.
  if (file.size <= maxBytes) return fileToDataUrl(file)

  const bitmap = await createImageBitmap(file)
  const srcW = bitmap.width
  const srcH = bitmap.height
  const preferPng = file.type === 'image/png'
  const preferWebp = file.type === 'image/webp'

  let quality = 0.98
  let width = srcW

  try {
    for (let attempt = 0; attempt < 24; attempt++) {
      const height = Math.max(1, Math.round(srcH * (width / srcW)))

      if (width === srcW && preferPng) {
        const png = encodeCanvas(bitmap, width, height, 'image/png')
        if (estimateDataUrlBytes(png) <= maxBytes) return png
      }
      if (width === srcW && preferWebp) {
        const webp = encodeCanvas(bitmap, width, height, 'image/webp', quality)
        if (estimateDataUrlBytes(webp) <= maxBytes) return webp
      }

      const jpeg = encodeCanvas(bitmap, width, height, 'image/jpeg', quality)
      if (estimateDataUrlBytes(jpeg) <= maxBytes) return jpeg

      if (quality > 0.84) {
        quality -= 0.02
      } else {
        width = Math.max(1440, Math.round(width * 0.94))
        quality = 0.96
      }
    }

    const height = Math.max(1, Math.round(srcH * (width / srcW)))
    return encodeCanvas(bitmap, width, height, 'image/jpeg', 0.88)
  } finally {
    bitmap.close()
  }
}

/** @deprecated Use prepareImageForPublish */
export async function compressImageFile(file) {
  return prepareImageForPublish(file)
}

/** Smaller payload for legacy metadata-only requests. */
export async function compressImageFileForBulk(file, maxBytes = 160_000) {
  if (!file.type.startsWith('image/')) return fileToDataUrl(file)
  return prepareImageForPublish(file, maxBytes)
}

/** Upload / schedule — preserves original size when the file fits under the cap. */
export async function compressImageFileForUpload(
  file,
  maxBytes = PUBLISH_IMAGE_MAX_BYTES,
) {
  return prepareImageForPublish(file, maxBytes)
}
