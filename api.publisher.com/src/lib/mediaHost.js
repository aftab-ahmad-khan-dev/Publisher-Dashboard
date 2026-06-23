import { Media } from '../models/Media.js'
import { apiPublicBase } from './publicUrl.js'

async function hostDataUrl(dataUrl, workspaceId) {
  const [meta, b64] = String(dataUrl).split(',')
  const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  const doc = await Media.create({
    workspaceId,
    contentType,
    data: Buffer.from(b64 || '', 'base64'),
  })
  return doc._id.toString()
}

/**
 * Instagram and Threads require PUBLIC image URLs (they can't take an upload or
 * base64). We persist each data-URL image and return URLs served by /api/media/:id.
 * Returns an ordered array (empty when there's no usable image — caller decides if
 * that's an error). `platform` selects which per-platform image toggle to honour.
 * Supports carousels: `imageDataUrls` / `imageUrls` arrays, falling back to the
 * legacy single `imageDataUrl` / `imageUrl` fields.
 */
export async function resolvePublicImageUrls({ postState, workspaceId, platform = 'instagram' }) {
  // Respect the per-platform image toggle.
  if (postState?.imageVisibility?.[platform] === false) return []

  // Already public URLs (e.g. bulk uploads) — use them directly.
  const publicUrls = Array.isArray(postState?.imageUrls) && postState.imageUrls.length
    ? postState.imageUrls
    : postState?.imageUrl
      ? [postState.imageUrl]
      : []
  if (publicUrls.length) return publicUrls.filter(Boolean)

  const dataUrls = (
    Array.isArray(postState?.imageDataUrls) && postState.imageDataUrls.length
      ? postState.imageDataUrls
      : postState?.imageDataUrl
        ? [postState.imageDataUrl]
        : []
  ).filter((u) => typeof u === 'string' && u.startsWith('data:image/'))
  if (!dataUrls.length) return []

  const base = apiPublicBase()
  if (!base) {
    throw new Error(
      `API_PUBLIC_URL must be set so ${platform} can fetch the image. Set it to the public API URL.`,
    )
  }

  const urls = []
  for (const dataUrl of dataUrls) {
    const id = await hostDataUrl(dataUrl, workspaceId)
    urls.push(`${base}/api/media/${id}`)
  }
  return urls
}

/** Single-URL convenience wrapper for callers that only need the first image. */
export async function resolvePublicImageUrl(args) {
  const urls = await resolvePublicImageUrls(args)
  return urls[0] ?? null
}
