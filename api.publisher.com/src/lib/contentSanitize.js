/** Em/en dashes and styled “emphasis” (Unicode bold/italic) are not allowed in outbound copy */

const DASH_CHARS = /[\u2013\u2014]/g
// Only consume spaces/tabs that hug the dash — never newlines — so line breaks survive.
const DASH_WITH_SPACES = /[^\S\n]*[\u2013\u2014][^\S\n]*/g

export function containsForbiddenDash(text) {
  if (!text || typeof text !== 'string') return false
  return DASH_CHARS.test(text)
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

    // Mathematical Bold A–Z / a–z
    if (cp >= 0x1d400 && cp <= 0x1d419) {
      out += String.fromCharCode(0x41 + (cp - 0x1d400))
      continue
    }
    if (cp >= 0x1d41a && cp <= 0x1d433) {
      out += String.fromCharCode(0x61 + (cp - 0x1d41a))
      continue
    }
    // Mathematical Italic A–Z / a–z
    if (cp >= 0x1d434 && cp <= 0x1d44d) {
      out += String.fromCharCode(0x41 + (cp - 0x1d434))
      continue
    }
    if (cp >= 0x1d44e && cp <= 0x1d467) {
      out += String.fromCharCode(0x61 + (cp - 0x1d44e))
      continue
    }
    // Mathematical Bold Italic A–Z / a–z
    if (cp >= 0x1d468 && cp <= 0x1d481) {
      out += String.fromCharCode(0x41 + (cp - 0x1d468))
      continue
    }
    if (cp >= 0x1d482 && cp <= 0x1d49b) {
      out += String.fromCharCode(0x61 + (cp - 0x1d482))
      continue
    }
    // Mathematical Sans-Serif Bold A–Z / a–z
    if (cp >= 0x1d5d4 && cp <= 0x1d5ed) {
      out += String.fromCharCode(0x41 + (cp - 0x1d5d4))
      continue
    }
    if (cp >= 0x1d5ee && cp <= 0x1d607) {
      out += String.fromCharCode(0x61 + (cp - 0x1d5ee))
      continue
    }
    // Mathematical Sans-Serif Italic / Bold Italic (common paste ranges)
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
    // Bold / double-struck / sans / mono digits → ASCII
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

  // Markdown-style emphasis wrappers (leave bare * / _ alone when not paired)
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1')
  out = out.replace(/__([^_]+)__/g, '$1')
  out = out.replace(/(^|[^\w])\*([^*\n]+)\*(?!\w)/g, '$1$2')
  out = out.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1$2')

  return out
}

/** Replace em/en dash with comma + space; strip Unicode/markdown emphasis */
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
