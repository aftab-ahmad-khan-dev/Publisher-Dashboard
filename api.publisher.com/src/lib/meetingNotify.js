/**
 * Meet join confirmation emails + ~10 minute pre-meeting reminders.
 * Manual or auto: lead gets mail with Meet link; admin gets in-app + push via SSE.
 */
import { EmailRecipient } from '../models/EmailRecipient.js'
import { sendMail, isMailerConfigured } from './mailer.js'
import { broadcastEvent } from './events.js'
import { logger } from './logger.js'

function adminEmail() {
  return (
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.SMTP_EMAIL?.trim() ||
    'aftabahmadkhan.dev@gmail.com'
  )
}

function formatWhen(isoOrDate, timeZone) {
  try {
    const opts = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }
    if (timeZone) opts.timeZone = timeZone
    return new Date(isoOrDate).toLocaleString(undefined, opts)
  } catch {
    try {
      return new Date(isoOrDate).toLocaleString()
    } catch {
      return String(isoOrDate || '')
    }
  }
}

function escape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function isMeetJoinUrl(url) {
  return /meet\.google\.com|hangouts\.google\.com/i.test(String(url || ''))
}

export function resolveJoinLink(recipient) {
  let meetLink = String(recipient?.meetingLink || recipient?.mergeData?.meetingLink || '').trim()
  if (meetLink && !isMeetJoinUrl(meetLink) && !/^https?:\/\//i.test(meetLink)) {
    meetLink = ''
  }
  if (
    meetLink &&
    !isMeetJoinUrl(meetLink) &&
    /calendar\.app\.google|appointments\.google|calendly\.com/i.test(meetLink)
  ) {
    // Booking pages are not join links for a reminder
    meetLink = ''
  }
  return meetLink
}

export function canSendMeetingReminder(recipient) {
  if (!recipient?.email) return false
  if (!recipient.meetingScheduledAt) return false
  const status = recipient.meetingStatus || 'none'
  if (!['scheduled', 'invited', 'link_clicked'].includes(status)) return false
  const start = new Date(recipient.meetingScheduledAt).getTime()
  if (!Number.isFinite(start)) return false
  // Allow from now until meeting starts (and a small grace after for late manual sends)
  return start > Date.now() - 5 * 60 * 1000
}

/**
 * Email guest + admin with meeting time and join link (Meet preferred).
 * Guest always gets a copy when leadEmail is set.
 */
