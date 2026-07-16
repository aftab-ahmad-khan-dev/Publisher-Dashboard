/**
 * Cloudinary uploads for payment receipts (signed upload).
 */
import crypto from 'crypto'

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      (process.env.CLOUDINARY_API_SECRET?.trim() || process.env.CLOUDINARY_UPLOAD_PRESET?.trim()),
  )
}

function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex')
}

/**
 * Upload an image buffer (or data URL) to Cloudinary.
 * Prefers signed upload; falls back to unsigned preset when secret is missing.
 */
export async function uploadReceiptToCloudinary({
  buffer,
  contentType = 'image/jpeg',
  folder = 'payment-receipts',
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim() || 'ml_default'

  if (!cloudName) {
    throw new Error('CLOUDINARY_CLOUD_NAME is not configured')
  }

  const timestamp = Math.round(Date.now() / 1000)
  const form = new FormData()
  const blob = new Blob([buffer], { type: contentType })
  form.append('file', blob, `receipt-${timestamp}.jpg`)

  if (apiSecret && apiKey) {
    const params = { folder, timestamp }
    const signature = signParams(params, apiSecret)
    form.append('api_key', apiKey)
    form.append('timestamp', String(timestamp))
    form.append('folder', folder)
    form.append('signature', signature)
  } else if (uploadPreset) {
    form.append('upload_preset', uploadPreset)
    form.append('folder', folder)
  } else {
    throw new Error('Cloudinary API secret or upload preset required')
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || `Cloudinary upload failed (${res.status})`)
  }

  return {
    id: data.public_id || '',
    url: data.secure_url || data.url || '',
    bytes: data.bytes || buffer.length,
  }
}

export function parseImageBody(body) {
  const { imageDataUrl, contentType, dataBase64 } = body || {}
  let buffer
  let ct = contentType || 'image/jpeg'

  if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:')) {
    const [meta, b64] = imageDataUrl.split(',')
    ct = /data:(.*?);/.exec(meta)?.[1] || ct
    buffer = Buffer.from(b64 || '', 'base64')
  } else if (typeof dataBase64 === 'string' && dataBase64.length) {
    buffer = Buffer.from(dataBase64, 'base64')
  }

  return { buffer, contentType: ct }
}
