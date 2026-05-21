export function isMetaConfigured(meta) {
  const hasSecrets = meta?.hasAppSecret && meta?.hasPageToken
  const filled =
    Boolean(meta?.appId?.trim()) &&
    Boolean(meta?.appSecret?.trim()) &&
    Boolean(meta?.pageToken?.trim())
  return filled || (Boolean(meta?.appId?.trim()) && hasSecrets)
}

export function isLinkedInConfigured(linkedin) {
  const hasSecrets = linkedin?.hasClientSecret
  const filled =
    Boolean(linkedin?.clientId?.trim()) &&
    Boolean(linkedin?.clientSecret?.trim()) &&
    Boolean(linkedin?.orgUrn?.trim())
  return (
    filled ||
    (Boolean(linkedin?.clientId?.trim()) && Boolean(linkedin?.orgUrn?.trim()) && hasSecrets)
  )
}

export function isLinkedInPublishReady(linkedin) {
  return isLinkedInConfigured(linkedin) && (linkedin?.publishReady || linkedin?.hasAccessToken)
}

export function getConnectionSummary(apiConfig) {
  const metaReady = isMetaConfigured(apiConfig?.meta)
  const linkedInReady = isLinkedInConfigured(apiConfig?.linkedin)
  const linkedInPublish = isLinkedInPublishReady(apiConfig?.linkedin)
  const connectedCount = [metaReady, linkedInReady].filter(Boolean).length

  return {
    metaReady,
    linkedInReady,
    linkedInPublish,
    connectedCount,
    anyConnected: connectedCount > 0,
    allConnected: metaReady && linkedInPublish,
  }
}

export function withDerivedConnectionFlags(config) {
  return {
    ...config,
    meta: {
      ...config.meta,
      connected: isMetaConfigured(config.meta),
    },
    linkedin: {
      ...config.linkedin,
      connected: isLinkedInConfigured(config.linkedin),
      publishReady: isLinkedInPublishReady(config.linkedin),
    },
  }
}
