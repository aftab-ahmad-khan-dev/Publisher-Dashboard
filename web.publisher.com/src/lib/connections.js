export function isMetaConfigured(meta) {
  const hasSecrets = meta?.hasAppSecret && meta?.hasPageToken;
  const filled =
    Boolean(meta?.appId?.trim()) &&
    Boolean(meta?.appSecret?.trim()) &&
    Boolean(meta?.pageToken?.trim());
  return filled || (Boolean(meta?.appId?.trim()) && hasSecrets);
}

/** App credentials saved. Org URN is optional (profile posts use w_member_social). */
export function isLinkedInConfigured(linkedin) {
  const hasClientId = Boolean(linkedin?.clientId?.trim());
  const hasSecret =
    Boolean(linkedin?.clientSecret?.trim()) || Boolean(linkedin?.hasClientSecret);
  return hasClientId && hasSecret;
}

export function isLinkedInPublishReady(linkedin) {
  return (
    isLinkedInConfigured(linkedin) &&
    (linkedin?.publishReady || linkedin?.hasAccessToken)
  );
}

export function isRedditConfigured(reddit) {
  const hasSecrets = reddit?.hasClientSecret && reddit?.hasRefreshToken;
  const filled =
    Boolean(reddit?.clientId?.trim()) &&
    Boolean(reddit?.clientSecret?.trim()) &&
    Boolean(reddit?.refreshToken?.trim()) &&
    Boolean(reddit?.subreddit?.trim());
  return (
    Boolean(reddit?.publishReady || reddit?.connected) ||
    filled ||
    (Boolean(reddit?.clientId?.trim()) &&
      Boolean(reddit?.subreddit?.trim()) &&
      hasSecrets)
  );
}

export function isRedditPublishReady(reddit) {
  return (
    isRedditConfigured(reddit) &&
    Boolean(
      reddit?.hasClientSecret &&
      reddit?.hasRefreshToken &&
      reddit?.subreddit?.trim(),
    )
  );
}

export function isQuoraConfigured(quora) {
  return Boolean(quora?.profileUrl?.trim());
}

export function isGmailConfigured(gmail) {
  const hasSecrets = gmail?.hasClientSecret && gmail?.hasRefreshToken;
  return Boolean(
    gmail?.sendReady ||
    gmail?.connected ||
    gmail?.hasRefreshToken ||
    (Boolean(gmail?.clientId?.trim()) && hasSecrets),
  );
}

export function isGmailSendReady(gmail) {
  return (
    isGmailConfigured(gmail) && Boolean(gmail?.hasRefreshToken || gmail?.sendReady)
  );
}

export function getConnectionSummary(apiConfig) {
  const metaReady = isMetaConfigured(apiConfig?.meta);
  const linkedInReady = isLinkedInConfigured(apiConfig?.linkedin);
  const linkedInPublish = isLinkedInPublishReady(apiConfig?.linkedin);
  const redditReady = isRedditConfigured(apiConfig?.reddit);
  const quoraReady = isQuoraConfigured(apiConfig?.quora);
  const gmailReady = isGmailConfigured(apiConfig?.gmail);
  const connectedCount = [
    metaReady,
    linkedInReady,
    redditReady,
    quoraReady,
    gmailReady,
  ].filter(Boolean).length;

  return {
    metaReady,
    linkedInReady,
    linkedInPublish,
    redditReady,
    quoraReady,
    gmailReady,
    connectedCount,
    anyConnected: connectedCount > 0,
    allConnected: metaReady && linkedInPublish,
  };
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
    reddit: {
      ...config.reddit,
      connected: isRedditConfigured(config.reddit),
      publishReady: isRedditPublishReady(config.reddit),
    },
    quora: {
      ...config.quora,
      connected: isQuoraConfigured(config.quora),
    },
    gmail: {
      ...config.gmail,
      connected: isGmailConfigured(config.gmail),
      sendReady: isGmailSendReady(config.gmail),
    },
  };
}
