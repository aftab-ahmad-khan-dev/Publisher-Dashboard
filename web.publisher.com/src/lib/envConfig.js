/** Vite env defaults — merged into API config when fields are empty in localStorage */

export function getEnvApiDefaults() {
  return {
    meta: {
      appId: import.meta.env.VITE_META_APP_ID?.trim() || '',
      appSecret: import.meta.env.VITE_META_APP_SECRET?.trim() || '',
      pageToken: import.meta.env.VITE_META_PAGE_TOKEN?.trim() || '',
    },
    linkedin: {
      clientId: import.meta.env.VITE_LINKEDIN_CLIENT_ID?.trim() || '',
      clientSecret: import.meta.env.VITE_LINKEDIN_CLIENT_SECRET?.trim() || '',
      orgUrn: import.meta.env.VITE_LINKEDIN_ORG_URN?.trim() || '',
      accessToken: import.meta.env.VITE_LINKEDIN_ACCESS_TOKEN?.trim() || '',
    },
    gmail: {
      clientId: import.meta.env.VITE_GMAIL_CLIENT_ID?.trim() || '',
      clientSecret: import.meta.env.VITE_GMAIL_CLIENT_SECRET?.trim() || '',
    },
    webhookUrl: import.meta.env.VITE_WEBHOOK_URL?.trim() || '',
  }
}

export function mergeApiConfigWithEnv(base, stored = {}) {
  const env = getEnvApiDefaults()
  return {
    ...base,
    ...stored,
    meta: {
      ...base.meta,
      ...env.meta,
      ...stored.meta,
      appId: stored.meta?.appId || env.meta.appId || base.meta.appId,
      appSecret: stored.meta?.appSecret || env.meta.appSecret || base.meta.appSecret,
      pageToken: stored.meta?.pageToken || env.meta.pageToken || base.meta.pageToken,
    },
    linkedin: {
      ...base.linkedin,
      ...env.linkedin,
      ...stored.linkedin,
      clientId: stored.linkedin?.clientId || env.linkedin.clientId || base.linkedin.clientId,
      clientSecret:
        stored.linkedin?.clientSecret || env.linkedin.clientSecret || base.linkedin.clientSecret,
      orgUrn: stored.linkedin?.orgUrn || env.linkedin.orgUrn || base.linkedin.orgUrn,
      accessToken:
        stored.linkedin?.accessToken || env.linkedin.accessToken || base.linkedin.accessToken,
    },
    gmail: {
      ...base.gmail,
      ...env.gmail,
      ...stored.gmail,
      clientId: stored.gmail?.clientId || env.gmail.clientId || base.gmail?.clientId || '',
      clientSecret:
        stored.gmail?.clientSecret || env.gmail.clientSecret || base.gmail?.clientSecret || '',
      fromEmail: stored.gmail?.fromEmail || base.gmail?.fromEmail || '',
    },
    webhookUrl: stored.webhookUrl || env.webhookUrl || base.webhookUrl,
    notificationsEnabled:
      stored.notificationsEnabled ?? base.notificationsEnabled,
  }
}
