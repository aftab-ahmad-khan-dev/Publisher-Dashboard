/**
 * Auto nudge sequence for engaged leads who have not booked:
 *  1. Final Call — after status unchanged for 48h
 *  2. Reason — 36h after Final Call (status still unchanged)
 *  3. Follow Up — 24h after Reason (status still unchanged)
 *
 * Admin meeting-status updates (or booking) stop the remaining sequence.
 */

import { EmailRecipient } from '../models/EmailRecipient.js'
import { getWorkspaceConfig, resolveEmailNudges } from './configStore.js'
import { canSendGmail } from './platforms.js'
import { refreshGmailTokenIfNeeded, getGmailAccessToken } from './gmailOAuth.js'
import { broadcastEvent } from './events.js'
import { logger } from './logger.js'
import {
  buildNudgeEmail,
  isNudgeEligible,
  engagementStartedAt,
  currentMeetingStatusKey,
} from './nudgeEmails.js'

const FINAL_CALL_MS = (hours) => hours * 3600_000
const REASON_AFTER_FINAL_MS = (hours) => hours * 3600_000
const FOLLOW_UP_AFTER_REASON_MS = (hours) => hours * 3600_000

async function resolveBookingUrl(workspaceId, override) {
  const { getCalendarBookingUrl, isBookingUrl } = await import('./googleCalendar.js')
  const explicit = String(override || '').trim()
  if (explicit && isBookingUrl(explicit)) return explicit
  const config = await getWorkspaceConfig(workspaceId)
  return getCalendarBookingUrl(config)
}

async function timingForWorkspace(workspaceId, cache) {
  if (cache.has(workspaceId)) return cache.get(workspaceId)
  const config = await getWorkspaceConfig(workspaceId)
  const timing = resolveEmailNudges(config)
  cache.set(workspaceId, timing)
  return timing
}

export async function deliverNudge({ recipient, type, workspaceId, auto = false }) {
  const config = await getWorkspaceConfig(workspaceId)
  if (!canSendGmail(config.gmail)) {
    return { ok: false, error: 'Mail is not ready.' }
  }

  const bookingUrl =
    (await resolveBookingUrl(workspaceId, recipient.meetingLink)) ||
    recipient.mergeData?.meetingLink ||
    ''

  const payload = buildNudgeEmail({
    type,
    recipient,
    bookingUrl,
    signatureName: process.env.ADMIN_NAME?.trim() || 'Aftab',
    signatureSite: process.env.ADMIN_SITE?.trim() || 'https://vorkspro.com',
  })
  if (!payload) return { ok: false, error: 'Invalid nudge type.' }

  let accessToken = null
  let from =
    config.gmail?.fromEmail ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.SMTP_EMAIL?.trim() ||
    ''

  try {
    await refreshGmailTokenIfNeeded(workspaceId)
    const gmailAuth = await getGmailAccessToken(workspaceId)
    accessToken = gmailAuth.accessToken
    from = gmailAuth.fromEmail || from
  } catch {
    /* SMTP fallback */
  }

  const to = recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email

  let result
  if (accessToken) {
    const { sendGmailMessage } = await import('./gmailSend.js')
    result = await sendGmailMessage({
      accessToken,
      from,
      to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    })
  } else {
    const { sendMail, isMailerConfigured } = await import('./mailer.js')
    if (!isMailerConfigured()) {
      return { ok: false, error: 'No mail transport ready.' }
    }
    result = await sendMail({
      to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    })
  }

  const now = new Date()
  recipient.lastNudgeType = type
  recipient.lastNudgeAt = now
  recipient.nudgeAutoStage = type
  recipient.nudgeStatusSnapshot = currentMeetingStatusKey(recipient)
  if (!recipient.nudgeEngagedAt) {
    recipient.nudgeEngagedAt = engagementStartedAt(recipient) || now
  }
  await recipient.save()

  broadcastEvent('EMAIL_NUDGE_SENT', {
    workspaceId,
    type,
    auto: Boolean(auto),
    email: recipient.email,
    title: auto ? `Auto ${payload.label}` : `${payload.label} sent`,
    body: `Sent to ${recipient.email}`,
    at: Date.now(),
  })

  return {
    ok: true,
    type,
    auto: Boolean(auto),
    messageId: result?.messageId || null,
    payload,
  }
}

function statusStillSame(recipient) {
  const current = currentMeetingStatusKey(recipient)
  const snap = String(recipient.nudgeStatusSnapshot || '').trim()
  if (!snap) return true
  return snap === current
}

/**
 * Decide the next auto nudge type for a recipient, or null if not due.
 * @param timing {{ finalCallHours: number, reasonHours: number, followUpHours: number }}
 */
