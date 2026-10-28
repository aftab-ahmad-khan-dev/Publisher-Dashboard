/**
 * Keep in sync with api.publisher.com/src/lib/meetingCta.js
 */

const SCHEDULE_LABEL_RE = /schedule\s+a\s+meeting|schedule\s+meeting|book\s+a\s+(?:call|demo|meeting)|pick\s+a\s+time|grab\s+a\s+slot/i

export function forceScheduleMeetingHrefs(html, bookingUrl) {
  const booking = String(bookingUrl || '').trim()
  if (!html || !booking) return html

  return String(html).replace(
    /<a\b([^>]*?)href\s*=\s*(["'])([^"']*)\2([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, pre, quote, href, post, inner) => {
      const text = String(inner)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!SCHEDULE_LABEL_RE.test(text)) return full
      return `<a${pre}href=${quote}${booking}${quote}${post}>${inner}</a>`
    },
  )
}

export function forceScheduleMeetingText(text, bookingUrl) {
  const booking = String(bookingUrl || '').trim()
  if (!text || !booking) return text
  return String(text)
    .replace(
      /(Schedule\s+a\s+meeting[^:\n]*:\s*)(https?:\/\/\S+)/gi,
      `$1${booking}`,
    )
    .replace(
      /(Prefer\s+a\s+quick\s+call\?\s*Schedule\s+a\s+meeting:\s*)(https?:\/\/\S+)/gi,
      `$1${booking}`,
    )
}
