const PLACEHOLDER_RE =
  /^(your_client_id|your_client_secret|your_refresh_token|your_subreddit|your_user_agent)$/i

export function isRedditPlaceholder(value) {
  const v = value?.trim()
  if (!v) return true
  if (PLACEHOLDER_RE.test(v)) return true
  if (/^your_/i.test(v)) return true
  if (/YOUR_REDDIT_USERNAME/i.test(v)) return true
  return false
}

/** Env wins over DB; placeholder strings are ignored (same idea as Gmail .env). */
export function resolveRedditCredentials(config = {}) {
  const reddit = config.reddit || {}
  const fromEnv = {
    clientId: process.env.REDDIT_CLIENT_ID?.trim() || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET?.trim() || '',
    refreshToken: process.env.REDDIT_REFRESH_TOKEN?.trim() || '',
    subreddit: process.env.REDDIT_SUBREDDIT?.trim() || '',
    userAgent: process.env.REDDIT_USER_AGENT?.trim() || '',
  }
  const fromDb = {
    clientId: reddit.clientId?.trim() || '',
    clientSecret: reddit.clientSecret?.trim() || '',
    refreshToken: reddit.refreshToken?.trim() || '',
    subreddit: reddit.subreddit?.trim() || '',
    userAgent: reddit.userAgent?.trim() || '',
  }
  const pick = (envVal, dbVal) => {
    if (!isRedditPlaceholder(envVal)) return envVal
    if (!isRedditPlaceholder(dbVal)) return dbVal
    return ''
  }
  return {
    clientId: pick(fromEnv.clientId, fromDb.clientId),
    clientSecret: pick(fromEnv.clientSecret, fromDb.clientSecret),
    refreshToken: pick(fromEnv.refreshToken, fromDb.refreshToken),
    subreddit: pick(fromEnv.subreddit, fromDb.subreddit),
    userAgent: pick(fromEnv.userAgent, fromDb.userAgent) || 'PulsePublisher/1.0',
  }
}

export function getRedditEnvSetup(config = {}) {
  const creds = resolveRedditCredentials(config)
  const publicBase = process.env.API_PUBLIC_URL?.trim()?.replace(/\/$/, '')
  const redirectUri =
    (publicBase && `${publicBase}/api/auth/reddit/callback`) ||
    process.env.REDDIT_REDIRECT_URI?.trim()?.replace(/\/$/, '') ||
    'http://127.0.0.1:3001/api/auth/reddit/callback'

  return {
    clientId: creds.clientId,
    clientIdConfigured: Boolean(creds.clientId),
    clientSecretConfigured: Boolean(creds.clientSecret),
    refreshTokenConfigured: Boolean(creds.refreshToken),
    subredditConfigured: Boolean(creds.subreddit),
    userAgent: creds.userAgent,
    redirectUri,
    redirectUrisToRegister: [
      redirectUri,
      'http://localhost:3001/api/auth/reddit/callback',
      'http://127.0.0.1:3001/api/auth/reddit/callback',
      'http://localhost:8080',
    ].filter((u, i, a) => u && a.indexOf(u) === i),
    envKeys: [
      'REDDIT_CLIENT_ID',
      'REDDIT_CLIENT_SECRET',
      'REDDIT_REFRESH_TOKEN',
      'REDDIT_SUBREDDIT',
      'REDDIT_USER_AGENT',
      'REDDIT_REDIRECT_URI',
    ],
    appsUrl: 'https://www.reddit.com/prefs/apps',
  }
}
