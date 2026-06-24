/** True when Meta's servers can fetch this URL (not localhost / private LAN). */
export function isPubliclyFetchableUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return false
    }
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = String(dataUrl).split(',')
  const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  return new Blob([Buffer.from(b64 || '', 'base64')], { type: contentType })
}

/**
 * Upload an unpublished photo to the Facebook Page so Meta hosts it on a public CDN URL.
 * Instagram and Threads require a publicly reachable image_url — localhost won't work.
 */
export async function uploadUnpublishedPhotoToMeta(dataUrl, pageToken) {
  const token = pageToken?.trim()
  if (!token) {
    throw new Error('Meta Page access token is required to host images for Instagram/Threads.')
  }

  const form = new FormData()
  form.append('source', dataUrlToBlob(dataUrl), 'image.jpg')
  form.append('published', 'false')
  form.append('access_token', token)

  const uploadRes = await fetch('https://graph.facebook.com/v21.0/me/photos', {
    method: 'POST',
    body: form,
  })
  const uploadData = await uploadRes.json().catch(() => ({}))
  if (!uploadRes.ok || uploadData.error) {
    throw new Error(uploadData.error?.message || 'Could not upload image to Meta for hosting.')
  }

  const photoId = uploadData.id
  if (!photoId) {
    throw new Error('Meta photo upload did not return a photo ID.')
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${photoId}?fields=images&access_token=${encodeURIComponent(token)}`,
  )
  const metaData = await metaRes.json().catch(() => ({}))
  const publicUrl = metaData.images?.[0]?.source
  if (!publicUrl) {
    throw new Error('Meta photo upload succeeded but no public image URL was returned.')
  }
  return publicUrl
}

/**
 * Resolve a URL Meta platforms can fetch. Uses the existing URL when public,
 * otherwise uploads bytes to Meta's CDN via the Page token.
 */
export async function resolveMetaPublicImageUrl({ imageUrl, imageDataUrl, pageToken }) {
  if (isPubliclyFetchableUrl(imageUrl)) return imageUrl

  const dataUrl = imageDataUrl?.startsWith('data:image/') ? imageDataUrl : null
  if (!dataUrl) {
    throw new Error(
      'Image is not publicly reachable. Re-attach the image or set API_PUBLIC_URL to a deployed API URL.',
    )
  }

  return uploadUnpublishedPhotoToMeta(dataUrl, pageToken)
}
