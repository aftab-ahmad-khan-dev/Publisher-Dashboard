/** Em/en dashes are not allowed in outbound email or social post copy */

const DASH_CHARS = /[\u2013\u2014]/g
// Only consume spaces/tabs that hug the dash \u2014 never newlines \u2014 so line breaks survive.
const DASH_WITH_SPACES = /[^\S\n]*[\u2013\u2014][^\S\n]*/g

export function containsForbiddenDash(text) {
  if (!text || typeof text !== 'string') return false
  return DASH_CHARS.test(text)
}

/** Split text into segments for inline highlighting of forbidden dashes. */
export function splitTextForDashHighlight(text) {
  if (!text) return [{ text: '', dash: false }]
  const parts = []
  let last = 0
  const re = /[\u2013\u2014]/g
  let match
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index), dash: false })
    }
    parts.push({ text: match[0], dash: true })
    last = match.index + match[0].length
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), dash: false })
  }
  return parts.length ? parts : [{ text: '', dash: false }]
}

export function postHasForbiddenDash(postState) {
  if (!postState) return false
  if (containsForbiddenDash(postState.body)) return true
  const poll = postState.poll
  if (!poll?.enabled) return false
  if (containsForbiddenDash(poll.question)) return true
  return (poll.options || []).some((o) => containsForbiddenDash(o))
}

export function forbiddenDashMessage() {
  return 'Em dashes (—) are not allowed. Replace highlighted dashes with a comma or period before publishing.'
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
  if (postState.poll?.enabled) {
    next.poll = {
      ...postState.poll,
      question: sanitizePublishedText(postState.poll.question),
      options: (postState.poll.options || []).map((o) => sanitizePublishedText(o)),
    }
  }
  return next
}
