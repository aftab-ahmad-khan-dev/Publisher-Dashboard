import { Media } from '../models/Media.js'

/**
 * Instagram requires a PUBLIC image URL (it can't take an upload or base64). We
 * persist the composer's data-URL image and return a URL served by /api/media/:id.
 * Returns null when there's no usable image (caller decides if that's an error).
 */
export async function resolvePublicImageUrl({ postState, workspaceId }) {
  // Respect the per-platform image toggle.
  if (postState?.imageVisibility?.instagram === false) return null

  // Already a public URL (e.g. bulk uploads) — use it directly.
  if (postState?.imageUrl) return postState.imageUrl

  const dataUrl = postState?.imageDataUrl
  if (!dataUrl?.startsWith('data:image/')) return null

  const base = process.env.API_PUBLIC_URL?.trim()?.replace(/\/$/, '')
  if (!base) {
    throw new Error(
      'API_PUBLIC_URL must be set so Instagram can fetch the image. Set it to the public API URL.',
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
