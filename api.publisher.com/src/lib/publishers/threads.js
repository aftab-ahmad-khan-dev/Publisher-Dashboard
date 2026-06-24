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

/**
 * Publish a post to Threads — two-step: create a media container, then publish it.
 * Pass a public `imageUrl` for an image post; omit it for text-only. Threads can't
 * accept base64/uploads, so the caller must resolve a public URL first.
 * Threads API docs: POST /{user-id}/threads then POST /{user-id}/threads_publish.
 */
export async function publishToThreads({ text, imageUrl, threads }) {
  if (!isThreadsConfigured(threads)) {
    throw new Error('Threads needs an access token and your Threads user ID in API Config.')
  }
  const token = threads.accessToken.trim()
  const userId = threads.userId.trim()

  // 1) Create container
  const createParams = new URLSearchParams({
    media_type: 'TEXT',
    text: text.slice(0, 500),
    access_token: token,
  })
  if (imageUrl) {
    createParams.set('media_type', 'IMAGE')
    createParams.set('image_url', imageUrl)
  }
  const createRes = await fetch(`${API}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createParams,
  })
  const createData = await createRes.json().catch(() => ({}))
  if (!createRes.ok || createData.error) {
    const msg = createData.error?.message || `Threads container failed (${createRes.status})`
    const detail = createData.error?.error_user_msg
    throw new Error(detail ? `${msg}: ${detail}` : msg)
  }

  // An image container must finish processing before publish, or the image is dropped.
  if (imageUrl) {
    await waitForThreadsContainer(createData.id, token)
  }

  // 2) Publish container
  const pubRes = await fetch(`${API}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: createData.id, access_token: token }),
  })
  const pubData = await pubRes.json().catch(() => ({}))
  if (!pubRes.ok || pubData.error) {
    throw new Error(pubData.error?.message || `Threads publish failed (${pubRes.status})`)
  }
  return { platform: 'threads', ok: true, postId: pubData.id, mode: 'api' }
}
