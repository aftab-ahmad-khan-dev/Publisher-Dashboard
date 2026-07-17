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
  if (event?.hangoutLink && /meet\.google\.com/i.test(event.hangoutLink)) {
    return event.hangoutLink
  }
  const entries = event?.conferenceData?.entryPoints || []
  for (const e of entries) {
    if (e?.uri && /meet\.google\.com/i.test(e.uri)) return e.uri
  }
  const video = entries.find((e) => e.entryPointType === 'video' && e.uri)
  if (video?.uri) return video.uri

  // Appointment Schedule / older events sometimes only put Meet in description or location
  const blob = [event?.hangoutLink, event?.location, event?.description]
    .filter(Boolean)
    .join('\n')
  const m = String(blob).match(/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i)
  return m ? m[0] : ''
}

function eventHasConference(event) {
  if (!event) return false
  if (extractMeetLink(event)) return true
  const cd = event.conferenceData
  if (!cd) return false
  return Boolean(
    cd.conferenceId ||
      cd.createRequest ||
      (Array.isArray(cd.entryPoints) && cd.entryPoints.length) ||
      cd.conferenceSolution,
  )
}

async function fetchCalendarEvent(accessToken, eventId) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return null
  return data
}

/**
 * Attach Google Meet to an existing event when missing, then return the join URL.
 * Never creates a second conference if one already exists (same room for host + guest).
 */
export async function ensureMeetOnEvent(accessToken, eventId, eventHint = null) {
  let event = eventHint
  if (!event || !extractMeetLink(event)) {
    event = (await fetchCalendarEvent(accessToken, eventId)) || eventHint
  }
  if (!event?.id) return { meetLink: '', event: event || null }

  let meetLink = extractMeetLink(event)
  if (meetLink) return { meetLink, event }

  // Conference pending / present but link not ready yet — wait and re-fetch, do NOT create another Meet
  if (eventHasConference(event)) {
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 600))
      const fresh = await fetchCalendarEvent(accessToken, eventId)
      if (fresh) {
        event = fresh
        meetLink = extractMeetLink(fresh)
        if (meetLink) return { meetLink, event: fresh }
      }
    }
    return { meetLink: '', event }
  }

  const requestId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const patchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}` +
      '?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    },
  )
  let patched = await patchRes.json().catch(() => ({}))
  if (!patchRes.ok) {
    return { meetLink: '', event }
  }

  meetLink = extractMeetLink(patched)
  if (!meetLink) {
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 700))
      const fresh = await fetchCalendarEvent(accessToken, eventId)
      if (fresh) {
        patched = fresh
        meetLink = extractMeetLink(fresh)
        if (meetLink) break
      }
    }
  }

  if (meetLink) {
    const desc = String(patched.description || event.description || '').trim()
    if (!desc.includes(meetLink)) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}` +
          '?conferenceDataVersion=1&sendUpdates=none',
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: [
              desc.replace(/\n*Google Meet:\s*https?:\/\/meet\.google\.com\/\S+/gi, '').trim(),
              '',
              `Google Meet: ${meetLink}`,
              'Join with this link at the scheduled time — same room for host and guest.',
            ]
              .filter(Boolean)
              .join('\n'),
          }),
        },
      ).catch(() => {})
    }
  }

  return { meetLink, event: patched }
}

/**
 * Create a one-off calendar event invite with Google Meet.
 * Lead + admin both receive Google Calendar invites (sendUpdates=all).
 */
