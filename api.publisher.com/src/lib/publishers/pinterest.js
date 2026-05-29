const API = 'https://api.pinterest.com/v5'

export function isPinterestConfigured(pinterest) {
  return Boolean(pinterest?.accessToken?.trim() && pinterest?.boardId?.trim())
}

export async function testPinterestConnection(pinterest) {
  const token = pinterest?.accessToken?.trim()
  if (!token) {
    return { ok: false, error: 'Pinterest access token is required (Pinterest Developer → your app → generate token).' }
  }
  const res = await fetch(`${API}/user_account`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.message || `Pinterest API error (${res.status})` }
  }
  if (!pinterest?.boardId?.trim()) {
    return { ok: true, needsToken: true, message: `Token valid for @${data.username}. Add a Board ID to publish Pins.` }
  }
  return { ok: true, message: `Pinterest connected as @${data.username}.`, username: data.username }
}

/**
 * Publish a Pin. Pinterest Pins require an image — the post must carry an image
 * (base64 data URL or a public image URL) or this throws a clear error.
 */
export async function publishToPinterest({ text, postState, pinterest }) {
  if (!isPinterestConfigured(pinterest)) {
    throw new Error('Pinterest needs an access token and a Board ID in API Config.')
  }
  const token = pinterest.accessToken.trim()

  // Resolve image: scheduled/bulk posts carry imageDataUrl; live posts may carry a URL.
  const dataUrl = postState?.imageDataUrl || postState?.imagePreview || ''
  const imageUrl = postState?.imageUrl || ''
  let media_source
  if (dataUrl.startsWith('data:')) {
    const [meta, b64] = dataUrl.split(',')
    const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
    media_source = { source_type: 'image_base64', content_type: contentType, data: b64 }
  } else if (imageUrl) {
    media_source = { source_type: 'image_url', url: imageUrl }
  } else {
    throw new Error('Pinterest requires an image — attach one before publishing a Pin.')
  }

  const title = (postState?.pinTitle?.trim() || text.split('\n')[0] || 'New Pin').slice(0, 100)
  const res = await fetch(`${API}/pins`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      board_id: pinterest.boardId.trim(),
      title,
      description: text.slice(0, 500),
      media_source,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Pinterest publish failed (${res.status})`)
  }
  return { platform: 'pinterest', ok: true, postId: data.id, mode: 'api' }
}
