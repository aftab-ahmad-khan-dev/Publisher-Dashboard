/**
 * Send Meet join emails + 5–10 minute pre-meeting reminders to lead and admin.
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

function formatWhen(isoOrDate) {
  try {
    return new Date(isoOrDate).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(isoOrDate || '')
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
  if (!isMailerConfigured()) return { ok: false, reason: 'no-mailer' }
  if (!leadEmail && skipAdmin) return { ok: false, reason: 'no-recipient' }

  const joinUrl = String(meetLink || calendarHtmlLink || '').trim()
  if (!joinUrl && !whenIso) return { ok: false, reason: 'no-link-or-time' }

  const when = formatWhen(whenIso)
  const admin = adminEmail()
  const title = summary || 'Meeting'
  const hasMeet = isMeetJoinUrl(joinUrl)
  const joinLabel = hasMeet ? 'Join Google Meet' : 'Open meeting details'

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
      'You will also get a reminder about 5–10 minutes before.',
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
  <p style="font-size:12px;color:#64748b;">You will get a reminder about 5–10 minutes before the meeting.</p>
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

  if (broadcast) {
    broadcastEvent('MEETING_SCHEDULED', {
      workspaceId: workspaceId || undefined,
      title: 'Meeting scheduled',
      body: `${leadEmail || 'Guest'}${when ? ` · ${when}` : ''}`,
      meetLink: joinUrl,
      at: Date.now(),
    })
  }

  return { ok: results.lead || results.admin, ...results }
}

/**
 * Find meetings starting in the next ~10 minutes and remind lead and admin once.
 */
export async function runMeetingReminders() {
  if (!isMailerConfigured()) return { ok: true, sent: 0, skipped: 'no-mailer' }

  const now = Date.now()
  const windowEnd = new Date(now + 10 * 60 * 1000)
  const windowStart = new Date(now + 4 * 60 * 1000)

  const due = await EmailRecipient.find({
    meetingScheduledAt: { $gte: windowStart, $lte: windowEnd },
    meetingStatus: { $in: ['scheduled', 'invited', 'link_clicked'] },
    $or: [{ meetingReminderSentAt: null }, { meetingReminderSentAt: { $exists: false } }],
  })
    .limit(40)
    .lean()

  let sent = 0
  const admin = adminEmail()

  for (const r of due) {
    let meetLink = String(r.meetingLink || r.mergeData?.meetingLink || '').trim()
    // Prefer a real Meet URL; booking pages are not join links
    if (meetLink && !isMeetJoinUrl(meetLink) && !/^https?:\/\//i.test(meetLink)) {
      meetLink = ''
    }
    if (meetLink && !isMeetJoinUrl(meetLink) && /calendar\.app\.google|appointments\.google/i.test(meetLink)) {
      meetLink = ''
    }

    const when = formatWhen(r.meetingScheduledAt)
    const name = r.name || r.mergeData?.name || ''
    const title = `Meeting with ${name || r.email}`
    const hasJoin = Boolean(meetLink && /^https?:\/\//i.test(meetLink))
    const text = [
      `Reminder: your meeting starts in about 5–10 minutes.`,
      '',
      `When: ${when}`,
      hasJoin ? `Join: ${meetLink}` : 'Open your calendar invite for the join details.',
      '',
      '— Publisher Suite',
    ].join('\n')
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;">
      <p><strong>Reminder:</strong> your meeting starts in about 5–10 minutes.</p>
      <p><strong>When:</strong> ${escape(when)}</p>
      ${
        hasJoin
          ? `<p><a href="${escape(meetLink)}" style="display:inline-block;padding:12px 20px;background:#0f3d68;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Join meeting</a></p>
      <p style="font-size:12px;word-break:break-all;">${escape(meetLink)}</p>`
          : `<p style="font-size:13px;color:#64748b;">Open your Google Calendar invite for the join link.</p>`
      }
    </body></html>`

    try {
      if (r.email) {
        await sendMail({
          to: r.email,
          subject: `Starting soon — ${when}`,
          text,
          html,
        })
      }
      if (admin && admin.toLowerCase() !== String(r.email || '').toLowerCase()) {
        await sendMail({
          to: admin,
          subject: `Starting soon — ${r.email} (${when})`,
          text,
          html,
        })
      }

      await EmailRecipient.updateOne(
        { _id: r._id },
        { $set: { meetingReminderSentAt: new Date() } },
      )

      broadcastEvent('MEETING_REMINDER', {
        title: 'Meeting in ~5–10 min',
        body: `${r.email} · ${when}`,
        meetLink: meetLink || '',
        href: '/email?tab=meetings',
        workspaceId: r.workspaceId || undefined,
        at: Date.now(),
      })

      sent += 1
    } catch (err) {
      logger.warn('Meeting reminder failed', { id: String(r._id), error: err.message })
    }
  }

  if (sent) logger.info('Meeting reminders sent', { sent })
  return { ok: true, sent }
}
