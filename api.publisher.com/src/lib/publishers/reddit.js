import { redditTitleFromBody } from '../contentPolicy.js'
import { resolveRedditCredentials } from '../redditSetup.js'
import { normalizePoll } from '../pollPolicy.js'

export function isRedditConfigured(reddit) {
  const creds = resolveRedditCredentials({ reddit })
  return Boolean(
    creds.clientId && creds.clientSecret && creds.refreshToken && creds.subreddit,
  )
}

async function redditAccessToken(reddit) {
  const creds = resolveRedditCredentials({ reddit })
  const clientId = creds.clientId
  const clientSecret = creds.clientSecret
  const refreshToken = creds.refreshToken
  const userAgent = creds.userAgent

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
  const creds = resolveRedditCredentials({ reddit })
  if (!isRedditConfigured(reddit)) {
    return {
      ok: false,
      error:
        'Client ID, Client Secret, Refresh Token, and Subreddit are required (or set REDDIT_* in api .env, then Connect Reddit).',
    }
  }
  const { accessToken, userAgent } = await redditAccessToken(creds)
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
    message: `Reddit connected as u/${data.name}. Subreddit r/${creds.subreddit.replace(/^r\//, '')} ready.`,
    username: data.name,
  }
}

export async function publishToReddit({ text, postState, reddit }) {
  if (!isRedditConfigured(reddit)) {
    throw new Error('Reddit is not configured. Add API credentials in API Config.')
  }

  const creds = resolveRedditCredentials({ reddit })
  const poll = normalizePoll(postState)
  const { accessToken, userAgent } = await redditAccessToken(creds)
  const sr = creds.subreddit.replace(/^r\//, '')

  if (poll) {
    const title = poll.question || postState?.redditTitle?.trim() || redditTitleFromBody(text)
    const duration = Math.min(7, Math.max(1, poll.durationDays || 3))
    const res = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sr,
        kind: 'poll',
        title,
        text: text || '',
        poll_options: poll.options.join(','),
        poll_duration: String(duration),
        api_type: 'json',
      }),
    })

    const data = await res.json().catch(() => ({}))
    const errors = data?.json?.errors
    if (!res.ok || errors?.length) {
      const msg = errors?.[0]?.[1] || data.message || `Reddit poll submit failed (${res.status})`
      throw new Error(msg)
    }

    return {
      platform: 'reddit',
      ok: true,
      url: data?.json?.data?.url,
      title,
      subreddit: sr,
      mode: 'poll',
      options: poll.options,
    }
  }

  const title = postState?.redditTitle?.trim() || redditTitleFromBody(text)

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
