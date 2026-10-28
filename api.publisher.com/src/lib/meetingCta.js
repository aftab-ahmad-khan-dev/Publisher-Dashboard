/**
 * Ensure "Schedule a meeting" buttons always open the calendar booking URL,
 * never portfolio / product / dashboard links from env or templates.
 */

const SCHEDULE_LABEL_RE = /schedule\s+a\s+meeting|schedule\s+meeting|book\s+a\s+(?:call|demo|meeting)|pick\s+a\s+time|grab\s+a\s+slot/i

const FORBIDDEN_MEETING_HOSTS = [
  'vorkspro.com',
  'publisher-dashboard.vercel.app',
  'api-publisher-dashboard.vercel.app',
  'aftabahmadkhan.online',
  'localhost',
  '127.0.0.1',
]

export function isForbiddenMeetingHost(url) {
  try {
    const host = new URL(String(url || '')).hostname.toLowerCase()
    return FORBIDDEN_MEETING_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

/**
 * Rewrite every schedule/meeting CTA <a> so href = bookingUrl.
 * Leaves "Visit VorksPro" / "View portfolio" alone.
 */
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

/**
 * Also fix plain-text "Schedule a meeting: <bad-url>" lines.
 */
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
