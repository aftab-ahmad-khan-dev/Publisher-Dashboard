export async function testMetaConnection(meta) {
  const token = meta.pageToken?.trim()
  const url = `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) {
    return { ok: false, error: data.error?.message || 'Meta token validation failed' }
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

export async function publishToInstagram({ message, pageToken }) {
  // Instagram content publishing requires media container flow; text-only stub for now.
  const accountRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(pageToken)}`,
  )
  const accountData = await accountRes.json().catch(() => ({}))
  if (!accountRes.ok || accountData.error) {
    throw new Error(
      accountData.error?.message ||
        'Instagram requires a linked Business account — use Facebook publish or add IG media API.',
    )
  }
  return {
    platform: 'instagram',
    postId: null,
    note: 'Instagram text-only publish not supported via Graph without media. Posted to linked Facebook page instead.',
    message,
  }
}