export function nextAutoNudge(recipient, now = Date.now(), timing = null) {
  if (!recipient || recipient.nudgeAutoStopped) return null
  if (!isNudgeEligible(recipient)) return null
  if (recipient.mailboxFolder === 'junk') return null

  const hours = timing || {
    finalCallHours: 48,
    reasonHours: 36,
    followUpHours: 24,
  }

  const stage = String(recipient.nudgeAutoStage || '')
  if (stage === 'done' || stage === 'follow_up') return null

  if (!statusStillSame(recipient) && stage) {
    return null
  }

  const engagedAt = engagementStartedAt(recipient)
  if (!engagedAt) return null

  const lastAt = recipient.lastNudgeAt ? new Date(recipient.lastNudgeAt).getTime() : 0

  if (!stage || stage === '') {
    if (now - engagedAt.getTime() >= FINAL_CALL_MS(hours.finalCallHours)) {
      return 'final_call'
    }
    return null
  }

  if (stage === 'final_call') {
    if (lastAt && now - lastAt >= REASON_AFTER_FINAL_MS(hours.reasonHours)) {
      return 'reason'
    }
    return null
  }

  if (stage === 'reason') {
    if (lastAt && now - lastAt >= FOLLOW_UP_AFTER_REASON_MS(hours.followUpHours)) {
      return 'follow_up'
    }
    return null
  }

  return null
}

/** Mark auto sequence stopped when admin changes meeting status or lead books. */
export function applyMeetingStatusChange(recipient, previousStatus, nextStatus) {
  if (!recipient) return
  const prev = String(previousStatus || '')
  const next = String(nextStatus || '')
  if (!next || prev === next) return

  if (['scheduled', 'completed', 'no_show'].includes(next)) {
    recipient.nudgeAutoStopped = true
    recipient.nudgeAutoStage = 'done'
    return
  }

  // Any other admin status change stops remaining auto mails
  recipient.nudgeAutoStopped = true
  recipient.nudgeStatusSnapshot = next
}

export async function runAutoNudges({ limit = 25 } = {}) {
  const now = Date.now()
  // Floor at 1h so short admin timings still get candidates; nextAutoNudge gates exact delay
  const engagedCutoff = new Date(now - 3600_000)

  const candidates = await EmailRecipient.find({
    nudgeAutoStopped: { $ne: true },
    nudgeAutoStage: { $nin: ['done', 'follow_up'] },
    mailboxFolder: { $ne: 'junk' },
    meetingStatus: { $nin: ['scheduled', 'completed'] },
    $or: [
      { openedAt: { $lte: engagedCutoff } },
      { clickedAt: { $lte: engagedCutoff } },
      { meetingClickedAt: { $lte: engagedCutoff } },
      { lastNudgeAt: { $exists: true, $ne: null } },
      { nudgeEngagedAt: { $lte: engagedCutoff } },
    ],
  })
    .sort({ lastNudgeAt: 1, openedAt: 1 })
    .limit(limit)

  let sent = 0
  let skipped = 0
  const byWorkspace = new Map()
  const timingCache = new Map()

  for (const recipient of candidates) {
    const timing = await timingForWorkspace(recipient.workspaceId, timingCache)
    const type = nextAutoNudge(recipient, now, timing)
    if (!type) {
      skipped += 1
      continue
    }

    // Seed snapshot on first auto send so later steps detect admin changes
    if (!recipient.nudgeStatusSnapshot) {
      recipient.nudgeStatusSnapshot = currentMeetingStatusKey(recipient)
    }
    if (!recipient.nudgeEngagedAt) {
      recipient.nudgeEngagedAt = engagementStartedAt(recipient) || new Date()
    }

    const workspaceId = recipient.workspaceId
    try {
      if (!byWorkspace.has(workspaceId)) {
        const config = await getWorkspaceConfig(workspaceId)
        byWorkspace.set(workspaceId, canSendGmail(config.gmail))
      }
      if (!byWorkspace.get(workspaceId)) {
        skipped += 1
        continue
      }

      const result = await deliverNudge({
        recipient,
        type,
        workspaceId,
        auto: true,
      })
      if (result.ok) {
        sent += 1
        if (type === 'follow_up') {
          recipient.nudgeAutoStage = 'done'
          await recipient.save()
        }
        logger.info('Auto nudge sent', {
          recipientId: String(recipient._id),
          email: recipient.email,
          type,
        })
      } else {
        skipped += 1
        logger.warn('Auto nudge skipped', {
          recipientId: String(recipient._id),
          error: result.error,
        })
      }
    } catch (err) {
      skipped += 1
      logger.warn('Auto nudge failed', {
        recipientId: String(recipient._id),
        error: err.message,
      })
    }
  }

  return { sent, skipped, checked: candidates.length }
}
