import crypto from 'crypto'
import { getWorkspaceConfig, saveGmailTokens } from './configStore.js'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

const pendingStates = new Map()

function getClientCredentials(config) {
  return {
    clientId: config.gmail?.clientId?.trim() || process.env.GMAIL_CLIENT_ID?.trim(),
    clientSecret:
      config.gmail?.clientSecret?.trim() || process.env.GMAIL_CLIENT_SECRET?.trim(),
    redirectUri:
      process.env.GMAIL_REDIRECT_URI?.trim() ||
      'http://localhost:3001/api/auth/gmail/callback',
  }
}

export function startGmailAuth(workspaceId) {
  return getWorkspaceConfig(workspaceId).then((config) => {
    const { clientId, redirectUri } = getClientCredentials(config)
    if (!clientId) {
      throw new Error('Gmail Client ID is required. Save it in API Config first.')
    }

    const state = crypto.randomBytes(16).toString('hex')
    pendingStates.set(state, { workspaceId, at: Date.now() })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  })
}

export async function handleGmailCallback(code, state) {
  const pending = pendingStates.get(state)
  pendingStates.delete(state)
  if (!pending) throw new Error('Invalid or expired OAuth state')
  if (Date.now() - pending.at > 10 * 60 * 1000) {
    throw new Error('OAuth session expired. Try again.')
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
  if (!clientId || !clientSecret) return config

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
  if (!tokenRes.ok) return config

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
  if (!token) throw new Error('Gmail is not connected. Connect Gmail in API Config.')
  return { accessToken: token, fromEmail: config.gmail?.fromEmail || '' }
}
