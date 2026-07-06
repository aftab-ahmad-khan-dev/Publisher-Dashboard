import { Media } from '../models/Media.js'
import { apiPublicBase } from './publicUrl.js'
import { mediaPublicUrl } from './mediaResolve.js'
import { isPubliclyFetchableUrl } from './metaImageUrl.js'

/**
 * Instagram and Threads require a PUBLIC image URL (they can't take an upload or
 * base64). We persist the composer's data-URL image and return a URL served by
 * /api/media/:id. Returns null when there's no usable image (caller decides if
 * that's an error). `platform` selects which per-platform image toggle to honour.
 */
export async function resolvePublicImageUrl({ postState, workspaceId, platform = 'instagram' }) {
  if (postState?.imageVisibility?.[platform] === false) return null

  if (postState?.imageUrl && isPubliclyFetchableUrl(postState.imageUrl)) {
    return postState.imageUrl
  }

  const fromStored = mediaPublicUrl(postState?.imageMediaId)
  if (fromStored && isPubliclyFetchableUrl(fromStored)) return fromStored

  const dataUrl = postState?.imageDataUrl
  if (!dataUrl?.startsWith('data:image/')) return null

  const base = apiPublicBase()
  if (!base) {
    throw new Error(
      `API_PUBLIC_URL must be set so ${platform} can fetch the image. Set it to the public API URL.`,
    )
  }

  const [meta, b64] = dataUrl.split(',')
  const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  const doc = await Media.create({
    workspaceId,
    contentType,
    data: Buffer.from(b64 || '', 'base64'),
  })
  return `${base}/api/media/${doc._id.toString()}`
}
