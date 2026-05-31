/** Em/en dashes are not allowed in outbound email or social post copy */

const DASH_CHARS = /[\u2013\u2014]/g
// Only consume spaces/tabs that hug the dash \u2014 never newlines \u2014 so line breaks survive.
const DASH_WITH_SPACES = /[^\S\n]*[\u2013\u2014][^\S\n]*/g

export function containsForbiddenDash(text) {
  if (!text || typeof text !== 'string') return false
  return DASH_CHARS.test(text)
}

export function sanitizePublishedText(text) {
  if (text == null || typeof text !== 'string') return text
  let out = text.replace(DASH_WITH_SPACES, ', ')
  out = out.replace(DASH_CHARS, ', ')
  // Tidy artifacts the swap can create, without ever crossing a line break, so
  // the user's newlines, blank lines, and indentation are preserved as pasted.
  out = out.replace(/,[^\S\n]*,+/g, ',')
  out = out.replace(/,[^\S\n]*([.!?])/g, '$1')
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
