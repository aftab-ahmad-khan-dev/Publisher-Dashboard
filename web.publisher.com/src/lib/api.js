import {
  isMetaConfigured,
  isLinkedInConfigured,
  isLinkedInPublishReady,
  isRedditConfigured,
  isQuoraConfigured,
} from './connections'

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || ''

/** True when publish/schedule calls a backend at VITE_API_BASE_URL instead of simulating. */
export function isLivePublishing() {
  return Boolean(API_BASE)
}

export async function testMetaConnection(meta) {
  if (!isMetaConfigured(meta)) {
    return { ok: false, error: 'App ID, App Secret, and Page Access Token are required.' }
  }
  if (isLivePublishing()) {
    return postBackend('/connections/meta/test', { meta })
  }
  await delay(800)
  return {
    ok: true,
    simulated: true,
    message: 'Credentials look complete (demo — no request was sent to Meta).',
  }
}

export async function testRedditConnection(reddit) {
  if (!isRedditConfigured(reddit)) {
    return {
      ok: false,
      error: 'Client ID, Client Secret, Refresh Token, and Subreddit are required.',
    }
  }
  if (isLivePublishing()) {
    return postBackend('/connections/reddit/test', { reddit })
  }
  await delay(800)
  return {
    ok: true,
    simulated: true,
    message: 'Reddit credentials look complete (demo — no request sent).',
  }
}

export async function testGmailConnection(gmail) {
  if (!gmail?.clientId?.trim()) {
    return { ok: false, error: 'Gmail Client ID and Client Secret are required. Connect via OAuth.' }
  }
  if (!gmail?.hasRefreshToken && !gmail?.sendReady) {
    return { ok: false, error: 'Connect Gmail with OAuth before testing.' }
  }
  if (isLivePublishing()) {
    return postBackend('/connections/gmail/test', { gmail })
  }
  await delay(600)
  return { ok: true, simulated: true, message: 'Gmail looks configured (demo).' }
}

export async function testQuoraConnection(quora) {
  if (!isQuoraConfigured(quora)) {
    return { ok: false, error: 'Quora profile URL is required.' }
  }
  if (isLivePublishing()) {
    return postBackend('/connections/quora/test', { quora })
  }
  await delay(600)
  return {
    ok: true,
    simulated: true,
    message: 'Quora profile saved for guided posting (no public write API).',
  }
}

export async function testLinkedInConnection(linkedin) {
  if (!isLinkedInConfigured(linkedin)) {
    return { ok: false, error: 'Client ID, Client Secret, and Organization URN are required.' }
  }
  if (isLivePublishing()) {
    return postBackend('/connections/linkedin/test', { linkedin })
  }
  await delay(800)
  return {
    ok: true,
    simulated: true,
    message: 'Credentials look complete (demo — no request was sent to LinkedIn).',
  }
}

export async function publishToPlatforms(postState, apiConfig) {
  const enabled = Object.entries(postState.platforms)
    .filter(([, on]) => on)
    .map(([p]) => p)

  const needsMeta = enabled.some((p) => p === 'instagram' || p === 'facebook')
  const needsLinkedIn = enabled.includes('linkedin')
  const needsReddit = enabled.includes('reddit')
  const needsQuora = enabled.includes('quora')

  if (needsMeta && !isMetaConfigured(apiConfig.meta)) {
    return { ok: false, error: 'Configure Meta Suite in API Config before publishing to Instagram or Facebook.' }
  }
  if (needsLinkedIn && !isLinkedInPublishReady(apiConfig.linkedin)) {
    const error = isLinkedInConfigured(apiConfig.linkedin)
      ? 'LinkedIn credentials are saved. Open API Config and click “Connect with LinkedIn” to authorize publishing.'
      : 'Configure LinkedIn in API Config before publishing to LinkedIn.'
    return { ok: false, error }
  }
  if (needsReddit && !isRedditConfigured(apiConfig.reddit)) {
    return { ok: false, error: 'Configure Reddit in API Config before publishing to Reddit.' }
  }
  if (needsQuora && !isQuoraConfigured(apiConfig.quora)) {
    return { ok: false, error: 'Add your Quora profile URL in API Config.' }
  }

  if (isLivePublishing()) {
    return postBackend('/publish', { postState, enabled, apiConfig })
  }

  await delay(1200)
  return { ok: true, simulated: true, platforms: enabled }
}

export async function scheduleToPlatforms(postState, apiConfig) {
  const enabled = Object.entries(postState.platforms)
    .filter(([, on]) => on)
    .map(([p]) => p)

  if (enabled.length === 0) {
    return { ok: false, error: 'Enable at least one platform to schedule.' }
  }

  if (isLivePublishing()) {
    return postBackend('/schedule', {
      postState,
      scheduledAt: postState.scheduledAt,
      enabled,
      apiConfig,
      timezone: postState.timezone,
    })
  }

  await delay(600)
  return { ok: true, simulated: true, platforms: enabled }
}

async function postBackend(path, body) {
  const { apiFetch } = await import('./backendApi.js')
  try {
    const data = await apiFetch(path, { method: 'POST', body })
    return { ok: true, ...data }
  } catch (err) {
    return { ok: false, error: err.message || 'Could not reach publish API' }
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
