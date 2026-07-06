import { Media } from '../models/Media.js'
import { apiPublicBase } from './publicUrl.js'

/** Public URL for a stored media document. */
export function mediaPublicUrl(mediaId) {
  const base = apiPublicBase()
  if (!base || !mediaId) return null
  return `${base}/api/media/${mediaId}`
}

/**
 * Load imageMediaId from Mongo into imageDataUrl + imageUrl for publishers
 * (Facebook/LinkedIn need bytes; IG/Threads/Pinterest need a public URL).
 */
export async function hydratePostStateMedia(postState) {
  if (!postState) return postState
  if (postState.imageDataUrl?.startsWith('data:image/')) {
    if (!postState.imageUrl && postState.imageMediaId) {
      return { ...postState, imageUrl: mediaPublicUrl(postState.imageMediaId) }
    }
    return postState
  }

  const id = postState.imageMediaId
  if (!id) return postState

  const media = await Media.findById(id)
  if (!media?.data?.length) {
    // Media may have expired or been removed — fall back to inline imageDataUrl.
    const inline = postState.imageDataUrl
    if (inline?.startsWith('data:image/')) {
      return {
        ...postState,
        imageUrl: postState.imageUrl && !postState.imageUrl.includes('/api/media/')
          ? postState.imageUrl
          : mediaPublicUrl(id),
      }
    }
    return postState
  }

  const contentType = media.contentType || 'image/jpeg'
  const b64 = Buffer.from(media.data).toString('base64')
  const dataUrl = `data:${contentType};base64,${b64}`

  return {
    ...postState,
    imageDataUrl: dataUrl,
    imageUrl: mediaPublicUrl(id),
    imagePreview: postState.imagePreview || dataUrl,
  }
}
