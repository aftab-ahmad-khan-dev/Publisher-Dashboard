import crypto from 'crypto'
import { EmailCampaign } from '../models/EmailCampaign.js'
import { EmailRecipient } from '../models/EmailRecipient.js'
import { getGmailAccessToken } from './gmailOAuth.js'
import { sendGmailMessage, injectTrackingPixel } from './gmailSend.js'
import { mergeTemplate } from './emailMerge.js'
import { sanitizePublishedText } from './contentSanitize.js'
import { broadcastEvent } from './events.js'
import { logger } from './logger.js'
import { apiPublicBase } from './publicUrl.js'

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

export { TRANSPARENT_GIF }

function trackingBaseUrl() {
  const api =
    apiPublicBase() || process.env.WEB_URL?.replace('5173', '3001')?.trim()?.replace(/\/+$/, '')
  return `${api || 'http://localhost:3001'}/api/email/open`
}

export async function recordEmailOpen(trackingId) {
  const recipient = await EmailRecipient.findOne({ trackingId })
  if (!recipient) return null

  const wasFirst = !recipient.openedAt
  recipient.openCount = (recipient.openCount || 0) + 1
  if (wasFirst) {
    recipient.openedAt = new Date()
    recipient.status = 'opened'
  }
  await recipient.save()

  if (wasFirst) {
    await EmailCampaign.updateOne(
      { _id: recipient.campaignId },
      { $inc: { 'stats.opened': 1 } },
    )
    const campaign = await EmailCampaign.findById(recipient.campaignId).lean()
    if (campaign) {
      broadcastEvent('EMAIL_OPENED', {
        workspaceId: campaign.workspaceId,
        campaignId: campaign._id.toString(),
        email: recipient.email,
      })
    }
  }

  return recipient
}

export async function runCampaignSend(campaignId, workspaceId) {
  const campaign = await EmailCampaign.findOne({ _id: campaignId, workspaceId })
  if (!campaign) return

  try {
    const { accessToken, fromEmail } = await getGmailAccessToken(workspaceId)
    const from = campaign.fromEmail || fromEmail
    if (!from) throw new Error('No sender email configured.')

    const recipients = await EmailRecipient.find({ campaignId, status: 'queued' }).sort({ _id: 1 })
    const batchSize = Math.min(Math.max(campaign.batchSize || 25, 1), 50)
    const delayMs = Math.max(campaign.batchDelayMs || 3000, 1000)
    const trackBase = trackingBaseUrl()

    logger.info('Email campaign sending', {
      campaignId: campaignId.toString(),
      recipients: recipients.length,
      batchSize,
    })

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      for (const recipient of batch) {
        try {
          recipient.status = 'sending'
          await recipient.save()

          const data = { ...recipient.mergeData, email: recipient.email, name: recipient.name }
          // When a template pool exists, each recipient gets a random template.
          const pool = campaign.templates?.length
            ? campaign.templates
            : [{ subject: campaign.subject, textBody: campaign.textBody, htmlBody: campaign.htmlBody }]
          const tpl = pool[Math.floor(Math.random() * pool.length)]
          const subject = sanitizePublishedText(mergeTemplate(tpl.subject, data))
          const text = sanitizePublishedText(mergeTemplate(tpl.textBody, data))
          let html =
            sanitizePublishedText(mergeTemplate(tpl.htmlBody, data)) ||
            text.replace(/\n/g, '<br>\n')

          if (campaign.trackOpens && recipient.trackingId) {
            const trackUrl = `${trackBase}/${recipient.trackingId}.gif`
            html = injectTrackingPixel(html, trackUrl)
          }

          const result = await sendGmailMessage({
            accessToken,
            from,
            to: recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email,
            subject,
            text,
            html,
          })

          recipient.status = 'sent'
          recipient.gmailMessageId = result.messageId
          recipient.sentAt = new Date()
          recipient.error = undefined
          await recipient.save()

          await EmailCampaign.updateOne({ _id: campaignId }, { $inc: { 'stats.sent': 1 } })
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
      }

      if (i + batchSize < recipients.length) {
        logger.debug('Email batch pause', { delayMs })
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }

    const updated = await EmailCampaign.findById(campaignId)
    const failed = updated.stats.failed
    updated.status = failed > 0 && updated.stats.sent === 0 ? 'failed' : 'completed'
    updated.completedAt = new Date()
    await updated.save()

    logger.success('Email campaign finished', {
      campaignId: campaignId.toString(),
      sent: updated.stats.sent,
      failed: updated.stats.failed,
    })

    broadcastEvent('EMAIL_CAMPAIGN_DONE', {
      workspaceId,
      campaignId: campaignId.toString(),
      stats: updated.stats,
    })
  } catch (err) {
    logger.error('Email campaign aborted', {
      campaignId: campaignId.toString(),
      error: err.message,
    })
    campaign.status = 'failed'
    campaign.error = err.message
    campaign.completedAt = new Date()
    await campaign.save()
    broadcastEvent('EMAIL_CAMPAIGN_FAILED', {
      workspaceId,
      campaignId: campaignId.toString(),
      error: err.message,
    })
  }
}

export function newTrackingId() {
  return crypto.randomBytes(16).toString('hex')
}
