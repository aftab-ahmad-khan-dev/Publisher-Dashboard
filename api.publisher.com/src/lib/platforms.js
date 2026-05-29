import { buildTextForPlatform } from './contentPolicy.js'
import { sanitizePublishedText } from './contentSanitize.js'

export function isMetaConfigured(meta) {
  return Boolean(meta?.appId?.trim() && meta?.appSecret?.trim() && meta?.pageToken?.trim())
}

/** App credentials saved. Org URN is optional (profile posts use w_member_social). */
export function isLinkedInConfigured(linkedin) {
  const hasClientId = Boolean(linkedin?.clientId?.trim())
  const hasSecret =
    Boolean(linkedin?.clientSecret?.trim()) || Boolean(linkedin?.hasClientSecret)
  return hasClientId && hasSecret
}

export function canPublishLinkedIn(linkedin) {
  return isLinkedInConfigured(linkedin) && Boolean(linkedin?.accessToken?.trim())
}

export { isRedditConfigured } from './publishers/reddit.js'
export { isQuoraConfigured } from './publishers/quora.js'
export { isPinterestConfigured } from './publishers/pinterest.js'
export { isThreadsConfigured } from './publishers/threads.js'

export function isGmailConfigured(gmail) {
  return Boolean(
    gmail?.clientId?.trim() &&
      gmail?.clientSecret?.trim() &&
      (gmail?.refreshToken?.trim() || gmail?.accessToken?.trim()),
  )
}

export function canSendGmail(gmail) {
  return isGmailConfigured(gmail) || Boolean(gmail?.refreshToken?.trim())
}

export function buildPostText(postState, platform) {
  if (platform) return sanitizePublishedText(buildTextForPlatform(postState, platform))
  const body = sanitizePublishedText(postState?.body?.trim() || '')
  const tags = (postState?.hashtags || [])
    .filter((h) => h.tag)
    .map((h) => sanitizePublishedText(h.tag.startsWith('#') ? h.tag : `#${h.tag}`))
  const tagLine = tags.length ? `\n\n${tags.join(' ')}` : ''
  return sanitizePublishedText(`${body}${tagLine}`.trim())
}

export function platformsFromState(postState) {
  if (!postState?.platforms) return []
  return Object.entries(postState.platforms)
    .filter(([, on]) => on)
    .map(([p]) => p)
}
