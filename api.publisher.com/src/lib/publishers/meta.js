function formatMetaError(data) {
  const err = data?.error || {}
  const msg = err.message || 'Meta API request failed'
  const code = err.code ?? err.error_subcode
  if (code === 190 || /session has expired|expired/i.test(msg)) {
    return (
      `${msg} ` +
      'Generate a new Page access token (Meta Developer → Tools → Graph API Explorer, or your app’s token tool), ' +
      'then paste it in API Config → PAGE TOKEN and click Test & save Meta.'
    )
  }
  return msg
}

const PAGE_TOKEN_HELP =
  'This needs a PAGE access token, not a User token. In Graph API Explorer set "User or Page" to your Page (not your name) to mint one, or call GET /me/accounts with your user token and copy the page\'s access_token. Make sure pages_manage_posts and pages_read_engagement are granted, then paste it in API Config → PAGE TOKEN.'

/**
 * Inspect the token via /debug_token (needs app credentials). Returns the token
 * `type` (PAGE | USER | ...) and granted `scopes`, or null if it can't be checked.
 */
async function inspectToken(meta, token) {
  const appId = meta.appId?.trim()
  const appSecret = meta.appSecret?.trim()
  if (!appId || !appSecret) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error || !data.data) return null
    return data.data
  } catch {
    return null
  }
}

export async function testMetaConnection(meta) {
  const token = meta.pageToken?.trim()
  if (!token) {
    return { ok: false, error: 'Page access token is required.' }
  }
  const url = `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    return { ok: false, error: formatMetaError(data), expired: data.error?.code === 190 }
  }

  // A valid /me response is not enough: a User token also answers here, but it
  // cannot publish a live Page post (the post lands as draft/scheduled instead).
  const info = await inspectToken(meta, token)
  if (info) {
    if (info.type && info.type !== 'PAGE') {
      return {
        ok: false,
        error: `This is a ${info.type} token, so Facebook publishes posts as drafts instead of live. ${PAGE_TOKEN_HELP}`,
        wrongTokenType: info.type,
      }
    }
    const scopes = info.scopes || []
    if (!scopes.includes('pages_manage_posts')) {
      return {
        ok: false,
        error: `This token is missing the pages_manage_posts permission, so posts will not go live. ${PAGE_TOKEN_HELP}`,
      }
    }
  }

  return { ok: true, message: `Meta connected as ${data.name || data.id}` }
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = String(dataUrl).split(',')
  const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
  return new Blob([Buffer.from(b64 || '', 'base64')], { type: contentType })
}

export async function publishToFacebook({ message, pageToken, postState }) {
  // Respect the per-platform image toggle; default to including the image when present.
  const wantImage = postState?.imageVisibility?.facebook !== false
  const dataUrl = wantImage ? postState?.imageDataUrl : null
  const imageUrl = wantImage ? postState?.imageUrl : null

  if (dataUrl && /^data:video\//i.test(dataUrl)) {
    throw new Error(
      'Facebook video publishing is not supported yet. Attach an image or remove the video.',
    )
  }

  // With an image we must post to /me/photos (a /me/feed text post drops the image).
  if (dataUrl || imageUrl) {
    const url = `https://graph.facebook.com/v21.0/me/photos`
    let res
    if (imageUrl) {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          caption: message,
          published: true,
          access_token: pageToken,
        }),
      })
    } else {
      const form = new FormData()
      form.append('source', dataUrlToBlob(dataUrl), 'image.jpg')
      if (message) form.append('caption', message)
      form.append('published', 'true')
      form.append('access_token', pageToken)
      res = await fetch(url, { method: 'POST', body: form })
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || 'Facebook photo publish failed')
    }
    return { platform: 'facebook', postId: data.post_id || data.id }
  }

  // Text-only feed post. `published: true` is the default, but we set it explicitly
  // so the post can never land in a draft/scheduled state.
  const res = await fetch(`https://graph.facebook.com/v21.0/me/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, published: true, access_token: pageToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Facebook publish failed')
  }
  return { platform: 'facebook', postId: data.id }
}

/** Resolve the IG Business account ID linked to the Page this token controls. */
async function resolveInstagramUserId(pageToken) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${encodeURIComponent(pageToken)}`,
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(formatMetaError(data) || 'Could not read the Instagram account from the Page.')
  }
  const igId = data.instagram_business_account?.id
  if (!igId) {
    throw new Error(
      'No Instagram Business account is linked to this Facebook Page. In Meta settings, link an Instagram Business/Creator account to the Page, and ensure the token has instagram_basic + instagram_content_publish.',
    )
  }
  return igId
}

/** Poll the media container until it finishes processing (images are usually instant). */
async function waitForContainer(creationId, pageToken, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(pageToken)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') {
      throw new Error('Instagram could not process the image (is the URL public and a supported format?).')
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
}

export async function publishToInstagram({ message, pageToken, imageUrl }) {
  // IG has no text-only posts; without a public image URL there's nothing to publish.
  if (!imageUrl) {
    throw new Error(
      'Instagram requires an image, text-only posts cannot be published. Attach an image or disable Instagram for this post.',
    )
  }

  const igUserId = await resolveInstagramUserId(pageToken)

  // 1) Create a media container pointing at the public image URL.
  const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption: message, access_token: pageToken }),
  })
  const createData = await createRes.json().catch(() => ({}))
  if (!createRes.ok || createData.error) {
    throw new Error(createData.error?.message || 'Instagram media container creation failed')
  }
  const creationId = createData.id

  await waitForContainer(creationId, pageToken)

  // 2) Publish the container.
  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: pageToken }),
  })
  const pubData = await pubRes.json().catch(() => ({}))
  if (!pubRes.ok || pubData.error) {
    throw new Error(pubData.error?.message || 'Instagram publish failed')
  }
  return { platform: 'instagram', postId: pubData.id }
}
