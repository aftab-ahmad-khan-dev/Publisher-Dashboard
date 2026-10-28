/**
 * Classify tracked email link clicks: calendar booking vs portfolio vs other.
 */
import { isBookingUrl, isCalendarBookingIntent } from './googleCalendar.js'

const PORTFOLIO_HOSTS = [
  'aftabahmadkhan.online',
  'vorkspro.com',
  'publisher-dashboard.vercel.app',
]

export function isPortfolioUrl(url) {
  const u = String(url || '').trim()
  if (!/^https?:\/\//i.test(u)) return false
  try {
    const host = new URL(u).hostname.toLowerCase()
    return PORTFOLIO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

/**
 * @returns {'calendar' | 'portfolio' | 'other'}
 */
export function classifyClickUrl(url, recipient = null) {
  const u = String(url || '').trim()
  if (!u) return 'other'

  if (isBookingUrl(u) || isCalendarBookingIntent(u)) return 'calendar'
  const meeting = String(recipient?.meetingLink || '').trim()
  if (meeting && meeting.length >= 12 && u.includes(meeting.slice(0, 40))) {
    return 'calendar'
  }
  if (isPortfolioUrl(u)) return 'portfolio'
  return 'other'
}

const MAX_CLICK_EVENTS = 20

export function appendClickEvent(recipient, url, kind) {
  const events = Array.isArray(recipient.clickEvents) ? [...recipient.clickEvents] : []
  events.push({
    url: String(url || '').slice(0, 2000),
    kind: kind || 'other',
    at: new Date(),
  })
  recipient.clickEvents = events.slice(-MAX_CLICK_EVENTS)
  recipient.lastClickKind = kind || 'other'
}
