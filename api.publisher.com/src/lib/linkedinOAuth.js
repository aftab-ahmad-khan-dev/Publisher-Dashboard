import crypto from 'crypto'
import {
  getWorkspaceConfig,
  saveLinkedInConfig,
  saveLinkedInTokens,
} from './configStore.js'
import { apiPublicBase } from './publicUrl.js'

// Profile posting only needs these; they map to the "Sign In with OpenID Connect"
// + "Share on LinkedIn" products every app can get. openid+profile are required to
// resolve the member URN via /v2/userinfo.
const BASE_SCOPES = ['openid', 'profile', 'w_member_social']
// Org scopes require the "Community Management API" product. Requesting them when the
// app isn't approved makes LinkedIn reject the WHOLE authorization (unauthorized_scope_error),
// so only add them when org posting is actually configured.
const ORG_SCOPES = ['w_organization_social', 'r_organization_social']

function resolveScopes(config) {
  const orgUrn = config.linkedin?.orgUrn?.trim() || ''
  const hasRealOrg =
    /^urn:li:organization:\d+$/i.test(orgUrn) && !/^urn:li:organization:12345$/i.test(orgUrn)
  const wantsOrg =
    hasRealOrg || /^(1|true|yes)$/i.test(process.env.LINKEDIN_ENABLE_ORG_SCOPES?.trim() || '')
  return wantsOrg ? [...BASE_SCOPES, ...ORG_SCOPES] : BASE_SCOPES
}

const pendingStates = new Map()

export function linkedInOAuthEnabled() {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID?.trim() || process.env.VITE_LINKEDIN_CLIENT_ID,
  )
}

function getClientCredentials(config) {
  return {
    clientId: config.linkedin.clientId?.trim() || process.env.LINKEDIN_CLIENT_ID?.trim(),
    clientSecret:
      config.linkedin.clientSecret?.trim() || process.env.LINKEDIN_CLIENT_SECRET?.trim(),
    redirectUri:
      (apiPublicBase() && `${apiPublicBase()}/api/auth/linkedin/callback`) ||
      process.env.LINKEDIN_REDIRECT_URI?.trim() ||
      'http://localhost:3001/api/auth/linkedin/callback',
  }
}

export function startLinkedInAuth(workspaceId) {
  return getWorkspaceConfig(workspaceId).then((config) => {
    const { clientId, redirectUri } = getClientCredentials(config)
    if (!clientId) {
      throw new Error('LinkedIn Client ID is required. Save it in API Config first.')
    }

    const state = crypto.randomBytes(16).toString('hex')
    pendingStates.set(state, { workspaceId, at: Date.now() })

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: resolveScopes(config).join(' '),
    })

    return `https://www.linkedin.com/oauth/v2/authorization?${params}`
  })
}

export async function handleLinkedInCallback(code, state) {
  const pending = pendingStates.get(state)
  pendingStates.delete(state)
  if (!pending) throw new Error('Invalid or expired OAuth state')

  if (Date.now() - pending.at > 10 * 60 * 1000) {
    throw new Error('OAuth session expired. Try again.')
  }

  const config = await getWorkspaceConfig(pending.workspaceId)
  const { clientId, clientSecret, redirectUri } = getClientCredentials(config)

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed')
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null

  let orgUrn = config.linkedin.orgUrn

  if (!orgUrn?.trim()) {
    orgUrn = await fetchOrganizationUrn(tokenData.access_token)
  }

  await saveLinkedInTokens(pending.workspaceId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || config.linkedin.refreshToken,
    tokenExpiresAt: expiresAt,
    orgUrn: orgUrn || config.linkedin.orgUrn,
    clientId,
    clientSecret,
  })

  return { workspaceId: pending.workspaceId, orgUrn }
}

async function fetchOrganizationUrn(accessToken) {
  try {
    const res = await fetch(
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName),organization))',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    )
    const data = await res.json().catch(() => ({}))
    const org = data?.elements?.[0]?.organization
    if (org) {
      return typeof org === 'string' ? org : `urn:li:organization:${org}`
    }
  } catch {
    /* fallback */
  }
  return ''
}

export async function refreshLinkedInTokenIfNeeded(workspaceId) {
  const config = await getWorkspaceConfig(workspaceId)
  const { refreshToken, tokenExpiresAt, accessToken } = config.linkedin
  if (!refreshToken?.trim()) return config

  const expires = tokenExpiresAt ? new Date(tokenExpiresAt) : null
  if (expires && expires.getTime() > Date.now() + 60_000) return config

  const { clientId, clientSecret } = getClientCredentials(config)
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return config

  await saveLinkedInTokens(workspaceId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  })

  return getWorkspaceConfig(workspaceId)
}
