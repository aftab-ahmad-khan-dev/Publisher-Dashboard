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

/**
 * Strip decorative Unicode emphasis (Mathematical Bold / Italic / Sans-Serif Bold, etc.)
 * and simple markdown * / ** / _ / __ wrappers so mail + platform posts stay plain.
 */
export function stripTextEmphasis(text) {
  if (text == null || typeof text !== 'string') return text
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)

    if (cp >= 0x1d400 && cp <= 0x1d419) {
      out += String.fromCharCode(0x41 + (cp - 0x1d400))
      continue
    }
    if (cp >= 0x1d41a && cp <= 0x1d433) {
      out += String.fromCharCode(0x61 + (cp - 0x1d41a))
      continue
    }
    if (cp >= 0x1d434 && cp <= 0x1d44d) {
      out += String.fromCharCode(0x41 + (cp - 0x1d434))
      continue
    }
    if (cp >= 0x1d44e && cp <= 0x1d467) {
      out += String.fromCharCode(0x61 + (cp - 0x1d44e))
      continue
    }
    if (cp >= 0x1d468 && cp <= 0x1d481) {
      out += String.fromCharCode(0x41 + (cp - 0x1d468))
      continue
    }
    if (cp >= 0x1d482 && cp <= 0x1d49b) {
      out += String.fromCharCode(0x61 + (cp - 0x1d482))
      continue
    }
    if (cp >= 0x1d5d4 && cp <= 0x1d5ed) {
      out += String.fromCharCode(0x41 + (cp - 0x1d5d4))
      continue
    }
    if (cp >= 0x1d5ee && cp <= 0x1d607) {
      out += String.fromCharCode(0x61 + (cp - 0x1d5ee))
      continue
    }
    if (cp >= 0x1d608 && cp <= 0x1d621) {
      out += String.fromCharCode(0x41 + (cp - 0x1d608))
      continue
    }
    if (cp >= 0x1d622 && cp <= 0x1d63b) {
      out += String.fromCharCode(0x61 + (cp - 0x1d622))
      continue
    }
    if (cp >= 0x1d63c && cp <= 0x1d655) {
      out += String.fromCharCode(0x41 + (cp - 0x1d63c))
      continue
    }
    if (cp >= 0x1d656 && cp <= 0x1d66f) {
      out += String.fromCharCode(0x61 + (cp - 0x1d656))
      continue
    }
    if (cp >= 0x1d7ce && cp <= 0x1d7d7) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7ce))
      continue
    }
    if (cp >= 0x1d7e2 && cp <= 0x1d7eb) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7e2))
      continue
    }
    if (cp >= 0x1d7ec && cp <= 0x1d7f5) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7ec))
      continue
    }
    if (cp >= 0x1d7f6 && cp <= 0x1d7ff) {
      out += String.fromCharCode(0x30 + (cp - 0x1d7f6))
      continue
    }
    if (cp >= 0xff10 && cp <= 0xff19) {
      out += String.fromCharCode(0x30 + (cp - 0xff10))
      continue
    }

    out += ch
  }

  out = out.replace(/\*\*([^*]+)\*\*/g, '$1')
  out = out.replace(/__([^_]+)__/g, '$1')
  out = out.replace(/(^|[^\w])\*([^*\n]+)\*(?!\w)/g, '$1$2')
  out = out.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1$2')

  return out
}

export function sanitizePublishedText(text) {
  if (text == null || typeof text !== 'string') return text
  let out = stripTextEmphasis(text)
  out = out.replace(DASH_WITH_SPACES, ', ')
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
