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

export async function publishToFacebook({ message, pageToken }) {
  const url = `https://graph.facebook.com/v21.0/me/feed`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: pageToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Facebook publish failed')
  }
  return { platform: 'facebook', postId: data.id }
}

export async function publishToInstagram({ postState }) {
  // Instagram has no text-only posts and the media-container publish flow is not
  // implemented yet. Fail loudly instead of silently pretending the post went out,
  // which previously made multi-platform posts look like they only reached Facebook.
  const hasMedia = Boolean(
    postState?.imageDataUrl?.startsWith?.('data:') || postState?.imageUrl,
  )
  if (hasMedia) {
    throw new Error(
      'Instagram publishing is not available yet. Disable Instagram for this post.',
    )
  }
  throw new Error(
    'Instagram requires an image or video, text-only posts cannot be published. Disable Instagram for this post.',
  )
}
