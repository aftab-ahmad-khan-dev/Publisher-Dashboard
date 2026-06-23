const API = 'https://graph.threads.net/v1.0'

export function isThreadsConfigured(threads) {
  return Boolean(threads?.accessToken?.trim() && threads?.userId?.trim())
}

export async function testThreadsConnection(threads) {
  const token = threads?.accessToken?.trim()
  if (!token) {
    return { ok: false, error: 'Threads access token is required (Meta Developer → Threads API → generate token).' }
  }
  const res = await fetch(`${API}/me?fields=id,username&access_token=${encodeURIComponent(token)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    return { ok: false, error: data.error?.message || `Threads API error (${res.status})` }
  }
  if (!threads?.userId?.trim()) {
    return { ok: true, needsToken: true, message: `Token valid for @${data.username}. Add your Threads user ID (${data.id}) to publish.` }
  }
  return { ok: true, message: `Threads connected as @${data.username}.`, username: data.username }
}

/**
 * Poll an image container until Threads finishes downloading/processing the image.
 * Publishing before it's FINISHED drops the image (the post goes out text-only) or
 * errors — TEXT containers are instant so this only matters for IMAGE posts.
 * Status endpoint: GET /{container-id}?fields=status,error_message.
 */
async function waitForThreadsContainer(containerId, token, attempts = 15) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `${API}/${containerId}?fields=status,error_message&access_token=${encodeURIComponent(token)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (data.status === 'FINISHED') return
    if (data.status === 'ERROR' || data.status === 'EXPIRED') {
      throw new Error(
        data.error_message ||
          `Threads could not process the image (status ${data.status}). Is the URL public and a supported format?`,
      )
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Threads image is still processing after 30s. Try again or use a smaller image.')
}

/** Create a Threads container from the given params; returns its creation id. */
async function createThreadsContainer(userId, token, params) {
  const res = await fetch(`${API}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Threads container failed (${res.status})`)
  }
  return data.id
}

/** Publish an already-prepared Threads container; returns the published post id. */
async function publishThreadsContainer(userId, token, creationId) {
  const res = await fetch(`${API}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Threads publish failed (${res.status})`)
  }
  return data.id
}

/**
 * Publish a post to Threads — two-step: create a media container, then publish it.
 * Pass public `imageUrls` for image posts; omit/empty for text-only. Threads can't
 * accept base64/uploads, so the caller must resolve public URLs first. Multiple
 * images post as a carousel (child IMAGE containers + a CAROUSEL parent).
 * Threads API docs: POST /{user-id}/threads then POST /{user-id}/threads_publish.
 */
export async function publishToThreads({ text, imageUrls, threads }) {
  if (!isThreadsConfigured(threads)) {
    throw new Error('Threads needs an access token and your Threads user ID in API Config.')
  }
  const token = threads.accessToken.trim()
  const userId = threads.userId.trim()
  const urls = (Array.isArray(imageUrls) ? imageUrls : imageUrls ? [imageUrls] : []).filter(Boolean)
  const caption = (text || '').slice(0, 500)

  // Carousel (2–20 items): child IMAGE containers, then a CAROUSEL parent.
  if (urls.length > 1) {
    const childIds = []
    for (const url of urls.slice(0, 20)) {
      const childId = await createThreadsContainer(userId, token, {
        media_type: 'IMAGE',
        image_url: url,
        is_carousel_item: 'true',
      })
      await waitForThreadsContainer(childId, token)
      childIds.push(childId)
    }
    const parentId = await createThreadsContainer(userId, token, {
      media_type: 'CAROUSEL',
      text: caption,
      children: childIds.join(','),
    })
    await waitForThreadsContainer(parentId, token)
    const postId = await publishThreadsContainer(userId, token, parentId)
    return { platform: 'threads', ok: true, postId, mode: 'carousel' }
  }

  // Single image or text-only.
  const params = { media_type: 'TEXT', text: caption }
  if (urls.length === 1) {
    params.media_type = 'IMAGE'
    params.image_url = urls[0]
  }
  const creationId = await createThreadsContainer(userId, token, params)

  // An image container must finish processing before publish, or the image is dropped.
  if (urls.length === 1) {
    await waitForThreadsContainer(creationId, token)
  }

  const postId = await publishThreadsContainer(userId, token, creationId)
  return { platform: 'threads', ok: true, postId, mode: 'api' }
}
