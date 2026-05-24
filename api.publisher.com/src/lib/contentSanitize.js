/** Em/en dashes are not allowed in outbound email or social post copy */

const DASH_CHARS = /[\u2013\u2014]/g
const DASH_WITH_SPACES = /\s*[\u2013\u2014]\s*/g

export function containsForbiddenDash(text) {
  if (!text || typeof text !== 'string') return false
  return DASH_CHARS.test(text)
}

/** Replace em/en dash with comma + space or plain comma for cleaner sentences */
export function sanitizePublishedText(text) {
  if (text == null || typeof text !== 'string') return text
  let out = text.replace(DASH_WITH_SPACES, ', ')
  out = out.replace(DASH_CHARS, ', ')
  out = out.replace(/,\s*,+/g, ',')
  out = out.replace(/,\s+([.!?])/g, '$1')
  out = out.replace(/\s{2,}/g, ' ')
  return out
}

export function sanitizePostState(postState) {
  if (!postState) return postState
  const next = { ...postState, body: sanitizePublishedText(postState.body) }
  if (Array.isArray(postState.hashtags)) {
    next.hashtags = postState.hashtags.map((h) => ({
      ...h,
      tag: sanitizePublishedText(h.tag),
    }))
  }
  return next
}