export async function emailMeetLinkToParties({
  leadEmail,
  leadName,
  meetLink,
  whenIso,
  summary,
  calendarHtmlLink,
  skipAdmin = false,
  workspaceId = null,
  broadcast = true,
}) {
  if (!leadEmail && skipAdmin) return { ok: false, reason: 'no-recipient' }

  const joinUrl = String(meetLink || calendarHtmlLink || '').trim()
  if (!joinUrl && !whenIso) return { ok: false, reason: 'no-link-or-time' }

  const when = formatWhen(whenIso)
  const admin = adminEmail()
  const title = summary || 'Meeting'
  const hasMeet = isMeetJoinUrl(joinUrl)
  const joinLabel = hasMeet ? 'Join Google Meet' : 'Open meeting details'

  if (broadcast) {
    broadcastEvent('MEETING_SCHEDULED', {
      workspaceId: workspaceId || undefined,
      title: 'Meeting scheduled',
      body: `${leadEmail || 'Guest'}${when ? ` · ${when}` : ''}`,
      meetLink: joinUrl,
      email: leadEmail || undefined,
      at: Date.now(),
    })
  }

  if (!isMailerConfigured()) return { ok: false, reason: 'no-mailer', appNotified: true }

  const bodyFor = (who) =>
    [
      who === 'lead' ? `Hi${leadName ? ` ${leadName.split(' ')[0]}` : ''},` : 'Hi,',
      '',
      `Your meeting is confirmed.`,
      '',
      `What: ${title}`,
      when ? `When: ${when}` : '',
      joinUrl ? `${hasMeet ? 'Google Meet' : 'Meeting link'}: ${joinUrl}` : '',
      calendarHtmlLink && calendarHtmlLink !== joinUrl
        ? `Calendar event: ${calendarHtmlLink}`
        : '',
      '',
      'Save this email — join with the link at the scheduled time.',
      'You will also get a reminder about 10 minutes before.',
      '',
      '— Publisher Suite',
    ]
      .filter(Boolean)
      .join('\n')

  const htmlFor = (who) => `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.55;">
  <p>${who === 'lead' ? `Hi${leadName ? ` ${escape(leadName.split(' ')[0])}` : ''},` : 'Hi,'}</p>
  <p><strong>Your meeting is confirmed.</strong></p>
  <p><strong>What:</strong> ${escape(title)}<br/>
  ${when ? `<strong>When:</strong> ${escape(when)}` : ''}</p>
  ${
    joinUrl
      ? `<p style="margin:20px 0;">
    <a href="${escape(joinUrl)}" style="display:inline-block;padding:12px 20px;background:#0f3d68;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">
      ${escape(joinLabel)}
    </a>
  </p>
  <p style="font-size:13px;word-break:break-all;"><a href="${escape(joinUrl)}">${escape(joinUrl)}</a></p>`
      : ''
  }
  ${
    calendarHtmlLink && calendarHtmlLink !== joinUrl
      ? `<p style="font-size:12px;"><a href="${escape(calendarHtmlLink)}">Open in Google Calendar</a></p>`
      : ''
  }
  <p style="font-size:12px;color:#64748b;">You will get a reminder about 10 minutes before the meeting.</p>
</body></html>`

  const results = { lead: false, admin: false }
  if (leadEmail) {
    try {
      await sendMail({
        to: leadEmail,
        subject: when
          ? `Meeting confirmed — ${when}`
          : `Meeting confirmed — ${title}`,
        text: bodyFor('lead'),
        html: htmlFor('lead'),
      })
      results.lead = true
    } catch (err) {
      logger.warn('Meet link email to guest failed', { error: err.message, to: leadEmail })
    }
  }
  if (
    !skipAdmin &&
    admin &&
    admin.toLowerCase() !== String(leadEmail || '').toLowerCase()
  ) {
    try {
      await sendMail({
        to: admin,
        subject: `Meeting booked — ${leadEmail || 'guest'}${when ? ` · ${when}` : ''}`,
        text: bodyFor('admin'),
        html: htmlFor('admin'),
      })
      results.admin = true
    } catch (err) {
      logger.warn('Meet link email to admin failed', { error: err.message })
    }
  }

  return { ok: results.lead || results.admin, appNotified: broadcast, ...results }
}

/**
 * Send ~10 min meeting reminder to the lead (Meet link included).
 * Always notifies admin via in-app + push (SSE → dashboard SW).
 */
