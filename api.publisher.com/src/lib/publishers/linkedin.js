const LINKEDIN_VERSION = '202402'

export async function testLinkedInConnection(linkedin) {
  const token = linkedin.accessToken?.trim()
  if (!token) {
    return {
      ok: true,
      message:
        'LinkedIn app credentials saved. Add an Access Token to publish (OAuth required).',
      needsToken: true,
    }
  }
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: err || 'LinkedIn token validation failed' }
  }
  const data = await res.json().catch(() => ({}))
  return { ok: true, message: `LinkedIn token valid${data.name ? ` (${data.name})` : ''}` }
}

export async function publishToLinkedIn({ text, orgUrn, accessToken }) {
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': LINKEDIN_VERSION,
    },
    body: JSON.stringify({
      author: orgUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })
  const raw = await res.text()
  let data = {}
  try {
    data = JSON.parse(raw)
  } catch {
    data = { raw }
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || raw || 'LinkedIn publish failed')
  }
  const postId = res.headers.get('x-restli-id') || data.id
  return { platform: 'linkedin', postId }
}
