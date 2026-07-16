/**
 * Google Calendar helpers for product meeting CTAs, Meet invites, and sync.
 */
import { EmailRecipient } from '../models/EmailRecipient.js'
import { getWorkspaceConfig } from './configStore.js'

/** Default Appointment Schedule — never fall back to product/platform URLs. */
export const DEFAULT_CALENDAR_BOOKING_URL =
  process.env.GOOGLE_CALENDAR_BOOKING_URL?.trim() ||
  'https://calendar.app.google/eKcZV6Cy9SuCgA878'

const PRODUCT_OR_PLATFORM_HOSTS = [
  'vorkspro.com',
  'publisher-dashboard.vercel.app',
  'aftabahmadkhan.online',
]

/**
 * True when URL is a real booking page (Calendar / Calendly), not a product site.
 */
export function isBookingUrl(url) {
  const u = String(url || '').trim()
  if (!/^https?:\/\//i.test(u)) return false
  try {
    const host = new URL(u).hostname.toLowerCase()
    if (PRODUCT_OR_PLATFORM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return false
    }
  } catch {
    return false
  }
  return (
    /calendar\.app\.google/i.test(u) ||
    /calendar\.google\.com/i.test(u) ||
    /appointments\.google/i.test(u) ||
    /calendly\.com/i.test(u) ||
    /cal\.com\//i.test(u)
  )
}

/**
 * Resolve booking URL: explicit override → workspace config → env default.
 * Rejects product/platform URLs so "Schedule a meeting" never opens the product site.
 */
export function getCalendarBookingUrl(configOrLink) {
  const candidates = []
  if (typeof configOrLink === 'string' || configOrLink == null) {
    if (configOrLink) candidates.push(String(configOrLink).trim())
  } else {
    const fromWs = String(configOrLink?.gmail?.calendarBookingUrl || '').trim()
    if (fromWs) candidates.push(fromWs)
  }
  candidates.push(process.env.GOOGLE_CALENDAR_BOOKING_URL?.trim() || '')
  candidates.push(DEFAULT_CALENDAR_BOOKING_URL)

  for (const c of candidates) {
    if (c && isBookingUrl(c)) return c
  }
  return DEFAULT_CALENDAR_BOOKING_URL
}

function extractMeetLink(event) {
  if (event?.hangoutLink) return event.hangoutLink
  const entries = event?.conferenceData?.entryPoints || []
  const video = entries.find((e) => e.entryPointType === 'video' && e.uri)
  return video?.uri || ''
}

/**
 * Create a one-off calendar event invite with Google Meet.
 */
export async function createCalendarInvite({
  accessToken,
  summary,
  description,
  attendeeEmail,
  startIso,
  endIso,
  timeZone = 'UTC',
}) {
  const requestId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
    '?conferenceDataVersion=1&sendUpdates=all'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: summary || 'Meeting',
      description: description || '',
      start: { dateTime: startIso, timeZone },
      end: { dateTime: endIso, timeZone },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || `Calendar API ${res.status}`)
  }
  const meetLink = extractMeetLink(data)
  return {
    ok: true,
    eventId: data.id,
    htmlLink: data.htmlLink || '',
    meetLink,
    hangoutLink: data.hangoutLink || meetLink,
  }
}

/**
 * List upcoming (and recent) events on the primary calendar.
 */
export async function listUpcomingEvents({
  accessToken,
  timeMin,
  timeMax,
  maxResults = 100,
}) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(Math.min(maxResults, 250)),
    timeMin: timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || `Calendar list ${res.status}`)
  }
  return data.items || []
}

/**
 * Match Calendar events to email recipients by attendee email and update meeting pipeline.
 */
export async function syncMeetingsFromCalendar(workspaceId, accessToken) {
  const events = await listUpcomingEvents({ accessToken })
  let updated = 0
  const matched = []
  const newlyScheduled = []

  for (const event of events) {
    const attendees = (event.attendees || []).filter((a) => a.email && !a.self)
    if (!attendees.length) continue

    const startRaw = event.start?.dateTime || event.start?.date
    const startDate = startRaw ? new Date(startRaw) : null
    const meetLink = extractMeetLink(event) || event.htmlLink || ''

    for (const att of attendees) {
      const email = String(att.email || '')
        .trim()
        .toLowerCase()
      if (!email) continue

      const recipients = await EmailRecipient.find({
        workspaceId,
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      })
        .sort({ updatedAt: -1 })
        .limit(5)

      for (const recipient of recipients) {
        let changed = false
        let justScheduled = false
        if (event.id && recipient.calendarEventId !== event.id) {
          recipient.calendarEventId = event.id
          changed = true
        }
        if (meetLink && recipient.meetingLink !== meetLink) {
          recipient.meetingLink = meetLink
          changed = true
        }
        if (startDate && !Number.isNaN(startDate.getTime())) {
          const prev = recipient.meetingScheduledAt
            ? new Date(recipient.meetingScheduledAt).getTime()
            : 0
          if (prev !== startDate.getTime()) {
            recipient.meetingScheduledAt = startDate
            changed = true
          }
        }
        const advanceable = ['none', 'invited', 'link_clicked']
        if (advanceable.includes(recipient.meetingStatus || 'none')) {
          recipient.meetingStatus = 'scheduled'
          changed = true
          justScheduled = true
        }
        if (changed) {
          await recipient.save()
          updated += 1
          const row = {
            recipientId: recipient._id.toString(),
            email: recipient.email,
            eventId: event.id,
            meetingLink: meetLink,
            meetingScheduledAt: startDate?.toISOString?.() || null,
            summary: event.summary || 'Meeting',
          }
          matched.push(row)
          if (justScheduled) newlyScheduled.push(row)
        }
      }
    }
  }

  if (newlyScheduled.length) {
    try {
      const { sendMail, isMailerConfigured } = await import('./mailer.js')
      if (isMailerConfigured()) {
        const admin = process.env.ADMIN_EMAIL?.trim() || 'aftabahmadkhan.dev@gmail.com'
        for (const m of newlyScheduled) {
          await sendMail({
            to: admin,
            subject: `Meeting booked — ${m.email}`,
            text: [
              `A lead booked a meeting on your calendar.`,
              '',
              `Lead: ${m.email}`,
              `When: ${m.meetingScheduledAt || 'see calendar'}`,
              `Event: ${m.summary}`,
              m.meetingLink ? `Link: ${m.meetingLink}` : '',
              '',
              '— Publisher Suite',
            ]
              .filter(Boolean)
              .join('\n'),
          }).catch(() => {})
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  return { ok: true, updated, matched, newlyScheduled: newlyScheduled.length, eventsScanned: events.length }
}

/**
 * Convenience: resolve booking URL for a workspace.
 */
export async function getWorkspaceBookingUrl(workspaceId) {
  const config = await getWorkspaceConfig(workspaceId)
  return getCalendarBookingUrl(config)
}
