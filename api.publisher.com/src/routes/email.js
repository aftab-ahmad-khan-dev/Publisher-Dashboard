import { Router } from 'express'
import { EmailCampaign } from '../models/EmailCampaign.js'
import { EmailRecipient } from '../models/EmailRecipient.js'
import { EmailTemplateDraft } from '../models/EmailTemplateDraft.js'
import { parseRecipients } from '../lib/emailMerge.js'
import { sanitizePublishedText } from '../lib/contentSanitize.js'
import { runCampaignSend, newTrackingId } from '../lib/emailWorker.js'
import {
  getWorkspaceConfig,
  saveGmailConfig,
  toClientConfig,
  stripPlaceholderSecrets,
} from '../lib/configStore.js'
import { refreshGmailTokenIfNeeded } from '../lib/gmailOAuth.js'
import { getGmailAccessToken } from '../lib/gmailOAuth.js'
import { testGmailConnection } from '../lib/gmailSend.js'
import { canSendGmail } from '../lib/platforms.js'

const router = Router()

function mapCampaign(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    subject: doc.subject,
    status: doc.status,
    trackOpens: doc.trackOpens,
    stats: doc.stats,
    fromEmail: doc.fromEmail,
    error: doc.error,
    startedAt: doc.startedAt?.toISOString?.() || doc.startedAt,
    completedAt: doc.completedAt?.toISOString?.() || doc.completedAt,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
  }
}

function mapRecipient(doc) {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    company: doc.company,
    niche: doc.niche,
    status: doc.status,
    error: doc.error,
    sentAt: doc.sentAt?.toISOString?.() || doc.sentAt,
    openedAt: doc.openedAt?.toISOString?.() || doc.openedAt,
    openCount: doc.openCount || 0,
    gmailMessageId: doc.gmailMessageId,
  }
}

router.post('/email/parse-recipients', (req, res) => {
  const recipients = parseRecipients(req.body?.raw || '')
  res.json({ ok: true, count: recipients.length, recipients })
})

router.put('/config/gmail', async (req, res, next) => {
  try {
    const gmail = stripPlaceholderSecrets(req.body?.gmail || req.body)
    const config = await saveGmailConfig(req.workspaceId, gmail)
    res.json({ ok: true, config: toClientConfig(config) })
  } catch (err) {
    next(err)
  }
})

router.post('/connections/gmail/test', async (req, res, next) => {
  try {
    if (req.body?.gmail) {
      await saveGmailConfig(req.workspaceId, req.body.gmail)
    }
    await refreshGmailTokenIfNeeded(req.workspaceId)
    const { accessToken } = await getGmailAccessToken(req.workspaceId)
    const result = await testGmailConnection(null, accessToken)
    if (!result.ok) return res.status(400).json(result)
    res.json({ ...result, saved: true })
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message })
  }
})

router.get('/email/campaigns', async (req, res, next) => {
  try {
    const campaigns = await EmailCampaign.find({ workspaceId: req.workspaceId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    res.json({ ok: true, campaigns: campaigns.map(mapCampaign) })
  } catch (err) {
    next(err)
  }
})

router.get('/email/campaigns/:id', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    }).lean()
    if (!campaign) return res.status(404).json({ ok: false, error: 'Campaign not found' })

    const recipients = await EmailRecipient.find({ campaignId: campaign._id })
      .sort({ createdAt: 1 })
      .lean()

    res.json({
      ok: true,
      campaign: {
        ...mapCampaign(campaign),
        htmlBody: campaign.htmlBody,
        textBody: campaign.textBody,
        batchSize: campaign.batchSize,
        batchDelayMs: campaign.batchDelayMs,
      },
      recipients: recipients.map(mapRecipient),
    })
  } catch (err) {
    next(err)
  }
})

