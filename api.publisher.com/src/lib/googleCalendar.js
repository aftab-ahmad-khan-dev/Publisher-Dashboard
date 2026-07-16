/**
 * Google Calendar helpers for product meeting CTAs, Meet invites, and sync.
 */
import { EmailRecipient } from '../models/EmailRecipient.js'
import { getWorkspaceConfig } from './configStore.js'

/**
 * Resolve booking URL: explicit override → workspace config → env.
 */
export function getCalendarBookingUrl(configOrLink) {
  if (typeof configOrLink === 'string' || configOrLink == null) {
    return (
      String(configOrLink || '').trim() ||
      process.env.GOOGLE_CALENDAR_BOOKING_URL?.trim() ||
      ''
    )
  }
  return (
    String(configOrLink?.gmail?.calendarBookingUrl || '').trim() ||
    process.env.GOOGLE_CALENDAR_BOOKING_URL?.trim() ||
    ''
  )
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
        }
        if (changed) {
          await recipient.save()
          updated += 1
          matched.push({
            recipientId: recipient._id.toString(),
            email: recipient.email,
            eventId: event.id,
            meetingLink: meetLink,
            meetingScheduledAt: startDate?.toISOString?.() || null,
          })
        }
      }
    }
  }

  return { ok: true, updated, matched, eventsScanned: events.length }
}

/**
 * Convenience: resolve booking URL for a workspace.
 */
export async function getWorkspaceBookingUrl(workspaceId) {
  const config = await getWorkspaceConfig(workspaceId)
  return getCalendarBookingUrl(config)
}