export async function sendMeetingReminder(recipient, { auto = false, force = false } = {}) {
  if (!recipient) return { ok: false, error: 'Recipient not found.' }
  if (!force && !canSendMeetingReminder(recipient)) {
    return {
      ok: false,
      error: 'Reminder only for upcoming booked meetings.',
    }
  }
  if (!force && recipient.meetingReminderSentAt) {
    return { ok: false, error: 'Reminder already sent for this meeting.', alreadySent: true }
  }

  const meetLink = resolveJoinLink(recipient)
  const when = formatWhen(recipient.meetingScheduledAt, recipient.meetingTimeZone || undefined)
  const name = String(recipient.name || recipient.mergeData?.name || '').trim()
  const first = name.split(/\s+/).filter(Boolean)[0] || ''
  const hasJoin = Boolean(meetLink && /^https?:\/\//i.test(meetLink))
  const hasMeet = isMeetJoinUrl(meetLink)

  const text = [
    `Hi${first ? ` ${first}` : ''},`,
    '',
    'Reminder: you booked a meeting that starts in about 10 minutes.',
    '',
    `When: ${when}`,
    hasJoin
      ? `${hasMeet ? 'Google Meet' : 'Meeting link'}: ${meetLink}`
      : 'Open your calendar invite for the join details.',
    '',
    'See you shortly.',
    '',
    '— Publisher Suite',
  ].join('\n')

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.55;font-size:15px;">
    <p>Hi${first ? ` ${escape(first)}` : ''},</p>
    <p><strong>Reminder:</strong> you booked a meeting that starts in about <strong>10 minutes</strong>.</p>
    <p><strong>When:</strong> ${escape(when)}</p>
    ${
      hasJoin
        ? `<p style="margin:20px 0;">
      <a href="${escape(meetLink)}" style="display:inline-block;padding:12px 20px;background:#0f3d68;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">
        ${hasMeet ? 'Join Google Meet' : 'Open meeting link'}
      </a>
    </p>
    <p style="font-size:12px;word-break:break-all;"><a href="${escape(meetLink)}">${escape(meetLink)}</a></p>`
        : `<p style="font-size:13px;color:#64748b;">Open your Google Calendar invite for the join link.</p>`
    }
    <p>See you shortly.</p>
    <p style="font-size:12px;color:#64748b;">— Publisher Suite</p>
  </body></html>`

  // Admin dashboard + push even if SMTP is down
  broadcastEvent('MEETING_REMINDER', {
    workspaceId: recipient.workspaceId || undefined,
    title: auto ? 'Auto: meeting in ~10 min' : 'Meeting reminder sent',
    body: `${recipient.email} · ${when}`,
    meetLink: meetLink || '',
    email: recipient.email,
    href: '/email?tab=meetings',
    auto: Boolean(auto),
    at: Date.now(),
  })

  let mailed = false
  if (isMailerConfigured() && recipient.email) {
    try {
      await sendMail({
        to: recipient.email,
        subject: `Reminder — meeting in 10 minutes · ${when}`,
        text,
        html,
      })
      mailed = true
    } catch (err) {
      logger.warn('Meeting reminder email to lead failed', {
        id: String(recipient._id),
        error: err.message,
      })
    }
  }

  const admin = adminEmail()
  if (
    isMailerConfigured() &&
    admin &&
    admin.toLowerCase() !== String(recipient.email || '').toLowerCase()
  ) {
    try {
      await sendMail({
        to: admin,
        subject: `${auto ? '[Auto] ' : ''}Starting soon — ${recipient.email} (${when})`,
        text,
        html,
      })
    } catch (err) {
      logger.warn('Meeting reminder email to admin failed', { error: err.message })
    }
  }

  await EmailRecipient.updateOne(
    { _id: recipient._id },
    { $set: { meetingReminderSentAt: new Date() } },
  )

  return {
    ok: true,
    mailed,
    auto: Boolean(auto),
    meetLink: meetLink || '',
    appNotified: true,
  }
}

/**
 * Auto-remind when a meeting is within the next ~10 minutes and admin has not
 * already sent a reminder.
 */
export async function runMeetingReminders() {
  const now = Date.now()
  // Fire once in the 10→0 minute window before start
  const windowEnd = new Date(now + 10 * 60 * 1000)
  const windowStart = new Date(now)

  const due = await EmailRecipient.find({
    meetingScheduledAt: { $gte: windowStart, $lte: windowEnd },
    meetingStatus: { $in: ['scheduled', 'invited', 'link_clicked'] },
    $or: [{ meetingReminderSentAt: null }, { meetingReminderSentAt: { $exists: false } }],
  })
    .limit(40)

  let sent = 0
  for (const recipient of due) {
    try {
      const result = await sendMeetingReminder(recipient, { auto: true })
      if (result.ok) sent += 1
    } catch (err) {
      logger.warn('Meeting reminder failed', { id: String(recipient._id), error: err.message })
    }
  }

  if (sent) logger.info('Meeting reminders sent', { sent })
  return { ok: true, sent }
}