router.post('/email/campaigns', async (req, res, next) => {
  try {
    const {
      name,
      subject,
      htmlBody,
      textBody,
      templates: templateList,
      recipientsRaw,
      recipients: recipientList,
      trackOpens,
      batchSize,
      batchDelayMs,
      sendNow,
    } = req.body || {}

    if (!subject?.trim()) {
      return res.status(400).json({ ok: false, error: 'Subject is required.' })
    }

    const parsed = recipientList?.length
      ? recipientList
      : parseRecipients(recipientsRaw || '')

    if (!parsed.length) {
      return res.status(400).json({ ok: false, error: 'Add at least one recipient.' })
    }

    const config = await getWorkspaceConfig(req.workspaceId)
    if (!canSendGmail(config.gmail)) {
      return res.status(400).json({
        ok: false,
        error: 'Gmail is not connected. Add OAuth credentials and connect Gmail in API Config.',
      })
    }

    const cleanSubject = sanitizePublishedText(subject.trim())
    const cleanTextBody = sanitizePublishedText(textBody || '')
    const cleanHtmlBody = sanitizePublishedText(htmlBody || '')

    const cleanTemplates = Array.isArray(templateList)
      ? templateList
          .filter((t) => t?.subject?.trim())
          .map((t) => ({
            subject: sanitizePublishedText(t.subject.trim()),
            textBody: sanitizePublishedText(t.textBody || ''),
            htmlBody: sanitizePublishedText(t.htmlBody || ''),
          }))
      : []

    const campaign = await EmailCampaign.create({
      workspaceId: req.workspaceId,
      name: name?.trim() || cleanSubject.slice(0, 48),
      subject: cleanSubject,
      htmlBody: cleanHtmlBody,
      textBody: cleanTextBody,
      templates: cleanTemplates,
      fromEmail: config.gmail.fromEmail,
      trackOpens: trackOpens !== false,
      batchSize: batchSize || 25,
      batchDelayMs: batchDelayMs || 3000,
      status: sendNow ? 'sending' : 'draft',
      stats: { total: parsed.length, sent: 0, failed: 0, opened: 0 },
      startedAt: sendNow ? new Date() : undefined,
    })

    await EmailRecipient.insertMany(
      parsed.map((r) => ({
        workspaceId: req.workspaceId,
        campaignId: campaign._id,
        email: r.email,
        name: r.name,
        company: r.company || r.mergeData?.company || '',
        niche: r.niche || r.mergeData?.niche || '',
        mergeData: r.mergeData,
        status: 'queued',
        trackingId: newTrackingId(),
      })),
    )

    if (sendNow) {
      setImmediate(() => runCampaignSend(campaign._id, req.workspaceId))
    }

    res.json({
      ok: true,
      campaign: mapCampaign(campaign.toObject()),
      recipientCount: parsed.length,
      sending: Boolean(sendNow),
    })
  } catch (err) {
    next(err)
  }
})

router.post('/email/campaigns/:id/send', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!campaign) return res.status(404).json({ ok: false, error: 'Campaign not found' })
    if (campaign.status === 'sending') {
      return res.status(400).json({ ok: false, error: 'Campaign is already sending.' })
    }

    const config = await getWorkspaceConfig(req.workspaceId)
    if (!canSendGmail(config.gmail)) {
      return res.status(400).json({ ok: false, error: 'Gmail is not connected.' })
    }

    await EmailRecipient.updateMany(
      { campaignId: campaign._id, status: 'failed' },
      { $set: { status: 'queued', error: undefined } },
    )

    campaign.status = 'sending'
    campaign.startedAt = new Date()
    campaign.error = undefined
    await campaign.save()

    setImmediate(() => runCampaignSend(campaign._id, req.workspaceId))

    res.json({ ok: true, campaign: mapCampaign(campaign.toObject()), sending: true })
  } catch (err) {
    next(err)
  }
})

router.delete('/email/campaigns/:id', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspaceId,
      status: { $in: ['draft', 'completed', 'failed', 'cancelled'] },
    })
    if (!campaign) {
      return res.status(400).json({ ok: false, error: 'Cannot delete active campaign.' })
    }
    await EmailRecipient.deleteMany({ campaignId: campaign._id })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Per-workspace autosaved composer draft (subject + body)
router.get('/email/template-draft', async (req, res, next) => {
  try {
    const draft = await EmailTemplateDraft.findOne({ workspaceId: req.workspaceId }).lean()
    res.json({ ok: true, draft: draft ? { subject: draft.subject, body: draft.body } : null })
  } catch (err) {
    next(err)
  }
})

router.put('/email/template-draft', async (req, res, next) => {
  try {
    const subject = String(req.body?.subject ?? '').slice(0, 2000)
    const body = String(req.body?.body ?? '').slice(0, 20000)
    await EmailTemplateDraft.findOneAndUpdate(
      { workspaceId: req.workspaceId },
      { workspaceId: req.workspaceId, subject, body },
      { upsert: true, new: true },
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
