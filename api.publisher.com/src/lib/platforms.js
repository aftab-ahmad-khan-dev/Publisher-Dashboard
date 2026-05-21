export function isMetaConfigured(meta) {
  return Boolean(meta?.appId?.trim() && meta?.appSecret?.trim() && meta?.pageToken?.trim())
}

export function isLinkedInConfigured(linkedin) {
  return Boolean(
    linkedin?.clientId?.trim() &&
      linkedin?.clientSecret?.trim() &&
      linkedin?.orgUrn?.trim(),
  )
}

export function canPublishLinkedIn(linkedin) {
  return isLinkedInConfigured(linkedin) && Boolean(linkedin?.accessToken?.trim())
}

export function buildPostText(postState) {
  const body = postState?.body?.trim() || ''
  const tags = (postState?.hashtags || [])
    .filter((h) => h.tag)
    .map((h) => (h.tag.startsWith('#') ? h.tag : `#${h.tag}`))
  const tagLine = tags.length ? `\n\n${tags.join(' ')}` : ''
  return `${body}${tagLine}`.trim()
}

export function platformsFromState(postState) {
  if (!postState?.platforms) return []
  return Object.entries(postState.platforms)
    .filter(([, on]) => on)
    .map(([p]) => p)
}
