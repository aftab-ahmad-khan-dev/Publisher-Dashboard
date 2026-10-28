import crypto from 'crypto'
import { getWorkspaceConfig, saveRedditConfig } from './configStore.js'
import { logger } from './logger.js'
import { getRedditEnvSetup, resolveRedditCredentials } from './redditSetup.js'

const SCOPES = ['submit', 'read', 'identity']
const OAUTH_STATE_TTL_MS = 15 * 60 * 1000
const REDDIT_CALLBACK_PATH = '/api/auth/reddit/callback'

function stateSigningKey() {
  return (
    process.env.OAUTH_STATE_SECRET?.trim() ||
    process.env.REDDIT_CLIENT_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    'pulse-reddit-oauth-dev-only'
  )
}

function createOAuthState(workspaceId) {
  const payload = { w: workspaceId, t: Date.now() }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', stateSigningKey()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function parseOAuthState(state) {
  if (!state || typeof state !== 'string') return null
  const dot = state.indexOf('.')
  if (dot <= 0) return null
  const body = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const expected = crypto.createHmac('sha256', stateSigningKey()).update(body).digest('base64url')
  if (sig.length !== expected.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))) {
      return null
    }
  } catch {
    return null
  }
  let payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!payload?.w || !payload?.t) return null
  if (Date.now() - payload.t > OAUTH_STATE_TTL_MS) return null
  return { workspaceId: String(payload.w) }
}

export function getRedditRedirectUri() {
  const fromEnv = process.env.REDDIT_REDIRECT_URI?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return `http://127.0.0.1:3001${REDDIT_CALLBACK_PATH}`
}

export async function startRedditAuth(workspaceId) {
  const config = await getWorkspaceConfig(workspaceId)
  const creds = resolveRedditCredentials(config)
  const setup = getRedditEnvSetup(config)

  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(
      'Reddit Client ID and Secret are required. Paste them in API Config → Save Reddit now, or set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in api .env.',
    )
  }
  if (!creds.subreddit) {
    throw new Error('Subreddit is required before Connect Reddit (e.g. technology — no r/ prefix).')
  }

  const redirectUri = getRedditRedirectUri()
  const state = createOAuthState(workspaceId)
  const params = new URLSearchParams({
    client_id: creds.clientId,
    response_type: 'code',
    state,
    redirect_uri: redirectUri,
    duration: 'permanent',
    scope: SCOPES.join(' '),
  })

  logger.info('Reddit OAuth → reddit.com (add this redirect URI on your Reddit app)', {
    redirectUri,
    clientId: creds.clientId,
    subreddit: creds.subreddit,
  })

  return `https://www.reddit.com/api/v1/authorize?${params}`
}

export async function handleRedditCallback(code, state) {
  const pending = parseOAuthState(state)
  if (!pending) {
    throw new Error(
      'Invalid or expired OAuth state. Click Connect Reddit again. If you changed REDDIT_CLIENT_SECRET in .env, restart the API first.',
    )
  }

  const config = await getWorkspaceConfig(pending.workspaceId)
  const creds = resolveRedditCredentials(config)
  const redirectUri = getRedditRedirectUri()
  const userAgent = creds.userAgent || 'PulsePublisher/1.0'

  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')
  const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok) {
    const msg = tokenData.error || tokenData.message || 'Reddit token exchange failed'
    if (msg === 'invalid_client' || /invalid client/i.test(String(msg))) {
      throw new Error(
        'Invalid Reddit client ID or secret. Copy both from reddit.com/prefs/apps → your app → update .env and Save Reddit now.',
      )
    }
    throw new Error(msg)
  }

  await saveRedditConfig(pending.workspaceId, {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    refreshToken: tokenData.refresh_token,
    subreddit: creds.subreddit,
    userAgent: creds.userAgent,
  })

  return {
    workspaceId: pending.workspaceId,
    username: tokenData.scope,
  }
}
