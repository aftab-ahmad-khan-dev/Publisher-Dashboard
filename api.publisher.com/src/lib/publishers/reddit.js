import { redditTitleFromBody } from '../contentPolicy.js'

const UA_DEFAULT = 'PulsePublisher/1.0'

export function isRedditConfigured(reddit) {
  return Boolean(
    reddit?.clientId?.trim() &&
      reddit?.clientSecret?.trim() &&
      reddit?.refreshToken?.trim() &&
      reddit?.subreddit?.trim(),
  )
}

async function redditAccessToken(reddit) {
  const clientId = reddit.clientId.trim()
  const clientSecret = reddit.clientSecret.trim()
  const refreshToken = reddit.refreshToken.trim()
  const userAgent = reddit.userAgent?.trim() || UA_DEFAULT

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || `Reddit auth failed (${res.status})`)
  }
  return { accessToken: data.access_token, userAgent }
}

export async function testRedditConnection(reddit) {
  if (!isRedditConfigured(reddit)) {
    return {
      ok: false,
      error: 'Client ID, Client Secret, Refresh Token, and Subreddit are required.',
    }
  }
  const { accessToken, userAgent } = await redditAccessToken(reddit)
  const res = await fetch('https://oauth.reddit.com/api/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': userAgent,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.message || `Reddit API error (${res.status})` }
  }
  return {
    ok: true,
    message: `Reddit connected as u/${data.name}. Subreddit r/${reddit.subreddit.replace(/^r\//, '')} ready.`,
    username: data.name,
  }
}

export async function publishToReddit({ text, postState, reddit }) {
  if (!isRedditConfigured(reddit)) {
    throw new Error('Reddit is not configured. Add API credentials in API Config.')
  }

  const title = postState?.redditTitle?.trim() || redditTitleFromBody(text)
  const { accessToken, userAgent } = await redditAccessToken(reddit)
  const sr = reddit.subreddit.trim().replace(/^r\//, '')

  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sr,
      kind: 'self',
      title,
      text,
      api_type: 'json',
    }),
  })

  const data = await res.json().catch(() => ({}))
  const errors = data?.json?.errors
  if (!res.ok || errors?.length) {
    const msg = errors?.[0]?.[1] || data.message || `Reddit submit failed (${res.status})`
    throw new Error(msg)
  }

  const postUrl = data?.json?.data?.url
  return {
    platform: 'reddit',
    ok: true,
    url: postUrl,
    title,
    subreddit: sr,
    mode: 'api',
  }
}
