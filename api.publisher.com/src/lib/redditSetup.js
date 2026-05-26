function redditCredentials(config = {}) {
  const reddit = config.reddit || {}
  return {
    clientId: process.env.REDDIT_CLIENT_ID?.trim() || reddit.clientId?.trim() || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET?.trim() || reddit.clientSecret?.trim() || '',
    refreshToken: process.env.REDDIT_REFRESH_TOKEN?.trim() || reddit.refreshToken?.trim() || '',
    subreddit: process.env.REDDIT_SUBREDDIT?.trim() || reddit.subreddit?.trim() || '',
    userAgent:
      process.env.REDDIT_USER_AGENT?.trim() || reddit.userAgent?.trim() || 'PulsePublisher/1.0',
  }
}

export function getRedditEnvSetup(config = {}) {
  const { clientId, clientSecret, refreshToken, subreddit, userAgent } = redditCredentials(config)
  return {
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret),
    refreshTokenConfigured: Boolean(refreshToken),
    subredditConfigured: Boolean(subreddit),
    userAgent,
    envKeys: [
      'REDDIT_CLIENT_ID',
      'REDDIT_CLIENT_SECRET',
      'REDDIT_REFRESH_TOKEN',
      'REDDIT_SUBREDDIT',
      'REDDIT_USER_AGENT',
    ],
  }
}
