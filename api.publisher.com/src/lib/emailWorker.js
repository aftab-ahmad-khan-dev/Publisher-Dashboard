import crypto from 'crypto'
import { EmailCampaign } from '../models/EmailCampaign.js'
import { EmailRecipient } from '../models/EmailRecipient.js'
import { getGmailAccessToken } from './gmailOAuth.js'
import { sendGmailMessage, injectTrackingPixel } from './gmailSend.js'
import { sendMail, isMailerConfigured } from './mailer.js'
import { mergeTemplate } from './emailMerge.js'
import { sanitizePublishedText } from './contentSanitize.js'
import { broadcastEvent } from './events.js'
import { logger } from './logger.js'
import { apiPublicBase } from './publicUrl.js'
import { enqueueLeadStatusUpdate } from './leadWriteback.js'
import { getWorkspaceConfig } from './configStore.js'
import { getCalendarBookingUrl, isBookingUrl, isCalendarBookingIntent, resolveLiveBookingUrl } from './googleCalendar.js'
import { forceScheduleMeetingHrefs, forceScheduleMeetingText } from './meetingCta.js'
import { buildNichePain, buildNichePainShort } from './nichePain.js'
import { classifyClickUrl, appendClickEvent } from './clickClassify.js'

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

export { TRANSPARENT_GIF }

/** Ignore duplicate open pings (Gmail prefetch + real view, or pixel + click). */
const OPEN_DEBOUNCE_MS = 3 * 60 * 1000

const activeSends = new Set()

function trackingApiBase() {
  // Always use the resolved public API origin (production defaults to Vercel).
  return `${apiPublicBase()}/api/email`
}