export async function createCalendarInvite({
  accessToken,
  summary,
  description,
  attendeeEmail,
  adminEmail,
  startIso,
  endIso,
  timeZone = 'UTC',
}) {
  const requestId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
    '?conferenceDataVersion=1&sendUpdates=all'

  const attendees = []
  const seen = new Set()
  for (const email of [attendeeEmail, adminEmail]) {
    const e = String(email || '').trim().toLowerCase()
    if (!e || seen.has(e)) continue
    seen.add(e)
    attendees.push({ email: e })
  }

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
      attendees,
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }),
  })
  let data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || `Calendar API ${res.status}`)
  }

  let meetLink = extractMeetLink(data)
  // Google sometimes returns the event before Meet is attached — re-fetch once
  if (!meetLink && data.id) {
    await new Promise((r) => setTimeout(r, 800))
    const fresh = await fetchCalendarEvent(accessToken, data.id)
    if (fresh) {
      data = fresh
      meetLink = extractMeetLink(fresh)
    }
  }

  // Patch description with Meet link (no new conference — same room for everyone)
  if (meetLink && data.id) {
    const descWithMeet = [
      String(description || '').trim(),
      '',
      `Google Meet: ${meetLink}`,
      'Join with this link at the scheduled time — same room for host and guest.',
    ]
      .filter(Boolean)
      .join('\n')
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(data.id)}` +
        '?conferenceDataVersion=1&sendUpdates=none',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: descWithMeet }),
      },
    ).catch(() => {})
  }

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
  maxResults = 250,
}) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(Math.min(maxResults, 250)),
    timeMin: timeMin || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    timeMax: timeMax || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
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

/** Collect guest emails from attendees only (never organizer/creator — that spam-notifies the host). */
function emailsFromEvent(event) {
  const found = new Set()
  for (const a of event.attendees || []) {
    if (a?.self) continue
    if (a?.organizer) continue
    const e = String(a.email || '')
      .trim()
      .toLowerCase()
    if (e) found.add(e)
  }
  return [...found]
}

function adminEmailsSet() {
  return new Set(
    [
      process.env.ADMIN_EMAIL,
      process.env.FROM_EMAIL,
      process.env.SMTP_EMAIL,
      'aftabahmadkhan.dev@gmail.com',
    ]
      .map((e) => String(e || '').trim().toLowerCase())
      .filter(Boolean),
  )
}

/** True when the calendar event was created/updated recently (real new booking). */
function isFreshBooking(event) {
  const now = Date.now()
  const created = event?.created ? new Date(event.created).getTime() : 0
  if (created && now - created <= 3 * 60 * 60 * 1000) return true
  const updated = event?.updated ? new Date(event.updated).getTime() : 0
  // Brand-new appointment updates often bump `updated` while `created` is slightly older
  if (created && updated && now - updated <= 45 * 60 * 1000 && now - created <= 24 * 60 * 60 * 1000) {
    return true
  }
  return false
}

function isUpcomingMeeting(startDate) {
  if (!startDate || Number.isNaN(startDate.getTime())) return false
  const t = startDate.getTime()
  const now = Date.now()
  // Ignore meetings that already started more than 10 minutes ago
  if (t < now - 10 * 60 * 1000) return false
  return true
}

function formatSlot(startDate, timeZone) {
  if (!startDate || Number.isNaN(startDate.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(startDate)
  } catch {
    return startDate.toISOString()
  }
}

/**
 * Match Calendar events to email recipients by guest email and update meeting pipeline.
 * Also returns unmatched appointment bookings so the UI can show booked slots.
 * Ensures Meet on the event and emails the guest + admin when a booking is new.
 */
export async function syncMeetingsFromCalendar(workspaceId, accessToken) {
  const events = await listUpcomingEvents({ accessToken })
  let updated = 0
  const matched = []
  const newlyScheduled = []
  const unmatchedBookings = []
  const notifiedKeys = new Set()
  const hostEmails = adminEmailsSet()

  const { emailMeetLinkToParties, isMeetJoinUrl } = await import('./meetingNotify.js')

  async function resolveJoinLink(event) {
    let meetLink = extractMeetLink(event)
    if (!meetLink && event.id) {
      const ensured = await ensureMeetOnEvent(accessToken, event.id, event)
      meetLink = ensured.meetLink || ''
      if (ensured.event) Object.assign(event, ensured.event)
    }
    return meetLink
  }

  async function notifyGuestOnce({
    email,
    name,
    meetLink,
    whenIso,
    summary,
    htmlLink,
    recipientId,
    broadcast = true,
  }) {
    const normalized = String(email || '').trim().toLowerCase()
    if (!normalized || hostEmails.has(normalized)) return null
    const key = `${normalized}|${whenIso || ''}|${meetLink || ''}`
    if (notifiedKeys.has(key)) return null
    notifiedKeys.add(key)

    const result = await emailMeetLinkToParties({
      leadEmail: email,
      leadName: name || '',
      meetLink,
      whenIso,
      summary: summary || 'Meeting',
      calendarHtmlLink: htmlLink || '',
      workspaceId,
      broadcast,
    }).catch(() => null)

    if (recipientId) {
      await EmailRecipient.updateOne(
        { _id: recipientId },
        { $set: { meetingConfirmSentAt: new Date() } },
      ).catch(() => {})
    }
    return result
  }

  for (const event of events) {
    if (event.status === 'cancelled') continue

    const guestEmails = emailsFromEvent(event).filter((e) => !hostEmails.has(e))
    const startRaw = event.start?.dateTime || event.start?.date
    const startDate = startRaw ? new Date(startRaw) : null
    const endRaw = event.end?.dateTime || event.end?.date
    const endDate = endRaw ? new Date(endRaw) : null
    const timeZone = event.start?.timeZone || event.end?.timeZone || ''
    const slotLabel = formatSlot(startDate, timeZone)
    const summary = event.summary || 'Meeting'
    const htmlLink = event.htmlLink || ''
    const fresh = isFreshBooking(event)
    const upcoming = isUpcomingMeeting(startDate)

    if (!guestEmails.length) continue
    // Skip old past events for Meet attach + notify
    if (!upcoming && !fresh) continue

    const meetLink = upcoming || fresh ? await resolveJoinLink(event) : extractMeetLink(event)
    const whenIso = startDate && !Number.isNaN(startDate.getTime()) ? startDate.toISOString() : null

    let anyMatched = false
    for (const email of guestEmails) {
      const recipients = await EmailRecipient.find({
        workspaceId,
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      })
        .sort({ updatedAt: -1 })
        .limit(5)

      if (!recipients.length) continue
      anyMatched = true

      for (const recipient of recipients) {
        let changed = false
        let statusBecameScheduled = false
        const prevStatus = recipient.meetingStatus || 'none'
        const prevEventId = String(recipient.calendarEventId || '')
        const prevLink = String(recipient.meetingLink || '')

        if (event.id && recipient.calendarEventId !== event.id) {
          recipient.calendarEventId = event.id
          changed = true
        }
        if (meetLink && recipient.meetingLink !== meetLink) {
          if (isMeetJoinUrl(meetLink) || !prevLink || !isMeetJoinUrl(prevLink)) {
            recipient.meetingLink = meetLink
            changed = true
          }
        }
        if (startDate && !Number.isNaN(startDate.getTime())) {
          const prev = recipient.meetingScheduledAt
            ? new Date(recipient.meetingScheduledAt).getTime()
            : 0
          if (prev !== startDate.getTime()) {
            const prevIsFuture = prev > Date.now() - 10 * 60 * 1000
            const thisIsSooner = !prev || startDate.getTime() < prev
            if (!prevIsFuture || thisIsSooner || event.id === prevEventId) {
              recipient.meetingScheduledAt = startDate
              changed = true
              if (fresh && event.id !== prevEventId) {
                recipient.meetingConfirmSentAt = null
                recipient.meetingReminderSentAt = null
              }
            }
          }
        }
        if (timeZone && recipient.meetingTimeZone !== timeZone) {
          recipient.meetingTimeZone = timeZone
          changed = true
        }

        const advanceable = ['none', 'invited', 'link_clicked']
        if (advanceable.includes(prevStatus)) {
          recipient.meetingStatus = 'scheduled'
          recipient.nudgeAutoStopped = true
          recipient.nudgeAutoStage = 'done'
          statusBecameScheduled = true
          changed = true
        } else if (prevStatus === 'scheduled' && fresh && event.id && event.id !== prevEventId) {
          statusBecameScheduled = true
        }

        if (changed) {
          await recipient.save()
          updated += 1
          const row = {
            recipientId: recipient._id.toString(),
            email: recipient.email,
            eventId: event.id,
            meetingLink: meetLink,
            meetingScheduledAt: whenIso,
            slotLabel,
            summary,
          }
          matched.push(row)
          if (statusBecameScheduled) newlyScheduled.push(row)
        }

        // Only notify for real NEW bookings — never backfill historical calendar rows
        const shouldNotify =
          upcoming &&
          fresh &&
          statusBecameScheduled &&
          Boolean(recipient.email) &&
          !recipient.meetingConfirmSentAt

        if (shouldNotify) {
          await notifyGuestOnce({
            email: recipient.email,
            name: recipient.name || recipient.mergeData?.name || '',
            meetLink,
            whenIso,
            summary,
            htmlLink,
            recipientId: recipient._id,
            broadcast: true,
          })
        } else if (
          recipient.meetingStatus === 'scheduled' &&
          !recipient.meetingConfirmSentAt &&
          !fresh
        ) {
          await EmailRecipient.updateOne(
            { _id: recipient._id },
            { $set: { meetingConfirmSentAt: new Date() } },
          ).catch(() => {})
        }
      }
    }

    if (!anyMatched && upcoming && startDate && !Number.isNaN(startDate.getTime())) {
      unmatchedBookings.push({
        eventId: event.id,
        summary,
        meetingScheduledAt: whenIso,
        meetingScheduledEndAt:
          endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : null,
        slotLabel,
        meetingLink: meetLink,
        guests: guestEmails,
      })

      const alreadyMarked = /\[publisher-meet-notified\]/i.test(String(event.description || ''))
      if (!alreadyMarked && fresh) {
        for (const email of guestEmails) {
          await notifyGuestOnce({
            email,
            name: '',
            meetLink,
            whenIso,
            summary,
            htmlLink,
            recipientId: null,
            broadcast: true,
          })
        }
      }
      if (!alreadyMarked && event.id) {
        const desc = String(event.description || '').trim()
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event.id)}` +
            '?conferenceDataVersion=1&sendUpdates=none',
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              description: `${desc}${desc ? '\n\n' : ''}[publisher-meet-notified]`,
            }),
          },
        ).catch(() => {})
      }
    }
  }

  return {
    ok: true,
    updated,
    matched,
    newlyScheduled: newlyScheduled.length,
    unmatchedBookings,
    eventsScanned: events.length,
    guestsNotified: notifiedKeys.size,
  }
}

/**
 * Convenience: resolve booking URL for a workspace.
 */
export async function getWorkspaceBookingUrl(workspaceId) {
  const config = await getWorkspaceConfig(workspaceId)
  return getCalendarBookingUrl(config)
}
