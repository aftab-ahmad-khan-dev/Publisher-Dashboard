import crypto from 'crypto'
import { getWorkspaceConfig, saveGmailTokens } from './configStore.js'
import { logger } from './logger.js'
import { apiPublicBase } from './publicUrl.js'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]

const GMAIL_CALLBACK_PATH = '/api/auth/gmail/callback'
const OAUTH_STATE_TTL_MS = 15 * 60 * 1000
const DEFAULT_127_REDIRECT = `http://127.0.0.1:3001${GMAIL_CALLBACK_PATH}`
const DEFAULT_LOCAL_REDIRECT = DEFAULT_127_REDIRECT

/** Build a callback URL from API_PUBLIC_URL (the deployed domain) when set. */
function publicCallback(path) {
  const base = apiPublicBase()
  return base ? `${base}${path}` : null
}

/** Google OAuth redirect must hit the API callback — never the Vite /api-config page. */
export function normalizeGmailRedirectUri(uri) {
  const value = uri?.trim()
  if (!value) return null
  if (value.includes('/api-config')) return null
  try {
    const url = new URL(value)
    if (!url.pathname.endsWith(GMAIL_CALLBACK_PATH)) return null
    // Google matches redirect URIs literally — localhost ≠ 127.0.0.1
    if (url.hostname === 'localhost') url.hostname = '127.0.0.1'
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function getGmailOAuthSetup(config = {}) {
  const { clientId, clientSecret, redirectUri } = getClientCredentials(config)
  const fromEnv = normalizeGmailRedirectUri(process.env.GMAIL_REDIRECT_URI)
  const redirectUrisToRegister = [
    DEFAULT_LOCAL_REDIRECT,
    DEFAULT_127_REDIRECT,
    fromEnv,
    redirectUri,
  ].filter((u, i, a) => u && a.indexOf(u) === i)

  return {
    redirectUri,
    clientId: clientId || '',
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret),
    redirectUrisToRegister,
    googleCredentialsUrl: 'https://console.cloud.google.com/apis/credentials',
  }
}

function stateSigningKey() {
  return (
    process.env.OAUTH_STATE_SECRET?.trim() ||
    process.env.GMAIL_CLIENT_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    'pulse-gmail-oauth-dev-only'
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

function getClientCredentials(config) {
  return {
    clientId:
      process.env.GMAIL_CLIENT_ID?.trim() || config.gmail?.clientId?.trim() || '',
    clientSecret:
      process.env.GMAIL_CLIENT_SECRET?.trim() || config.gmail?.clientSecret?.trim() || '',
    redirectUri:
      normalizeGmailRedirectUri(publicCallback(GMAIL_CALLBACK_PATH)) ||
      normalizeGmailRedirectUri(process.env.GMAIL_REDIRECT_URI) ||
      DEFAULT_LOCAL_REDIRECT,
  }
}

export function startGmailAuth(workspaceId) {
  return getWorkspaceConfig(workspaceId).then((config) => {
    const { clientId, redirectUri } = getClientCredentials(config)
    if (!clientId) {
      throw new Error(
        'Gmail Client ID is required. Paste it in API Config → Save Gmail now, or set GMAIL_CLIENT_ID in api.publisher.com/.env and restart the API server.',
      )
    }

    const state = createOAuthState(workspaceId)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    const dbClientId = config.gmail?.clientId?.trim()
    if (dbClientId && dbClientId !== clientId) {
      logger.warn(
        'Gmail Client ID in MongoDB differs from GMAIL_CLIENT_ID in .env — OAuth uses .env. Add redirect URI to the .env client in Google Cloud.',
        { envClient: clientId.slice(0, 24), dbClient: dbClientId.slice(0, 24) },
      )
    }
    logger.info('Gmail OAuth → Google (register this redirect URI on this Client ID)', {
      redirectUri,
      clientId,
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  })
}

export async function handleGmailCallback(code, state) {
  const pending = parseOAuthState(state)
  if (!pending) {
    throw new Error(
      'Invalid or expired OAuth state. Click Connect Gmail again (finish within 15 minutes). If you changed GMAIL_CLIENT_SECRET in .env, restart the API first, then connect.',
    )
  }

  const config = await getWorkspaceConfig(pending.workspaceId)
  const { clientId, clientSecret, redirectUri } = getClientCredentials(config)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok) {
    if (tokenData.error === 'invalid_client') {
      throw new Error(
        'The provided client secret is invalid. In Google Cloud → Credentials → your Web client (same Client ID as .env) → Client secrets → create/copy secret → paste into GMAIL_CLIENT_SECRET in api .env, restart API, Save Gmail now, then Connect again.',
      )
    }
    throw new Error(tokenData.error_description || tokenData.error || 'Gmail token exchange failed')
  }

  let fromEmail = config.gmail?.fromEmail || ''
  if (tokenData.access_token) {
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json().catch(() => ({}))
    if (profile.email) fromEmail = profile.email
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null

  await saveGmailTokens(pending.workspaceId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || config.gmail?.refreshToken,
    tokenExpiresAt: expiresAt,
    fromEmail,
    connected: true,
    calendarConnectedAt: new Date(),
  })

  return { workspaceId: pending.workspaceId, fromEmail }
}

export async function refreshGmailTokenIfNeeded(workspaceId) {
  const config = await getWorkspaceConfig(workspaceId)
  const gmail = config.gmail
  if (!gmail?.refreshToken?.trim()) return config

  const expires = gmail.tokenExpiresAt ? new Date(gmail.tokenExpiresAt).getTime() : 0
  if (expires > Date.now() + 60_000 && gmail.accessToken?.trim()) {
    return config
  }

  const { clientId, clientSecret } = getClientCredentials(config)
  if (!clientId || !clientSecret) {
    throw new Error(
      'Gmail OAuth client is missing. Paste Client ID + Secret in Integrations, then Connect Gmail.',
    )
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: gmail.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok) {
    await saveGmailTokens(workspaceId, {
      accessToken: '',
      tokenExpiresAt: null,
    })
    const detail = tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`
    logger.warn('Gmail token refresh failed', { detail })
    throw new Error(
      'Gmail session expired or invalid. Reconnect Gmail in Integrations (accept Calendar permissions).',
    )
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null

  await saveGmailTokens(workspaceId, {
    accessToken: tokenData.access_token,
    refreshToken: gmail.refreshToken,
    tokenExpiresAt: expiresAt,
  })

  return getWorkspaceConfig(workspaceId)
}

export async function getGmailAccessToken(workspaceId) {
  const config = await refreshGmailTokenIfNeeded(workspaceId)
  const token = config.gmail?.accessToken?.trim()
  if (!token) {
    throw new Error('Gmail is not connected. Connect Gmail in Integrations.')
  }
  return { accessToken: token, fromEmail: config.gmail?.fromEmail || '' }
}

/** Map Google Calendar API auth failures to a reconnect message. */
export function calendarAuthErrorMessage(err) {
  const msg = String(err?.message || err || '')
  if (
    /invalid authentication credentials|invalid_grant|401|Login Required|UNAUTHENTICATED/i.test(
      msg,
    )
  ) {
    return 'Google Calendar auth failed. Reconnect Gmail in Integrations and accept Calendar access.'
  }
  return msg
}