export function rewriteLinksForTracking(html, clickBase, trackingId, bookingUrl = '') {
  if (!html || !trackingId) return html
  const booking = String(bookingUrl || '').trim()
  return html.replace(
    /href=(["'])(https?:\/\/[^"']+)\1/gi,
    (_m, quote, url) => {
      // Calendar booking CTAs use a stable /meeting path (no ?u=).
      // The redirect always resolves the live workspace booking URL so
      // stale, truncated, or admin Calendar links in old emails stop breaking bookings.
      if (
        (booking && (url === booking || isBookingUrl(url))) ||
        isCalendarBookingIntent(url)
      ) {
        return `href=${quote}${clickBase}/${trackingId}/meeting${quote}`
      }
      return `href=${quote}${clickBase}/${trackingId}?u=${encodeURIComponent(url)}${quote}`
    },
  )
}

/**
 * Resolve where a tracked click should land. Calendar intents always use the
 * live workspace booking URL (fixes broken Google Appointment pages).
 */
export async function resolveTrackedClickDestination(trackingId, requestedUrl = '') {
  const requested = String(requestedUrl || '').trim()
  let workspaceId = ''
  let override = ''
  try {
    const recipient = await EmailRecipient.findOne({ trackingId })
      .select('workspaceId meetingLink mergeData')
      .lean()
    if (recipient) {
      workspaceId = recipient.workspaceId || ''
      override =
        recipient.meetingLink ||
        recipient.mergeData?.meetingLink ||
        ''
    }
  } catch {
    /* fall through to defaults */
  }

  const live = await resolveLiveBookingUrl(workspaceId, override)

  // Missing target, or any calendar/admin booking intent → live public booking page
  if (!requested || isCalendarBookingIntent(requested) || !/^https?:\/\//i.test(requested)) {
    return live
  }
  return requested
}

function pushLeadWriteback(recipient, campaign, patch) {
  const sourceId = recipient.leadSourceId || campaign.leadSourceId
  if (!sourceId) return
  enqueueLeadStatusUpdate(sourceId, {
    sheetName: recipient.sheetName || recipient.mergeData?.sheetName || '',
    email: recipient.email,
    rowNumber: recipient.rowNumber || recipient.mergeData?.rowNumber,
    campaign: campaign.name || campaign.subject,
    ...patch,
  })
}

export async function recordEmailClick(trackingId, clickedUrl = '') {
  const recipient = await EmailRecipient.findOne({ trackingId })
  if (!recipient) return null

  const wasFirstClick = !recipient.clickedAt
  const wasFirstOpen = !recipient.openedAt
  recipient.clickCount = (recipient.clickCount || 0) + 1
  if (wasFirstClick) recipient.clickedAt = new Date()
  if (wasFirstOpen) {
    // Infer open from click — do not bump openCount again if pixel also fires
    recipient.openedAt = new Date()
    recipient.lastOpenedAt = recipient.openedAt
    if (!recipient.openCount) recipient.openCount = 1
    if (!recipient.nudgeEngagedAt) recipient.nudgeEngagedAt = recipient.openedAt
    if (!recipient.nudgeStatusSnapshot) {
      recipient.nudgeStatusSnapshot = recipient.meetingStatus || 'none'
    }
  } else {
    recipient.lastOpenedAt = new Date()
  }
  recipient.status = 'clicked'
  if (clickedUrl) recipient.lastClickedUrl = String(clickedUrl).slice(0, 2000)

  const url = String(clickedUrl || '')
  const clickKind = classifyClickUrl(url, recipient)
  appendClickEvent(recipient, url, clickKind)

  const isMeetingClick = clickKind === 'calendar'

  if (isMeetingClick) {
    if (recipient.meetingStatus === 'none' || recipient.meetingStatus === 'invited') {
      recipient.meetingStatus = 'link_clicked'
    }
    if (!recipient.meetingClickedAt) recipient.meetingClickedAt = new Date()
    if (!recipient.meetingLink && url) recipient.meetingLink = url
    if (!recipient.nudgeEngagedAt) {
      recipient.nudgeEngagedAt = recipient.meetingClickedAt || new Date()
    }
    if (!recipient.nudgeStatusSnapshot) {
      recipient.nudgeStatusSnapshot = recipient.meetingStatus || 'link_clicked'
    }

    await recipient.save()
    // Admin Gmail: booked meetings only (no link-click noise). SSE still fires below.
  } else {
    await recipient.save()
  }

  const campaign = await EmailCampaign.findById(recipient.campaignId)
  if (wasFirstOpen && campaign) {
    await EmailCampaign.updateOne(
      { _id: recipient.campaignId },
      { $inc: { 'stats.opened': 1 } },
    )
    broadcastEvent('EMAIL_OPENED', {
      workspaceId: campaign.workspaceId,
      campaignId: campaign._id.toString(),
      email: recipient.email,
    })
  }
  if (wasFirstClick && campaign) {
    await EmailCampaign.updateOne(
      { _id: recipient.campaignId },
      { $inc: { 'stats.clicked': 1 } },
    )
    broadcastEvent('EMAIL_CLICKED', {
      workspaceId: campaign.workspaceId,
      campaignId: campaign._id.toString(),
      email: recipient.email,
    })
  }

  if (campaign) {
    pushLeadWriteback(recipient, campaign, {
      status: isMeetingClick ? 'meeting_clicked' : 'clicked',
      opens: recipient.openCount,
      lastOpened: (recipient.lastOpenedAt || recipient.openedAt)?.toISOString?.() || '',
      clicks: recipient.clickCount,
    })
  }

  if (isMeetingClick) {
    broadcastEvent('EMAIL_MEETING_CLICK', {
      workspaceId: recipient.workspaceId,
      campaignId: recipient.campaignId?.toString?.(),
      email: recipient.email,
    })
  }

  return recipient
}

export async function recordEmailOpen(trackingId) {
  const recipient = await EmailRecipient.findOne({ trackingId })
  if (!recipient) return null

  const now = Date.now()
  const last = recipient.lastOpenedAt ? new Date(recipient.lastOpenedAt).getTime() : 0
  if (last && now - last < OPEN_DEBOUNCE_MS) {
    // Duplicate ping within debounce window (prefetch / double-fetch) — ignore
    return recipient
  }

  const wasFirst = !recipient.openedAt
  recipient.openCount = (recipient.openCount || 0) + 1
  recipient.lastOpenedAt = new Date()
  if (wasFirst) {
    recipient.openedAt = recipient.lastOpenedAt
    if (recipient.status === 'sent') recipient.status = 'opened'
    if (!recipient.nudgeEngagedAt) recipient.nudgeEngagedAt = recipient.openedAt
    if (!recipient.nudgeStatusSnapshot) {
      recipient.nudgeStatusSnapshot = recipient.meetingStatus || 'none'
    }
  }
  await recipient.save()

  const campaign = await EmailCampaign.findById(recipient.campaignId)
  if (wasFirst && campaign) {
    await EmailCampaign.updateOne(
      { _id: recipient.campaignId },
      { $inc: { 'stats.opened': 1 } },
    )
    broadcastEvent('EMAIL_OPENED', {
      workspaceId: campaign.workspaceId,
      campaignId: campaign._id.toString(),
      email: recipient.email,
    })
  }

  if (campaign) {
    pushLeadWriteback(recipient, campaign, {
      status: recipient.status === 'clicked' ? 'clicked' : 'opened',
      opens: recipient.openCount,
      lastOpened: recipient.lastOpenedAt?.toISOString?.() || '',
      clicks: recipient.clickCount || 0,
    })
  }

  return recipient
}

async function countSentLast24h(workspaceId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return EmailRecipient.countDocuments({
    workspaceId,
    status: { $in: ['sent', 'opened', 'clicked'] },
    sentAt: { $gte: since },
  })
}

/** When the oldest send in the rolling 24h window ages out (frees 1 daily-cap slot). */
async function estimateDailyCapResetAt(workspaceId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const oldest = await EmailRecipient.findOne({
    workspaceId,
    status: { $in: ['sent', 'opened', 'clicked'] },
    sentAt: { $gte: since },
  })
    .sort({ sentAt: 1 })
    .select('sentAt')
    .lean()
  if (oldest?.sentAt) {
    return new Date(new Date(oldest.sentAt).getTime() + 24 * 60 * 60 * 1000 + 60_000)
  }
  return new Date(Date.now() + 60 * 60 * 1000)
}

const DAILY_CAP_ERROR_RE = /Daily cap of \d+ emails reached/i


const INTER_EMAIL_MAX_MS = 8_000
/** Soft cap so serverless invocations exit cleanly; scheduler resumes. */
const WORKER_MAX_MS = Number(process.env.EMAIL_WORKER_MAX_MS || 50_000)

/** Random 0–30s gap between individual emails. */
function interEmailGapMs() {
  return Math.floor(Math.random() * (INTER_EMAIL_MAX_MS + 1))
}

/** How many emails before the long rest (15–20). */
function restEveryN(campaign) {
  const n = Number(campaign?.batchSize)
  if (Number.isFinite(n) && n > 0) return Math.min(20, Math.max(15, Math.round(n)))
  return 18
}

/** Long rest duration after each batch (default 8 min). */
function batchRestMs(campaign) {
  const ms = Number(campaign?.cooldownMs)
  if (Number.isFinite(ms) && ms > 0) return Math.min(Math.max(ms, 60_000), 60 * 60 * 1000)
  return 8 * 60 * 1000
}

/** @deprecated kept for callers; long rest only — not per-email. */
function effectiveCooldownMs(campaign) {
  return batchRestMs(campaign)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Resume bulk campaigns left in `sending` (after batch rest or serverless timeout).
 * Called from the 30s scheduler / cron tick.
 */
export async function resumeSendingCampaigns() {
  const now = new Date()
  const campaigns = await EmailCampaign.find({
    status: 'sending',
    $or: [{ nextSendAt: null }, { nextSendAt: { $exists: false } }, { nextSendAt: { $lte: now } }],
  })
    .select('_id workspaceId nextSendAt')
    .limit(12)
    .lean()

  let resumed = 0
  for (const c of campaigns) {
    const id = String(c._id)
    if (activeSends.has(id)) continue
    const queued = await EmailRecipient.countDocuments({
      campaignId: c._id,
      status: 'queued',
    })
    if (queued <= 0) continue
    resumed += 1
    runCampaignSend(c._id, c.workspaceId).catch((err) => {
      logger.warn('Resume campaign send failed', { campaignId: id, error: err.message })
    })
  }
  return { resumed }
}

/**
 * Kick any campaign that still has a queue but is stuck paused/failed (not cancelled).
 * Used when users see thousands queued and only a handful processed.
 */
export async function kickQueuedCampaigns() {
  const stuck = await EmailCampaign.find({
    status: { $in: ['paused', 'failed', 'sending'] },
  })
    .select('_id workspaceId status dailyCap error nextSendAt')
    .limit(20)
    .lean()

  let kicked = 0
  for (const c of stuck) {
    const id = String(c._id)
    if (activeSends.has(id)) continue
    const queued = await EmailRecipient.countDocuments({
      campaignId: c._id,
      status: 'queued',
    })
    if (queued <= 0) continue

    if (c.status === 'paused' || c.status === 'failed') {
      const cap = Math.max(1, c.dailyCap || 200)
      const sent24h = await countSentLast24h(c.workspaceId)
      if (sent24h >= cap && DAILY_CAP_ERROR_RE.test(String(c.error || ''))) {
        continue
      }
      await EmailCampaign.updateOne(
        { _id: c._id },
        {
          $set: { status: 'sending', nextSendAt: null },
          $unset: { error: 1, pausedAt: 1 },
        },
      )
    } else if (c.nextSendAt && new Date(c.nextSendAt).getTime() > Date.now() + 60_000) {
      // Don't interrupt a deliberate long batch rest unless it's been > 20 min overdue intent
      const restMs = 20 * 60 * 1000
      if (new Date(c.nextSendAt).getTime() - Date.now() < restMs) continue
    }

    kicked += 1
    runCampaignSend(c._id, c.workspaceId).catch((err) => {
      logger.warn('Kick queued campaign failed', { campaignId: id, error: err.message })
    })
  }
  if (kicked) logger.info('Kicked queued campaigns', { kicked })
  return { kicked }
}

/**
 * Auto-resume campaigns paused only because the rolling 24h daily cap was hit.
 * Previously they stayed paused forever even after the window rolled forward.
 */
export async function resumeDailyCapPausedCampaigns() {
  const now = new Date()
  const paused = await EmailCampaign.find({
    status: 'paused',
    error: DAILY_CAP_ERROR_RE,
  })
    .limit(12)
    .lean()

  let resumed = 0
  for (const c of paused) {
    const id = String(c._id)
    if (activeSends.has(id)) continue
    const cap = Math.max(1, c.dailyCap || 200)
    const sent24h = await countSentLast24h(c.workspaceId)
    if (sent24h >= cap) {
      const resetAt = await estimateDailyCapResetAt(c.workspaceId)
      if (!c.nextSendAt || new Date(c.nextSendAt).getTime() > resetAt.getTime() + 60_000) {
        await EmailCampaign.updateOne(
          { _id: c._id },
          { $set: { nextSendAt: resetAt } },
        )
      }
      continue
    }
    await EmailCampaign.updateOne(
      { _id: c._id },
      {
        $set: { status: 'sending', nextSendAt: null },
        $unset: { error: 1, pausedAt: 1 },
      },
    )
    resumed += 1
    runCampaignSend(c._id, c.workspaceId).catch((err) => {
      logger.warn('Daily-cap auto-resume failed', { campaignId: id, error: err.message })
    })
  }

  // Also pick up paused campaigns whose nextSendAt (cap reset) has elapsed
  const due = await EmailCampaign.find({
    status: 'paused',
    nextSendAt: { $lte: now },
    error: DAILY_CAP_ERROR_RE,
  })
    .limit(8)
    .lean()

  for (const c of due) {
    const id = String(c._id)
    if (activeSends.has(id)) continue
    const cap = Math.max(1, c.dailyCap || 200)
    const sent24h = await countSentLast24h(c.workspaceId)
    if (sent24h >= cap) continue
    await EmailCampaign.updateOne(
      { _id: c._id },
      {
        $set: { status: 'sending', nextSendAt: null },
        $unset: { error: 1, pausedAt: 1 },
      },
    )
    resumed += 1
    runCampaignSend(c._id, c.workspaceId).catch((err) => {
      logger.warn('Daily-cap scheduled resume failed', { campaignId: id, error: err.message })
    })
  }

  if (resumed) logger.info('Daily-cap campaigns auto-resumed', { resumed })
  return { resumed }
}

/**
 * Hard reset: clear pause/cap errors and start sending again.
 * @param {{ fromBeginning?: boolean }} [opts]
 *   fromBeginning=true → re-queue EVERY recipient (including already sent) and zero stats.
 */
export async function resetCampaignSend(campaignId, workspaceId, opts = {}) {
  const fromBeginning = Boolean(opts.fromBeginning)
  const campaign = await EmailCampaign.findOne({ _id: campaignId, workspaceId })
  if (!campaign) throw new Error('Campaign not found')

  if (fromBeginning) {
    await EmailRecipient.updateMany(
      { campaignId: campaign._id },
      {
        $set: {
          status: 'queued',
          openCount: 0,
          clickCount: 0,
          mailboxFolder: 'inbox',
          meetingStatus: 'none',
          nudgeAutoStage: '',
          nudgeAutoStopped: false,
          lastNudgeType: '',
          lastClickKind: '',
        },
        $unset: {
          error: 1,
          sentAt: 1,
          openedAt: 1,
          lastOpenedAt: 1,
          clickedAt: 1,
          lastClickedUrl: 1,
          clickEvents: 1,
          meetingClickedAt: 1,
          meetingScheduledAt: 1,
          meetingLink: 1,
          meetingTimeZone: 1,
          meetingNotes: 1,
          calendarEventId: 1,
          meetingReminderSentAt: 1,
          meetingConfirmSentAt: 1,
          lastNudgeAt: 1,
          nudgeEngagedAt: 1,
          nudgeStatusSnapshot: 1,
          gmailMessageId: 1,
          renderedSubject: 1,
          renderedText: 1,
          renderedHtml: 1,
        },
      },
    )
    campaign.stats = {
      total: campaign.stats?.total || 0,
      sent: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
    }
    campaign.startedAt = new Date()
  } else {
    await EmailRecipient.updateMany(
      {
        campaignId: campaign._id,
        status: { $in: ['failed', 'cancelled', 'sending'] },
      },
      { $set: { status: 'queued' }, $unset: { error: 1 } },
    )
  }

  const total = await EmailRecipient.countDocuments({ campaignId: campaign._id })
  if (!campaign.stats?.total || fromBeginning) {
    campaign.stats = { ...(campaign.stats || {}), total }
  }

  const queued = await EmailRecipient.countDocuments({
    campaignId: campaign._id,
    status: 'queued',
  })
  if (queued === 0) {
    campaign.status = 'completed'
    campaign.completedAt = new Date()
    campaign.error = undefined
    campaign.pausedAt = undefined
    campaign.nextSendAt = null
    await campaign.save()
    return { campaign, queued: 0, sending: false, fromBeginning }
  }

  campaign.status = 'sending'
  campaign.pausedAt = undefined
  campaign.error = undefined
  campaign.nextSendAt = null
  campaign.completedAt = undefined
  if (!campaign.startedAt) campaign.startedAt = new Date()
  await campaign.save()

  setImmediate(() => {
    runCampaignSend(campaign._id, workspaceId).catch((err) => {
      logger.warn('Reset campaign send failed', {
        campaignId: String(campaignId),
        error: err.message,
      })
    })
  })

  return { campaign, queued, sending: true, fromBeginning }
}

export async function runCampaignSend(campaignId, workspaceId) {
  const key = String(campaignId)
  if (activeSends.has(key)) return
  activeSends.add(key)
  const invocationStarted = Date.now()

  try {
    const campaign = await EmailCampaign.findOne({ _id: campaignId, workspaceId })
    if (!campaign) return
    if (campaign.status === 'paused' || campaign.status === 'cancelled') return

    if (campaign.nextSendAt && Date.now() < new Date(campaign.nextSendAt).getTime()) {
      logger.info('Email campaign waiting on batch rest', {
        campaignId: key,
        nextSendAt: campaign.nextSendAt,
      })
      return
    }

    campaign.status = 'sending'
    if (!campaign.startedAt) campaign.startedAt = new Date()
    if (campaign.nextSendAt) campaign.nextSendAt = null
    await campaign.save()

    let accessToken = null
    let from =
      campaign.fromEmail ||
      process.env.FROM_EMAIL?.trim() ||
      process.env.SMTP_EMAIL?.trim() ||
      ''

    try {
      const gmailAuth = await getGmailAccessToken(workspaceId)
      accessToken = gmailAuth.accessToken
      from = campaign.fromEmail || gmailAuth.fromEmail || from
    } catch {
      if (!isMailerConfigured()) {
        throw new Error(
          'No mail transport ready. Connect Gmail OAuth or set SMTP_HOST / SMTP_EMAIL / SMTP_PASSWORD in api .env.',
        )
      }
    }
    if (!from) throw new Error('No sender email configured.')

    const useSmtp = !accessToken && isMailerConfigured()
    const workspaceConfig = await getWorkspaceConfig(workspaceId)
    const workspaceBooking = getCalendarBookingUrl(workspaceConfig)
    const restMs = batchRestMs(campaign)
    const everyN = restEveryN(campaign)
    const dailyCap = Math.max(1, campaign.dailyCap || 200)
    const apiBase = trackingApiBase()

    logger.info('Email campaign sending', {
      campaignId: key,
      interEmailMaxMs: INTER_EMAIL_MAX_MS,
      restEvery: everyN,
      batchRestMs: restMs,
      dailyCap,
      transport: useSmtp ? 'smtp' : 'gmail',
    })

    // Send with 0–30s gaps; long rest every N emails (exit + scheduler resume)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const fresh = await EmailCampaign.findById(campaignId)
      if (!fresh || fresh.status === 'paused' || fresh.status === 'cancelled') {
        logger.info('Email campaign stopped', { campaignId: key, status: fresh?.status })
        return
      }

      if (fresh.nextSendAt && Date.now() < new Date(fresh.nextSendAt).getTime()) {
        return
      }

      const sent24h = await countSentLast24h(workspaceId)
      if (sent24h >= dailyCap) {
        const resetAt = await estimateDailyCapResetAt(workspaceId)
        fresh.status = 'paused'
        fresh.pausedAt = new Date()
        fresh.nextSendAt = resetAt
        fresh.error = `Daily cap of ${dailyCap} emails reached. Auto-resumes after ${resetAt.toISOString()} (rolling 24h window).`
        await fresh.save()
        broadcastEvent('EMAIL_CAMPAIGN_PAUSED', {
          workspaceId,
          campaignId: key,
          reason: 'daily_cap',
          resumeAt: resetAt.toISOString(),
        })
        logger.info('Email campaign paused on daily cap', {
          campaignId: key,
          sent24h,
          dailyCap,
          resumeAt: resetAt.toISOString(),
        })
        return
      }

      const recipient = await EmailRecipient.findOne({
        campaignId,
        status: 'queued',
      }).sort({ _id: 1 })

      if (!recipient) break

      try {
        recipient.status = 'sending'
        await recipient.save()

        const rawMeeting =
          recipient.mergeData?.meetingLink ||
          recipient.meetingLink ||
          campaign.meetingLink ||
          workspaceBooking
        const meetingLink = isBookingUrl(rawMeeting)
          ? String(rawMeeting).trim()
          : getCalendarBookingUrl(workspaceBooking)

        const name =
          String(recipient.name || recipient.mergeData?.name || '').trim()
        const firstName =
          String(recipient.mergeData?.firstName || '').trim() ||
          name.split(/\s+/).filter(Boolean)[0] ||
          ''
        const greeting = firstName
          ? `Hi ${firstName}`
          : name
            ? `Hi ${name}`
            : 'Hi there'

        const data = {
          ...recipient.mergeData,
          email: recipient.email,
          name: name || recipient.mergeData?.name || '',
          firstName,
          greeting,
          meetingLink,
          nichePain:
            recipient.mergeData?.nichePain ||
            buildNichePain({
              industry: recipient.mergeData?.industry || recipient.niche || '',
              niche: recipient.niche || recipient.mergeData?.niche || '',
              company: recipient.company || recipient.mergeData?.company || '',
              city: recipient.mergeData?.city || '',
              country: recipient.mergeData?.country || '',
            }),
          nichePainShort:
            recipient.mergeData?.nichePainShort ||
            buildNichePainShort({
              industry: recipient.mergeData?.industry || recipient.niche || '',
            }),
          nicheLabel:
            recipient.mergeData?.nicheLabel ||
            recipient.niche ||
            recipient.mergeData?.industry ||
            'your industry',
        }

        const pool = campaign.templates?.length
          ? campaign.templates
          : [
              {
                subject: campaign.subject,
                textBody: campaign.textBody,
                htmlBody: campaign.htmlBody,
              },
            ]
        const tpl = pool[Math.floor(Math.random() * pool.length)]
        const subject = sanitizePublishedText(mergeTemplate(tpl.subject, data))
        let text = sanitizePublishedText(mergeTemplate(tpl.textBody, data))
        let html =
          sanitizePublishedText(mergeTemplate(tpl.htmlBody || '', data)) ||
          text.replace(/\n/g, '<br>\n')

        // Absolute last line of defense: Schedule CTAs always open the calendar booking URL.
        text = forceScheduleMeetingText(text, meetingLink)
        html = forceScheduleMeetingHrefs(html, meetingLink)

        recipient.renderedSubject = subject
        recipient.renderedText = text
        recipient.renderedHtml = html

        let outHtml = html
        if (campaign.trackOpens && recipient.trackingId) {
          outHtml = rewriteLinksForTracking(
            outHtml,
            `${apiBase}/click`,
            recipient.trackingId,
            meetingLink,
          )
          outHtml = injectTrackingPixel(outHtml, `${apiBase}/open/${recipient.trackingId}.gif`)
        }

        const result = useSmtp
          ? await sendMail({
              to: recipient.name
                ? `"${recipient.name}" <${recipient.email}>`
                : recipient.email,
              subject,
              text,
              html: outHtml,
            })
          : await sendGmailMessage({
              accessToken,
              from,
              to: recipient.name
                ? `"${recipient.name}" <${recipient.email}>`
                : recipient.email,
              subject,
              text,
              html: outHtml,
            })

        recipient.status = 'sent'
        recipient.gmailMessageId = result.messageId
        recipient.sentAt = new Date()
        recipient.error = undefined
        await recipient.save()

        await EmailCampaign.updateOne({ _id: campaignId }, { $inc: { 'stats.sent': 1 } })

        pushLeadWriteback(recipient, campaign, {
          status: 'sent',
          sentAt: recipient.sentAt.toISOString(),
          opens: 0,
          clicks: 0,
          appendUpdate: true,
        })

        logger.success('Email sent', {
          to: recipient.email,
          subject: subject.slice(0, 48),
        })
      } catch (err) {
        recipient.status = 'failed'
        recipient.error = err.message
        await recipient.save()
        await EmailCampaign.updateOne({ _id: campaignId }, { $inc: { 'stats.failed': 1 } })
        logger.error('Email failed', { to: recipient.email, error: err.message })
      }

      const stillQueued = await EmailRecipient.countDocuments({ campaignId, status: 'queued' })
      if (stillQueued <= 0) break

      const after = await EmailCampaign.findById(campaignId).select('sendsSinceBreak batchSize cooldownMs status')
      if (!after || after.status !== 'sending') return

      const sendsSince = (after.sendsSinceBreak || 0) + 1
      const every = restEveryN(after)

      if (sendsSince >= every) {
        const pauseUntil = new Date(Date.now() + batchRestMs(after))
        after.sendsSinceBreak = 0
        after.nextSendAt = pauseUntil
        await after.save()
        logger.info('Email campaign batch rest', {
          campaignId: key,
          restEvery: every,
          nextSendAt: pauseUntil,
        })
        // Exit — scheduler/cron resumes after nextSendAt (no 8‑min sleep in-process)
        return
      }

      after.sendsSinceBreak = sendsSince
      after.nextSendAt = null
      await after.save()

      const gap = interEmailGapMs()
      if (Date.now() - invocationStarted + gap > WORKER_MAX_MS) {
        // Yield quickly so the next cron tick continues the queue (don't look "stuck").
        after.nextSendAt = new Date(Date.now() + 2_000)
        await after.save()
        logger.info('Email campaign yielding (time budget)', {
          campaignId: key,
          sentInBurst: sendsSince,
          nextSendAt: after.nextSendAt,
        })
        return
      }
      await sleep(gap)
    }

    const updated = await EmailCampaign.findById(campaignId)
    if (updated && updated.status === 'sending') {
      const failed = updated.stats.failed
      updated.status = failed > 0 && updated.stats.sent === 0 ? 'failed' : 'completed'
      updated.completedAt = new Date()
      updated.error = undefined
      updated.nextSendAt = null
      updated.sendsSinceBreak = 0
      await updated.save()

      logger.success('Email campaign finished', {
        campaignId: key,
        sent: updated.stats.sent,
        failed: updated.stats.failed,
      })

      broadcastEvent('EMAIL_CAMPAIGN_DONE', {
        workspaceId,
        campaignId: key,
        stats: updated.stats,
      })
    }
  } catch (err) {
    logger.error('Email campaign aborted', {
      campaignId: key,
      error: err.message,
    })
    await EmailCampaign.updateOne(
      { _id: campaignId },
      {
        $set: {
          status: 'failed',
          error: err.message,
          completedAt: new Date(),
        },
      },
    )
    broadcastEvent('EMAIL_CAMPAIGN_FAILED', {
      workspaceId,
      campaignId: key,
      error: err.message,
    })
  } finally {
    activeSends.delete(key)
  }
}

export function newTrackingId() {
  return crypto.randomBytes(16).toString('hex')
}

export { countSentLast24h, effectiveCooldownMs }
