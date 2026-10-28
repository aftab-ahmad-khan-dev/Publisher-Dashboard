/** Map API config (secrets stripped) into form state */
export function configFromServer(server) {
  if (!server) return null
  return {
    meta: {
      appId: server.meta?.appId || '',
      appSecret: '',
      pageToken: '',
      connected: server.meta?.connected,
      hasAppSecret: server.meta?.hasAppSecret,
      hasPageToken: server.meta?.hasPageToken,
    },
    linkedin: {
      clientId: server.linkedin?.clientId || '',
      clientSecret: '',
      orgUrn: server.linkedin?.orgUrn || '',
      accessToken: '',
      connected: server.linkedin?.connected,
      publishReady: server.linkedin?.publishReady,
      hasClientSecret: server.linkedin?.hasClientSecret,
      hasAccessToken: server.linkedin?.hasAccessToken,
      tokenExpiresAt: server.linkedin?.tokenExpiresAt || null,
    },
    reddit: {
      clientId: server.reddit?.clientId || '',
      clientSecret: '',
      refreshToken: '',
      subreddit: server.reddit?.subreddit || '',
      userAgent: server.reddit?.userAgent || 'PulsePublisher/1.0',
      connected: server.reddit?.connected,
      publishReady: server.reddit?.publishReady,
      hasClientSecret: server.reddit?.hasClientSecret,
      hasRefreshToken: server.reddit?.hasRefreshToken,
    },
    quora: {
      profileUrl: server.quora?.profileUrl || '',
      defaultTopic: server.quora?.defaultTopic || '',
      connected: server.quora?.connected,
    },
    pinterest: {
      accessToken: '',
      boardId: server.pinterest?.boardId || '',
      connected: server.pinterest?.connected,
      publishReady: server.pinterest?.publishReady,
      hasAccessToken: server.pinterest?.hasAccessToken,
    },
    threads: {
      accessToken: '',
      userId: server.threads?.userId || '',
      connected: server.threads?.connected,
      publishReady: server.threads?.publishReady,
      hasAccessToken: server.threads?.hasAccessToken,
    },
    gmail: {
      clientId: server.gmail?.clientId || '',
      clientSecret: '',
      fromEmail: server.gmail?.fromEmail || '',
      connected: server.gmail?.connected,
      sendReady: server.gmail?.sendReady,
      hasClientSecret: server.gmail?.hasClientSecret,
      hasRefreshToken: server.gmail?.hasRefreshToken,
      tokenExpiresAt: server.gmail?.tokenExpiresAt || null,
      smtpConfigured: Boolean(server.gmail?.smtpConfigured),
      transport: server.gmail?.transport || null,
    },
    webhookUrl: server.webhookUrl || '',
    notificationsEnabled: server.notificationsEnabled ?? true,
    defaults: {
      scheduleTime: server.defaults?.scheduleTime || '12:00',
    },
  }
}

export function defaultsPayloadForSave(defaults) {
  return {
    scheduleTime: defaults?.scheduleTime?.trim() || '12:00',
  }
}

export function gmailPayloadForSave(gmail) {
  const out = {
    clientId: gmail.clientId?.trim(),
    fromEmail: gmail.fromEmail?.trim(),
  }
  if (gmail.clientSecret?.trim()) out.clientSecret = gmail.clientSecret.trim()
  return out
}

export function linkedinPayloadForSave(linkedin) {
  const out = {
    clientId: linkedin.clientId?.trim(),
    orgUrn: linkedin.orgUrn?.trim(),
  }
  if (linkedin.clientSecret?.trim()) out.clientSecret = linkedin.clientSecret.trim()
  if (linkedin.accessToken?.trim()) out.accessToken = linkedin.accessToken.trim()
  return out
}

export function metaPayloadForSave(meta) {
  const out = { appId: meta.appId?.trim() || '' }
  if (meta.appSecret?.trim()) out.appSecret = meta.appSecret.trim()
  if (meta.pageToken?.trim()) out.pageToken = meta.pageToken.trim()
  return out
}

export function redditPayloadForSave(reddit) {
  const out = {
    clientId: reddit.clientId?.trim(),
    subreddit: reddit.subreddit?.trim(),
    userAgent: reddit.userAgent?.trim() || 'PulsePublisher/1.0',
  }
  if (reddit.clientSecret?.trim()) out.clientSecret = reddit.clientSecret.trim()
  if (reddit.refreshToken?.trim()) out.refreshToken = reddit.refreshToken.trim()
  return out
}

export function quoraPayloadForSave(quora) {
  return {
    profileUrl: quora.profileUrl?.trim(),
    defaultTopic: quora.defaultTopic?.trim(),
  }
}

export function pinterestPayloadForSave(pinterest) {
  const out = { boardId: pinterest.boardId?.trim() || '' }
  if (pinterest.accessToken?.trim()) out.accessToken = pinterest.accessToken.trim()
  return out
}

export function threadsPayloadForSave(threads) {
  const out = { userId: threads.userId?.trim() || '' }
  if (threads.accessToken?.trim()) out.accessToken = threads.accessToken.trim()
  return out
}

const API_CONFIG_KEY = 'pulse_api_config'

/** Full config previously saved in localStorage (may include secrets). */
export function readLocalStoredConfig() {
  try {
    const raw = localStorage.getItem(API_CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    localStorage.removeItem(API_CONFIG_KEY)
  }
  return null
}

export function needsMetaMigration(serverConfig, localConfig) {
  if (!localConfig?.meta) return false
  const localHasSecrets =
    Boolean(localConfig.meta.appSecret?.trim()) ||
    Boolean(localConfig.meta.pageToken?.trim())
  if (!localHasSecrets) return false

  const serverHasSecrets =
    serverConfig?.meta?.hasAppSecret || serverConfig?.meta?.hasPageToken
  if (!serverHasSecrets) return true

  // Server has secrets in DB but lost app id — restore from local
  if (!serverConfig?.meta?.appId?.trim() && localConfig.meta.appId?.trim()) return true

  return false
}

export function needsLinkedInMigration(serverConfig, localConfig) {
  if (!localConfig?.linkedin) return false
  const serverHasSecrets =
    serverConfig?.linkedin?.hasClientSecret || serverConfig?.linkedin?.hasAccessToken
  const localHasSecrets =
    Boolean(localConfig.linkedin.clientSecret?.trim()) ||
    Boolean(localConfig.linkedin.accessToken?.trim())
  return !serverHasSecrets && localHasSecrets
}

export function metaMigrationPayload(serverConfig, localConfig) {
  return {
    appId: localConfig.meta.appId?.trim() || serverConfig?.meta?.appId || '',
    appSecret: localConfig.meta.appSecret?.trim() || '',
    pageToken: localConfig.meta.pageToken?.trim() || '',
  }
}

export function linkedInMigrationPayload(serverConfig, localConfig) {
  return {
    clientId: localConfig.linkedin.clientId?.trim() || serverConfig?.linkedin?.clientId || '',
    clientSecret: localConfig.linkedin.clientSecret?.trim() || '',
    orgUrn: localConfig.linkedin.orgUrn?.trim() || serverConfig?.linkedin?.orgUrn || '',
    accessToken: localConfig.linkedin.accessToken?.trim() || '',
  }
}
