import crypto from 'crypto'
import { getWorkspaceConfig, saveGmailTokens, saveGmailConfig } from './configStore.js'
import { logger } from './logger.js'
import { apiPublicBase, webPublicBase } from './publicUrl.js'

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

/** Build a callback URL from a public origin (WEB or API). */
function publicCallback(path, origin) {
  const base = (origin || '').replace(/\/+$/, '')
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

/**
 * Prefer the URI registered in Google Cloud (GMAIL_REDIRECT_URI / WEB_URL),
 * not the separate API deploy host. Locally always use 127.0.0.1:3001.
 */
export function resolveGmailRedirectUri() {
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    const port = Number(process.env.PORT) || 3001
    return normalizeGmailRedirectUri(`http://127.0.0.1:${port}${GMAIL_CALLBACK_PATH}`)
  }
  return (
    normalizeGmailRedirectUri(process.env.GMAIL_REDIRECT_URI) ||
    normalizeGmailRedirectUri(publicCallback(GMAIL_CALLBACK_PATH, webPublicBase())) ||
    normalizeGmailRedirectUri(publicCallback(GMAIL_CALLBACK_PATH, apiPublicBase())) ||
    DEFAULT_LOCAL_REDIRECT
  )
}

export function getGmailOAuthSetup(config = {}) {
  const { clientId, clientSecret, redirectUri } = getClientCredentials(config)
  const fromEnv = normalizeGmailRedirectUri(process.env.GMAIL_REDIRECT_URI)
  const redirectUrisToRegister = [
    DEFAULT_LOCAL_REDIRECT,
    DEFAULT_127_REDIRECT,
    fromEnv,
    normalizeGmailRedirectUri(publicCallback(GMAIL_CALLBACK_PATH, webPublicBase())),
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

/**
 * Prefer a complete Client ID + Secret pair from one source.
 * Never mix DB Client ID with .env Secret (or vice versa) — that causes Google "Unauthorized".
 */
function getClientCredentials(config) {
  const envId = process.env.GMAIL_CLIENT_ID?.trim() || ''
  const envSecret = process.env.GMAIL_CLIENT_SECRET?.trim() || ''
  const dbId = config.gmail?.clientId?.trim() || ''
  const dbSecret = config.gmail?.clientSecret?.trim() || ''

  const redirectUri = resolveGmailRedirectUri()

  // Complete DB pair always wins
  if (dbId && dbSecret) {
    return { clientId: dbId, clientSecret: dbSecret, redirectUri }
  }
  // Complete env pair only when DB has no conflicting Client ID
  if (envId && envSecret && (!dbId || dbId === envId)) {
    return { clientId: envId, clientSecret: envSecret, redirectUri }
  }
  // Same Client ID in both places — allow secret from either
  if (dbId && envSecret && (!envId || envId === dbId)) {
    return { clientId: dbId, clientSecret: dbSecret || envSecret, redirectUri }
  }
  if (envId && dbSecret && (!dbId || dbId === envId)) {
    return { clientId: envId, clientSecret: dbSecret, redirectUri }
  }

  // Incomplete / conflicting — do not invent a mixed pair
  return {
    clientId: dbId || envId,
    clientSecret: '',
    redirectUri,
  }
}

export function startGmailAuth(workspaceId) {
  return getWorkspaceConfig(workspaceId).then((config) => {
    const { clientId, redirectUri } = getClientCredentials(config)
    if (!clientId) {
      throw new Error(
        'Gmail Client ID is required. Paste it in Integrations → Save, or set GMAIL_CLIENT_ID in api .env.',
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

    const envClientId = process.env.GMAIL_CLIENT_ID?.trim()
    if (envClientId && config.gmail?.clientId?.trim() && envClientId !== config.gmail.clientId.trim()) {
      logger.info(
        'Gmail OAuth using Client ID saved in Integrations (DB). Env GMAIL_CLIENT_ID is ignored while DB has a value.',
        { dbClient: config.gmail.clientId.trim().slice(0, 28), envClient: envClientId.slice(0, 28) },
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
  if (!clientId || !clientSecret) {
    throw new Error(
      'Gmail Client ID and Client Secret must both be saved together. Paste both from the same Google Cloud Web client → Integrations → Save Gmail now → Connect Gmail.',
    )
  }

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
        'Google rejected this Client Secret. In Google Cloud → your Web client → Client secrets → Add secret, copy the full value once, paste Client ID + Secret in Integrations, Save Gmail now, then Connect Gmail again.',
      )
    }
    if (/redirect_uri_mismatch/i.test(tokenData.error_description || tokenData.error || '')) {
      throw new Error(
        `Redirect URI mismatch. Add this exact URI on the Google client: ${redirectUri}`,
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
  // Refresh 5 minutes early so Calendar/Mail Box never hit a mid-request expiry.
  if (expires > Date.now() + 5 * 60_000 && gmail.accessToken?.trim()) {
    return config
  }

  const { clientId, clientSecret } = getClientCredentials(config)
  if (!clientId || !clientSecret) {
    throw new Error(
      'Gmail Client ID and Client Secret must both be set (same Google Cloud client). Paste both in Integrations → Save, then Connect Gmail.',
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
    const detail = tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`
    logger.warn('Gmail token refresh failed', { detail, error: tokenData.error })

    const staleSession =
      tokenData.error === 'unauthorized_client' ||
      tokenData.error === 'invalid_grant' ||
      /unauthorized/i.test(detail)

    if (
      /OAuth client was deleted/i.test(detail) ||
      tokenData.error === 'deleted_client' ||
      (/deleted/i.test(detail) && tokenData.error !== 'unauthorized_client')
    ) {
      throw new Error(
        'Google OAuth client was deleted. Create a new Web client, paste Client ID + Secret in Integrations, then Connect Gmail.',
      )
    }

    if (staleSession) {
      // Refresh token belongs to an old client — wipe it so Test/Sync stop looping this error
      try {
        await saveGmailConfig(workspaceId, {
          accessToken: '__CLEAR__',
          refreshToken: '__CLEAR__',
          tokenExpiresAt: null,
          connected: false,
        })
      } catch (clearErr) {
        logger.warn('Could not clear stale Gmail tokens', { message: clearErr.message })
      }
      throw new Error(
        'Gmail needs a fresh Connect (old login was for a different Google client). Open Integrations → Connect Gmail and accept permissions.',
      )
    }

    if (tokenData.error === 'invalid_client') {
      throw new Error(
        'Google rejected this Client Secret. Paste Client ID + Secret from the same Web client → Save Gmail now → Connect Gmail.',
      )
    }

    throw new Error(
      `Gmail token refresh failed (${detail}). Try Connect Gmail again in Integrations.`,
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
  if (/invalid_grant|session expired or revoked/i.test(msg)) {
    return 'Google Calendar auth expired. Reconnect Gmail in Integrations and accept Calendar access.'
  }
  if (/insufficient|ACCESS_TOKEN_SCOPE|permission/i.test(msg)) {
    return 'Gmail is connected but missing Calendar permission. Reconnect Gmail and accept Calendar access.'
  }
  if (
    /invalid authentication credentials|401|Login Required|UNAUTHENTICATED/i.test(msg)
  ) {
    return 'Google Calendar request failed. Open Integrations → Test Gmail, then Sync again. If it still fails, Reconnect Gmail.'
  }
  return msg
}
