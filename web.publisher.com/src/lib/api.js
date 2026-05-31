import {
  isMetaConfigured,
  isLinkedInConfigured,
  isLinkedInPublishReady,
  isRedditConfigured,
  isQuoraConfigured,
  isPinterestConfigured,
  isThreadsConfigured,
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
  const hasId = Boolean(reddit?.clientId?.trim())
  const hasStored =
    reddit?.hasClientSecret && reddit?.hasRefreshToken && Boolean(reddit?.subreddit?.trim())
  if (!hasId && !hasStored) {
    return {
      ok: false,
      error:
        'Client ID, Client Secret, Refresh Token, and Subreddit are required (or set REDDIT_* in api .env).',
    }
  }
  if (!isRedditConfigured(reddit) && !hasStored) {
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
  const hasId = Boolean(gmail?.clientId?.trim())
  const hasStored = gmail?.hasClientSecret
  if (!hasId && !hasStored) {
    return {
      ok: false,
      error:
        'Gmail Client ID and Client Secret are required (or set GMAIL_* in api .env), then Connect.',
    }
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

export async function testPinterestConnection(pinterest) {
  const hasToken = Boolean(pinterest?.accessToken?.trim()) || pinterest?.hasAccessToken
  if (!hasToken) {
    return { ok: false, error: 'Pinterest access token is required (and a Board ID to publish).' }
  }
  if (isLivePublishing()) {
    return postBackend('/connections/pinterest/test', { pinterest })
  }
  await delay(700)
  return { ok: true, simulated: true, message: 'Pinterest looks configured (demo — no request sent).' }
}

export async function testThreadsConnection(threads) {
  const hasToken = Boolean(threads?.accessToken?.trim()) || threads?.hasAccessToken
  if (!hasToken) {
    return { ok: false, error: 'Threads access token is required (and your Threads user ID to publish).' }
  }
  if (isLivePublishing()) {
    return postBackend('/connections/threads/test', { threads })
  }
  await delay(700)
  return { ok: true, simulated: true, message: 'Threads looks configured (demo — no request sent).' }
}

export async function testLinkedInConnection(linkedin) {
  if (!isLinkedInConfigured(linkedin)) {
    return { ok: false, error: 'Client ID and Client Secret are required (Org URN is optional for profile posts).' }
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
  const needsPinterest = enabled.includes('pinterest')
  const needsThreads = enabled.includes('threads')

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
  if (needsPinterest && !isPinterestConfigured(apiConfig.pinterest)) {
    return { ok: false, error: 'Add a Pinterest access token and Board ID in API Config before publishing.' }
  }
  if (needsThreads && !isThreadsConfigured(apiConfig.threads)) {
    return { ok: false, error: 'Add a Threads access token and user ID in API Config before publishing.' }
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
    const { datetimeLocalToISO } = await import('./scheduleUtils.js')
    return postBackend('/schedule', {
      postState,
      // Send a real UTC instant, not the naive "...T12:00" wall-clock string —
      // otherwise the backend parses it as UTC and the time shifts by the TZ offset.
      scheduledAt: datetimeLocalToISO(postState.scheduledAt),
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
