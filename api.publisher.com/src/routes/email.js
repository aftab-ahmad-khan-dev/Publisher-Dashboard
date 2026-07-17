import { Router } from 'express'
import { EmailCampaign } from '../models/EmailCampaign.js'
import { EmailRecipient } from '../models/EmailRecipient.js'
import { EmailTemplateDraft } from '../models/EmailTemplateDraft.js'
import { LeadSource } from '../models/LeadSource.js'
import { parseRecipients } from '../lib/emailMerge.js'
import { sanitizePublishedText } from '../lib/contentSanitize.js'
import {
  runCampaignSend,
  newTrackingId,
  countSentLast24h,
} from '../lib/emailWorker.js'
import {
  parseWorkbookBuffer,
  parseCsvText,
} from '../lib/leadWorkbook.js'
import { importGoogleSheet, importWorkbookFromLink } from '../lib/googleSheets.js'
import { flushLeadStatusUpdates } from '../lib/leadWriteback.js'
import { createCalendarInvite, getCalendarBookingUrl, isBookingUrl, syncMeetingsFromCalendar, ensureMeetOnEvent } from '../lib/googleCalendar.js'
import { forceScheduleMeetingHrefs, forceScheduleMeetingText } from '../lib/meetingCta.js'
import {
  listEmailHtmlTemplates,
  templatesByType,
  getEmailHtmlTemplate,
} from '../lib/emailHtmlTemplates.js'
import {
  getWorkspaceConfig,
  saveGmailConfig,
  toClientConfig,
  stripPlaceholderSecrets,
} from '../lib/configStore.js'
import { refreshGmailTokenIfNeeded, getGmailAccessToken, calendarAuthErrorMessage } from '../lib/gmailOAuth.js'
import { testGmailConnection } from '../lib/gmailSend.js'
import { canSendGmail, isSmtpConfigured } from '../lib/platforms.js'
import { requirePlanFeature } from '../middleware/planGate.js'

const router = Router()

/** Strip unresolved merge tags so UI never shows "{{niche}}" etc. */
function humanizeLabel(raw, fallback = '') {
  const s = String(raw || '')
  if (!s) return fallback
  if (!s.includes('{{')) return s
  const cleaned = s
    .replace(/\{\{\s*[\w.]+\s*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.:;\-\s]+|[,.:;\-\s]+$/g, '')
    .trim()
  return cleaned || fallback
}

function displayCampaignName(campaign) {
  if (!campaign) return 'Campaign'
  const type = campaign.templateType || 'email'
  const typeLabel =
    type === 'product' ? 'VorksPro' : type === 'outreach' ? 'Outreach' : 'Email'
  return (
    humanizeLabel(campaign.name, '') ||
    humanizeLabel(campaign.subject, '') ||
    `${typeLabel} campaign`
  )
}

async function resolveBookingUrl(workspaceId, override) {
  if (String(override || '').trim()) return String(override).trim()
  const config = await getWorkspaceConfig(workspaceId)
  return getCalendarBookingUrl(config)
}

function isCalendarConnected(config) {
  return Boolean(config?.gmail?.refreshToken?.trim())
}

function mapRecipient(doc) {
  return {
    id: doc._id.toString(),
    campaignId: doc.campaignId?.toString?.() || doc.campaignId,
    email: doc.email,
    name: doc.name,
    company: doc.company,
    niche: doc.niche,
    designation: doc.designation || doc.mergeData?.designation || '',
    location: doc.location || doc.mergeData?.location || '',
    sheetName: doc.sheetName || doc.mergeData?.sheetName || '',
    rowNumber: doc.rowNumber || doc.mergeData?.rowNumber,
    status: doc.status,
    error: doc.error,
    sentAt: doc.sentAt?.toISOString?.() || doc.sentAt,
    openedAt: doc.openedAt?.toISOString?.() || doc.openedAt,
    lastOpenedAt: doc.lastOpenedAt?.toISOString?.() || doc.lastOpenedAt,
    openCount: doc.openCount || 0,
    clickedAt: doc.clickedAt?.toISOString?.() || doc.clickedAt,
    clickCount: doc.clickCount || 0,
    lastClickedUrl: doc.lastClickedUrl || '',
    meetingStatus: doc.meetingStatus || 'none',
    meetingLink: doc.meetingLink || doc.mergeData?.meetingLink || '',
    meetingClickedAt: doc.meetingClickedAt?.toISOString?.() || doc.meetingClickedAt,
    meetingScheduledAt: doc.meetingScheduledAt?.toISOString?.() || doc.meetingScheduledAt,
    meetingNotes: doc.meetingNotes || '',
    calendarEventId: doc.calendarEventId || '',
    mailboxFolder: doc.mailboxFolder === 'junk' ? 'junk' : 'inbox',
    gmailMessageId: doc.gmailMessageId,
    mergeData: doc.mergeData,
    renderedSubject: doc.renderedSubject,
    renderedText: doc.renderedText,
    renderedHtml: doc.renderedHtml,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
  }
}

function mapCampaign(doc) {
  return {
    id: doc._id.toString(),
    name: displayCampaignName(doc),
    rawName: doc.name || '',
    subject: humanizeLabel(doc.subject, doc.subject || ''),
    status: doc.status,
    trackOpens: doc.trackOpens,
    templateType: doc.templateType || 'custom',
    stats: doc.stats,
    fromEmail: doc.fromEmail,
    error: doc.error,
    cooldownMs: doc.cooldownMs,
    dailyCap: doc.dailyCap,
    meetingLink: doc.meetingLink || '',
    leadSourceId: doc.leadSourceId?.toString?.() || doc.leadSourceId || null,
    startedAt: doc.startedAt?.toISOString?.() || doc.startedAt,
    completedAt: doc.completedAt?.toISOString?.() || doc.completedAt,
    pausedAt: doc.pausedAt?.toISOString?.() || doc.pausedAt,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
  }
}

function mapLeadSource(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    type: doc.type,
    spreadsheetId: doc.spreadsheetId,
    spreadsheetUrl: doc.spreadsheetUrl,
    fileName: doc.fileName,
    sheets: doc.sheetsMeta || [],
    selectedSheets: doc.selectedSheets || [],
    skipAlreadyEmailed: doc.skipAlreadyEmailed !== false,
    stats: doc.stats,
    lastSyncAt: doc.lastSyncAt?.toISOString?.() || doc.lastSyncAt,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    hasFile: Boolean(doc.fileData?.length),
  }
}

function normalizeCooldown(body) {
  const minutes = Number(body?.cooldownMinutes ?? body?.cooldownMs / 60000)
  if (Number.isFinite(minutes) && minutes > 0) {
    return Math.round(Math.min(Math.max(minutes, 1), 60) * 60 * 1000)
  }
  if (Number.isFinite(Number(body?.cooldownMs))) {
    return Math.min(Math.max(Number(body.cooldownMs), 60_000), 60 * 60 * 1000)
  }
  return 8 * 60 * 1000
}

/** Emails before a long rest — clamped to 15–20. */
function normalizeBatchSize(body) {
  const n = Number(body?.batchSize ?? body?.restEvery)
  if (Number.isFinite(n) && n > 0) return Math.min(20, Math.max(15, Math.round(n)))
  return 18
}

function normalizeDailyCap(body) {
  const cap = Number(body?.dailyCap)
  if (Number.isFinite(cap) && cap > 0) return Math.min(Math.max(Math.round(cap), 1), 2000)
  return 200
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
    // Only persist non-secret fields from the form — never wipe OAuth tokens on Test.
    if (req.body?.gmail) {
      const g = req.body.gmail
      await saveGmailConfig(req.workspaceId, {
        clientId: g.clientId,
        fromEmail: g.fromEmail,
        calendarBookingUrl: g.calendarBookingUrl,
        ...(g.clientSecret?.trim() ? { clientSecret: g.clientSecret } : {}),
      })
    }
    await refreshGmailTokenIfNeeded(req.workspaceId)
    const { accessToken, fromEmail } = await getGmailAccessToken(req.workspaceId)
    const result = await testGmailConnection(null, accessToken)
    if (!result.ok) return res.status(400).json(result)
    res.json({
      ...result,
      saved: true,
      fromEmail: fromEmail || result.emailAddress,
      message: result.message || 'Gmail token refreshed and verified.',
    })
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message })
  }
})

/* ─── Lead sources (xlsx / Google Sheets) ─── */

router.post('/email/leads/upload', async (req, res, next) => {
  try {
    const {
      dataBase64,
      fileName,
      sheetNames,
      skipAlreadyEmailed = true,
      dedupe = true,
    } = req.body || {}
    if (!dataBase64) {
      return res.status(400).json({ ok: false, error: 'Provide dataBase64 for the workbook.' })
    }
    const buffer = Buffer.from(dataBase64, 'base64')
    if (!buffer.length) {
      return res.status(400).json({ ok: false, error: 'Empty file.' })
    }
    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'File too large (max 25MB).' })
    }

    const bookingUrl = await resolveBookingUrl(req.workspaceId)
    const lower = String(fileName || '').toLowerCase()
    let parsed
    if (lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
      parsed = parseCsvText(buffer.toString('utf8'), 'Sheet1', {
        sheetNames,
        skipAlreadyEmailed,
        dedupe,
        bookingUrl,
      })
    } else {
      parsed = await parseWorkbookBuffer(buffer, {
        sheetNames,
        skipAlreadyEmailed,
        dedupe,
        bookingUrl,
      })
    }

    const source = await LeadSource.create({
      workspaceId: req.workspaceId,
      name: fileName || 'Uploaded workbook',
      type: lower.endsWith('.csv') ? 'csv' : 'xlsx',
      fileData: buffer,
      fileName: fileName || 'leads.xlsx',
      sheetsMeta: parsed.sheets.map((s) => ({
        sheetName: s.sheetName,
        ok: s.ok,
        columnMap: s.columnMap,
        headerRowIndex: s.headerRowIndex,
        leadCount: s.leadCount,
      })),
      selectedSheets: sheetNames || parsed.sheets.map((s) => s.sheetName),
      skipAlreadyEmailed: skipAlreadyEmailed !== false,
      stats: {
        leads: parsed.stats.leads,
        skipped: parsed.stats.skipped,
        quarantine: parsed.stats.quarantine,
      },
      lastSyncAt: new Date(),
    })

    res.json({
      ok: true,
      source: mapLeadSource(source),
      sheets: parsed.sheets,
      leads: parsed.leads,
      quarantine: parsed.quarantine,
      skipped: parsed.skipped,
      stats: parsed.stats,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/email/leads/sheets', async (req, res, next) => {
  try {
    const {
      url,
      sheetNames,
      skipAlreadyEmailed = true,
      dedupe = true,
    } = req.body || {}
    const bookingUrl = await resolveBookingUrl(req.workspaceId)
    const { spreadsheetId, buffer, parsed, kind, sourceUrl } = await importWorkbookFromLink(url, {
      sheetNames,
      skipAlreadyEmailed,
      dedupe,
      bookingUrl,
    })

    const isSheets = kind === 'sheets' && spreadsheetId
    const source = await LeadSource.create({
      workspaceId: req.workspaceId,
      name: isSheets ? 'Google Sheet' : 'Excel link',
      type: isSheets ? 'sheets' : 'xlsx',
      spreadsheetId: spreadsheetId || undefined,
      spreadsheetUrl: sourceUrl || url,
      fileData: buffer,
      fileName: isSheets
        ? `sheet-${spreadsheetId}.xlsx`
        : `link-import-${Date.now()}.xlsx`,
      sheetsMeta: parsed.sheets.map((s) => ({
        sheetName: s.sheetName,
        ok: s.ok,
        columnMap: s.columnMap,
        headerRowIndex: s.headerRowIndex,
        leadCount: s.leadCount,
      })),
      selectedSheets: sheetNames || parsed.sheets.map((s) => s.sheetName),
      skipAlreadyEmailed: skipAlreadyEmailed !== false,
      stats: {
        leads: parsed.stats.leads,
        skipped: parsed.stats.skipped,
        quarantine: parsed.stats.quarantine,
      },
      lastSyncAt: new Date(),
    })

    res.json({
      ok: true,
      source: mapLeadSource(source),
      sheets: parsed.sheets,
      leads: parsed.leads,
      quarantine: parsed.quarantine,
      skipped: parsed.skipped,
      stats: parsed.stats,
      spreadsheetId: spreadsheetId || null,
      kind: kind || 'xlsx-url',
    })
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message })
  }
})

router.get('/email/leads', async (req, res, next) => {
  try {
    const sources = await LeadSource.find({ workspaceId: req.workspaceId })
      .select('-fileData')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
    res.json({ ok: true, sources: sources.map(mapLeadSource) })
  } catch (err) {
    next(err)
  }
})

router.get('/email/leads/:id/export', async (req, res, next) => {
  try {
    await flushLeadStatusUpdates(req.params.id)
    const source = await LeadSource.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!source?.fileData?.length) {
      return res.status(404).json({ ok: false, error: 'No workbook available to export.' })
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(source.fileName || 'leads-updated.xlsx').replace(/"/g, '')}"`,
    )
    res.send(source.fileData)
  } catch (err) {
    next(err)
  }
})

router.post('/email/leads/:id/reparse', async (req, res, next) => {
  try {
    const source = await LeadSource.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!source) return res.status(404).json({ ok: false, error: 'Lead source not found' })

    const { sheetNames, skipAlreadyEmailed = true, dedupe = true } = req.body || {}
    let buffer = source.fileData
    if (source.type === 'sheets' && source.spreadsheetId) {
      const imported = await importGoogleSheet(source.spreadsheetId, {
        sheetNames,
        skipAlreadyEmailed,
        dedupe,
      })
      buffer = imported.buffer
      source.fileData = buffer
    }
    if (!buffer?.length) {
      return res.status(400).json({ ok: false, error: 'No file data to reparse.' })
    }

    const parsed = await parseWorkbookBuffer(buffer, {
      sheetNames: sheetNames || source.selectedSheets,
      skipAlreadyEmailed,
      dedupe,
    })
    source.sheetsMeta = parsed.sheets.map((s) => ({
      sheetName: s.sheetName,
      ok: s.ok,
      columnMap: s.columnMap,
      headerRowIndex: s.headerRowIndex,
      leadCount: s.leadCount,
    }))
    if (sheetNames) source.selectedSheets = sheetNames
    source.stats = {
      leads: parsed.stats.leads,
      skipped: parsed.stats.skipped,
      quarantine: parsed.stats.quarantine,
    }
    source.lastSyncAt = new Date()
    await source.save()

    res.json({
      ok: true,
      source: mapLeadSource(source),
      sheets: parsed.sheets,
      leads: parsed.leads,
      quarantine: parsed.quarantine,
      skipped: parsed.skipped,
      stats: parsed.stats,
    })
  } catch (err) {
    next(err)
  }
})

/* ─── Mailbox listing ─── */

router.get('/email/mailbox', async (req, res, next) => {
  try {
    const folder = String(req.query.folder || 'sent').toLowerCase()
    const q = String(req.query.q || '').trim()
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const campaignId = req.query.campaignId

    const filter = { workspaceId: req.workspaceId }
    if (campaignId) filter.campaignId = campaignId

    if (folder === 'junk') {
      filter.mailboxFolder = 'junk'
    } else {
      filter.$and = [
        {
          $or: [
            { mailboxFolder: 'inbox' },
            { mailboxFolder: { $exists: false } },
            { mailboxFolder: null },
          ],
        },
      ]
      if (folder === 'queued') filter.status = 'queued'
      else if (folder === 'failed') filter.status = 'failed'
      else if (folder === 'opened') filter.status = { $in: ['opened', 'clicked'] }
      else if (folder === 'sent') filter.status = { $in: ['sent', 'opened', 'clicked'] }
      else if (folder === 'all') {
        /* inbox only, any status */
      } else {
        filter.status = { $in: ['sent', 'opened', 'clicked'] }
      }
    }

    if (q) {
      const textMatch = {
        $or: [
          { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { company: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { renderedSubject: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }
      if (filter.$and) filter.$and.push(textMatch)
      else Object.assign(filter, textMatch)
    }

    const [recipients, counts, junkCount, sent24h] = await Promise.all([
      EmailRecipient.find(filter).sort({ updatedAt: -1 }).limit(limit).lean(),
      EmailRecipient.aggregate([
        {
          $match: {
            workspaceId: req.workspaceId,
            $or: [
              { mailboxFolder: 'inbox' },
              { mailboxFolder: { $exists: false } },
              { mailboxFolder: null },
            ],
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      EmailRecipient.countDocuments({
        workspaceId: req.workspaceId,
        mailboxFolder: 'junk',
      }),
      countSentLast24h(req.workspaceId),
    ])

    const folderCounts = {
      queued: 0,
      sent: 0,
      opened: 0,
      failed: 0,
      all: 0,
      junk: junkCount,
    }
    for (const row of counts) {
      folderCounts.all += row.count
      if (row._id === 'queued') folderCounts.queued += row.count
      else if (row._id === 'failed') folderCounts.failed += row.count
      else if (row._id === 'opened' || row._id === 'clicked') {
        folderCounts.opened += row.count
        folderCounts.sent += row.count
      } else if (row._id === 'sent') folderCounts.sent += row.count
    }

    res.json({
      ok: true,
      folder,
      recipients: recipients.map(mapRecipient),
      folderCounts,
      sent24h,
      meetingLink: await resolveBookingUrl(req.workspaceId),
    })
  } catch (err) {
    next(err)
  }
})

router.post('/email/mailbox/bulk', async (req, res, next) => {
  try {
    const action = String(req.body?.action || '').toLowerCase()
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id) => String(id)).filter(Boolean)
      : []
    if (!ids.length) {
      return res.status(400).json({ ok: false, error: 'Select at least one message.' })
    }
    if (!['junk', 'restore', 'delete'].includes(action)) {
      return res.status(400).json({
        ok: false,
        error: 'action must be junk, restore, or delete.',
      })
    }

    const filter = {
      _id: { $in: ids },
      workspaceId: req.workspaceId,
    }

    if (action === 'junk') {
      const result = await EmailRecipient.updateMany(filter, {
        $set: { mailboxFolder: 'junk' },
      })
      return res.json({ ok: true, action, updated: result.modifiedCount || result.nModified || 0 })
    }

    if (action === 'restore') {
      const result = await EmailRecipient.updateMany(filter, {
        $set: { mailboxFolder: 'inbox' },
      })
      return res.json({ ok: true, action, updated: result.modifiedCount || result.nModified || 0 })
    }

    // delete forever — only junk items
    const result = await EmailRecipient.deleteMany({
      ...filter,
      mailboxFolder: 'junk',
    })
    const deleted = result.deletedCount || 0
    if (!deleted) {
      return res.status(400).json({
        ok: false,
        error: 'Move messages to Junk first, then Delete forever.',
      })
    }
    res.json({ ok: true, action, deleted })
  } catch (err) {
    next(err)
  }
})

router.post('/email/mailbox/:id/junk', async (req, res, next) => {
  try {
    const recipient = await EmailRecipient.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!recipient) return res.status(404).json({ ok: false, error: 'Message not found' })
    recipient.mailboxFolder = 'junk'
    await recipient.save()
    res.json({ ok: true, recipient: mapRecipient(recipient) })
  } catch (err) {
    next(err)
  }
})

router.post('/email/mailbox/:id/restore', async (req, res, next) => {
  try {
    const recipient = await EmailRecipient.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!recipient) return res.status(404).json({ ok: false, error: 'Message not found' })
    recipient.mailboxFolder = 'inbox'
    await recipient.save()
    res.json({ ok: true, recipient: mapRecipient(recipient) })
  } catch (err) {
    next(err)
  }
})

router.delete('/email/mailbox/:id', async (req, res, next) => {
  try {
    const recipient = await EmailRecipient.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!recipient) return res.status(404).json({ ok: false, error: 'Message not found' })
    if (recipient.mailboxFolder !== 'junk') {
      return res.status(400).json({
        ok: false,
        error: 'Move the message to Junk first, then Delete forever.',
      })
    }
    await EmailRecipient.deleteOne({ _id: recipient._id })
    res.json({ ok: true, deleted: true })
  } catch (err) {
    next(err)
  }
})

router.get('/email/mailbox/:id', async (req, res, next) => {
  try {
    const recipient = await EmailRecipient.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    }).lean()
    if (!recipient) return res.status(404).json({ ok: false, error: 'Message not found' })
    const campaign = await EmailCampaign.findById(recipient.campaignId).lean()
    res.json({
      ok: true,
      recipient: mapRecipient(recipient),
      campaign: campaign ? mapCampaign(campaign) : null,
    })
  } catch (err) {
    next(err)
  }
})

/** Processed / in-flight recipients as a flat table */
router.get('/email/processed', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const campaignId = req.query.campaignId
    const filter = {
      workspaceId: req.workspaceId,
      status: { $in: ['sent', 'opened', 'clicked', 'failed', 'queued', 'sending'] },
    }
    if (campaignId) filter.campaignId = campaignId

    const recipients = await EmailRecipient.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()

    const campaignIds = [...new Set(recipients.map((r) => String(r.campaignId)))]
    const campaigns = await EmailCampaign.find({ _id: { $in: campaignIds } })
      .select('name subject status meetingLink templateType')
      .lean()
    const byId = Object.fromEntries(campaigns.map((c) => [String(c._id), c]))
    const defaultLink = await resolveBookingUrl(req.workspaceId)

    res.json({
      ok: true,
      rows: recipients.map((r) => {
        const c = byId[String(r.campaignId)]
        const displayName =
          String(r.name || r.mergeData?.name || '').trim() ||
          String(r.email || '').split('@')[0] ||
          ''
        return {
          ...mapRecipient(r),
          name: displayName || r.name || '',
          campaignName: displayCampaignName(c),
          campaignSubject: humanizeLabel(
            r.renderedSubject || c?.subject || '',
            c?.subject || '',
          ),
          campaignStatus: c?.status || '',
          campaignMeetingLink:
            r.meetingLink || c?.meetingLink || defaultLink,
        }
      }),
    })
  } catch (err) {
    next(err)
  }
})

/** Meeting pipeline: invited / clicked / scheduled */
router.get('/email/meetings', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 300)
    const autoSync = String(req.query.sync || '') === '1'

    let syncResult = null
    if (autoSync) {
      try {
        const config = await getWorkspaceConfig(req.workspaceId)
        if (isCalendarConnected(config)) {
          await refreshGmailTokenIfNeeded(req.workspaceId)
          const { accessToken } = await getGmailAccessToken(req.workspaceId)
          syncResult = await syncMeetingsFromCalendar(req.workspaceId, accessToken)
        }
      } catch (err) {
        syncResult = { ok: false, error: calendarAuthErrorMessage(err) }
      }
    }

    const recipients = await EmailRecipient.find({
      workspaceId: req.workspaceId,
      $or: [
        { meetingStatus: { $in: ['invited', 'link_clicked', 'scheduled', 'completed', 'no_show'] } },
        { meetingClickedAt: { $exists: true, $ne: null } },
        { meetingScheduledAt: { $exists: true, $ne: null } },
        { calendarEventId: { $exists: true, $nin: [null, ''] } },
      ],
    })
      .sort({ meetingScheduledAt: -1, meetingClickedAt: -1, updatedAt: -1 })
      .limit(limit)
      .lean()

    const campaignIds = [...new Set(recipients.map((r) => String(r.campaignId)))]
    const campaigns = await EmailCampaign.find({ _id: { $in: campaignIds } })
      .select('name subject meetingLink templateType')
      .lean()
    const byId = Object.fromEntries(campaigns.map((c) => [String(c._id), c]))
    const config = await getWorkspaceConfig(req.workspaceId)
    const defaultLink = getCalendarBookingUrl(config)

    res.json({
      ok: true,
      meetingLink: defaultLink,
      calendarConnected: isCalendarConnected(config),
      calendarBookingUrl: config.gmail?.calendarBookingUrl || '',
      sync: syncResult,
      unmatchedBookings: syncResult?.unmatchedBookings || [],
      meetings: recipients.map((r) => {
        const c = byId[String(r.campaignId)]
        const displayName =
          String(r.name || r.mergeData?.name || '').trim() ||
          String(r.email || '').split('@')[0] ||
          ''
        const scheduledAt = r.meetingScheduledAt
          ? new Date(r.meetingScheduledAt).toISOString()
          : null
        let slotLabel = ''
        if (scheduledAt) {
          try {
            slotLabel = new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            }).format(new Date(scheduledAt))
          } catch {
            slotLabel = scheduledAt
          }
        }
        return {
          ...mapRecipient(r),
          name: displayName || r.name || '',
          campaignName: displayCampaignName(c),
          meetingLink: r.meetingLink || c?.meetingLink || defaultLink,
          meetingScheduledAt: scheduledAt,
          slotLabel,
        }
      }),
    })
  } catch (err) {
    next(err)
  }
})

router.patch('/email/meetings/:id', async (req, res, next) => {
  try {
    const recipient = await EmailRecipient.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!recipient) return res.status(404).json({ ok: false, error: 'Not found' })

    const { meetingStatus, meetingScheduledAt, meetingNotes, meetingLink } = req.body || {}
    if (meetingStatus) recipient.meetingStatus = meetingStatus
    if (meetingScheduledAt) recipient.meetingScheduledAt = new Date(meetingScheduledAt)
    if (meetingNotes != null) recipient.meetingNotes = String(meetingNotes).slice(0, 2000)
    if (meetingLink != null) recipient.meetingLink = String(meetingLink).slice(0, 2000)
    await recipient.save()

    res.json({ ok: true, recipient: mapRecipient(recipient) })
  } catch (err) {
    next(err)
  }
})

/** Remove leads from the meeting pipeline (keeps campaign recipient; clears meeting fields). */
router.post('/email/meetings/remove', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : []
    if (!ids.length) {
      return res.status(400).json({ ok: false, error: 'Select at least one row to remove.' })
    }

    const result = await EmailRecipient.updateMany(
      { _id: { $in: ids }, workspaceId: req.workspaceId },
      {
        $set: {
          meetingStatus: 'none',
          meetingScheduledAt: null,
          meetingClickedAt: null,
          meetingNotes: '',
          meetingLink: '',
          calendarEventId: '',
          meetingReminderSentAt: null,
          meetingConfirmSentAt: null,
        },
      },
    )

    res.json({
      ok: true,
      removed: result.modifiedCount || 0,
      matched: result.matchedCount || 0,
    })
  } catch (err) {
    next(err)
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
        templates: campaign.templates,
      },
      recipients: recipients.map(mapRecipient),
    })
  } catch (err) {
    next(err)
  }
})

router.post('/email/campaigns', requirePlanFeature('email'), async (req, res, next) => {
  try {
    const {
      name,
      subject,
      htmlBody,
      textBody,
      templates: templateList,
      templateType,
      recipientsRaw,
      recipients: recipientList,
      trackOpens,
      batchSize,
      batchDelayMs,
      sendNow,
      leadSourceId,
      meetingLink,
    } = req.body || {}

    if (!subject?.trim() && !(templateList?.length > 0)) {
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
        error:
          'Mail is not ready. Set SMTP_* in api .env, or connect Gmail OAuth in Integrations.',
      })
    }

    const cleanSubject = sanitizePublishedText(
      (subject || templateList?.[0]?.subject || 'Outreach').trim(),
    )
    const typeLabel =
      (templateType || 'custom') === 'product'
        ? 'VorksPro'
        : (templateType || 'custom') === 'outreach'
          ? 'Outreach'
          : 'Email'
    const safeCampaignName =
      humanizeLabel(name?.trim() || '', '') ||
      `${typeLabel} · ${new Date().toLocaleDateString()}`
    const booking = await resolveBookingUrl(req.workspaceId, meetingLink)
    const safeBooking = isBookingUrl(booking) ? booking : getCalendarBookingUrl()

    const cleanTextBody = forceScheduleMeetingText(
      sanitizePublishedText(textBody || ''),
      safeBooking,
    )
    const cleanHtmlBody = forceScheduleMeetingHrefs(
      sanitizePublishedText(htmlBody || ''),
      safeBooking,
    )

    const cleanTemplates = Array.isArray(templateList)
      ? templateList
          .filter((t) => t?.subject?.trim())
          .map((t) => ({
            name: t.name || '',
            subject: sanitizePublishedText(t.subject.trim()),
            textBody: forceScheduleMeetingText(
              sanitizePublishedText(t.textBody || ''),
              safeBooking,
            ),
            htmlBody: forceScheduleMeetingHrefs(
              sanitizePublishedText(t.htmlBody || ''),
              safeBooking,
            ),
          }))
      : []

    const cooldownMs = normalizeCooldown(req.body)
    const dailyCap = normalizeDailyCap(req.body)
    const restEvery = normalizeBatchSize(req.body)

    const campaign = await EmailCampaign.create({
      workspaceId: req.workspaceId,
      name: safeCampaignName,
      subject: cleanSubject,
      htmlBody: cleanHtmlBody,
      textBody: cleanTextBody,
      templates: cleanTemplates,
      templateType: templateType || 'custom',
      fromEmail:
        config.gmail.fromEmail ||
        process.env.FROM_EMAIL?.trim() ||
        process.env.SMTP_EMAIL?.trim(),
      trackOpens: trackOpens !== false,
      batchSize: restEvery,
      batchDelayMs: batchDelayMs || cooldownMs,
      cooldownMs,
      dailyCap,
      sendsSinceBreak: 0,
      nextSendAt: null,
      leadSourceId: leadSourceId || undefined,
      meetingLink: safeBooking || '',
      status: sendNow ? 'sending' : 'draft',
      stats: { total: parsed.length, sent: 0, failed: 0, opened: 0, clicked: 0 },
      startedAt: sendNow ? new Date() : undefined,
    })

    await EmailRecipient.insertMany(
      parsed.map((r) => {
        const name = String(r.name || r.mergeData?.name || '').trim()
        const firstName =
          String(r.mergeData?.firstName || '').trim() ||
          name.split(/\s+/).filter(Boolean)[0] ||
          ''
        const greeting = firstName
          ? `Hi ${firstName}`
          : name
            ? `Hi ${name}`
            : 'Hi there'
        const mergeData = {
          ...(r.mergeData || {}),
          name: name || r.mergeData?.name || '',
          firstName,
          greeting,
          meetingLink: safeBooking,
        }
        const isProduct = (templateType || 'custom') === 'product'
        return {
          workspaceId: req.workspaceId,
          campaignId: campaign._id,
          leadSourceId: leadSourceId || undefined,
          email: r.email,
          name: name || '',
          company: r.company || mergeData.company || '',
          niche: r.niche || mergeData.niche || mergeData.industry || '',
          designation: r.designation || mergeData.designation || '',
          location: r.location || mergeData.location || '',
          sheetName: r.sheetName || mergeData.sheetName || '',
          rowNumber: r.rowNumber || mergeData.rowNumber,
          mergeData,
          meetingLink: mergeData.meetingLink || '',
          meetingStatus: isProduct && mergeData.meetingLink ? 'invited' : 'none',
          mailboxFolder: 'inbox',
          status: 'queued',
          trackingId: newTrackingId(),
        }
      }),
    )

    if (sendNow) {
      setImmediate(() => runCampaignSend(campaign._id, req.workspaceId))
    }

    res.json({
      ok: true,
      campaign: mapCampaign(campaign.toObject()),
      recipientCount: parsed.length,
      sending: Boolean(sendNow),
      cooldownMs,
      dailyCap,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/email/campaigns/:id/send', requirePlanFeature('email'), async (req, res, next) => {
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
      return res.status(400).json({
        ok: false,
        error: 'Mail is not ready. Set SMTP_* in api .env or connect Gmail.',
      })
    }

    if (req.body?.cooldownMinutes != null || req.body?.cooldownMs != null) {
      campaign.cooldownMs = normalizeCooldown(req.body)
    }
    if (req.body?.dailyCap != null) {
      campaign.dailyCap = normalizeDailyCap(req.body)
    }
    if (req.body?.batchSize != null || req.body?.restEvery != null) {
      campaign.batchSize = normalizeBatchSize(req.body)
    }

    await EmailRecipient.updateMany(
      { campaignId: campaign._id, status: { $in: ['failed', 'cancelled'] } },
      { $set: { status: 'queued', error: undefined } },
    )

    campaign.status = 'sending'
    campaign.startedAt = campaign.startedAt || new Date()
    campaign.pausedAt = undefined
    campaign.error = undefined
    campaign.nextSendAt = null
    await campaign.save()

    setImmediate(() => runCampaignSend(campaign._id, req.workspaceId))

    res.json({ ok: true, campaign: mapCampaign(campaign.toObject()), sending: true })
  } catch (err) {
    next(err)
  }
})

router.post('/email/campaigns/:id/pause', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!campaign) return res.status(404).json({ ok: false, error: 'Campaign not found' })
    campaign.status = 'paused'
    campaign.pausedAt = new Date()
    await campaign.save()
    res.json({ ok: true, campaign: mapCampaign(campaign.toObject()) })
  } catch (err) {
    next(err)
  }
})

router.post('/email/campaigns/:id/resume', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!campaign) return res.status(404).json({ ok: false, error: 'Campaign not found' })
    if (campaign.status !== 'paused' && campaign.status !== 'failed') {
      return res.status(400).json({ ok: false, error: 'Only paused/failed campaigns can resume.' })
    }
    campaign.status = 'sending'
    campaign.pausedAt = undefined
    campaign.error = undefined
    await campaign.save()
    setImmediate(() => runCampaignSend(campaign._id, req.workspaceId))
    res.json({ ok: true, campaign: mapCampaign(campaign.toObject()), sending: true })
  } catch (err) {
    next(err)
  }
})

router.post('/email/campaigns/:id/cancel', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!campaign) return res.status(404).json({ ok: false, error: 'Campaign not found' })
    campaign.status = 'cancelled'
    campaign.completedAt = new Date()
    await campaign.save()
    await EmailRecipient.updateMany(
      { campaignId: campaign._id, status: { $in: ['queued', 'sending'] } },
      { $set: { status: 'cancelled' } },
    )
    res.json({ ok: true, campaign: mapCampaign(campaign.toObject()) })
  } catch (err) {
    next(err)
  }
})

router.delete('/email/campaigns/:id', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspaceId,
      status: { $in: ['draft', 'completed', 'failed', 'cancelled', 'paused'] },
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

router.get('/email/campaigns/:id/export.csv', async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    }).lean()
    if (!campaign) return res.status(404).json({ ok: false, error: 'Campaign not found' })
    const recipients = await EmailRecipient.find({ campaignId: campaign._id }).lean()
    const header =
      'email,name,company,designation,location,sheet,status,sentAt,opens,lastOpened,clicks,error\n'
    const lines = recipients.map((r) =>
      [
        r.email,
        r.name,
        r.company,
        r.designation || '',
        r.location || '',
        r.sheetName || '',
        r.status,
        r.sentAt?.toISOString?.() || '',
        r.openCount || 0,
        r.lastOpenedAt?.toISOString?.() || r.openedAt?.toISOString?.() || '',
        r.clickCount || 0,
        (r.error || '').replace(/"/g, '""'),
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="campaign-${campaign._id}.csv"`,
    )
    res.send(header + lines.join('\n'))
  } catch (err) {
    next(err)
  }
})

router.post('/email/calendar/invite', requirePlanFeature('email'), async (req, res, next) => {
  try {
    const {
      attendeeEmail,
      summary,
      description,
      startIso,
      endIso,
      timeZone,
      recipientId,
      durationMinutes,
    } = req.body || {}

    let email = attendeeEmail
    let recipient = null
    if (recipientId) {
      recipient = await EmailRecipient.findOne({
        _id: recipientId,
        workspaceId: req.workspaceId,
      })
      if (!recipient) {
        return res.status(404).json({ ok: false, error: 'Recipient not found' })
      }
      email = recipient.email
    }

    if (!email || !startIso) {
      return res.status(400).json({
        ok: false,
        error: 'attendeeEmail (or recipientId) and startIso are required.',
      })
    }

    const start = new Date(startIso)
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ ok: false, error: 'Invalid startIso' })
    }
    const mins = Math.max(15, Number(durationMinutes) || 30)
    const end = endIso
      ? new Date(endIso)
      : new Date(start.getTime() + mins * 60 * 1000)

    await refreshGmailTokenIfNeeded(req.workspaceId)
    const { accessToken, fromEmail } = await getGmailAccessToken(req.workspaceId)
    const admin =
      process.env.ADMIN_EMAIL?.trim() ||
      fromEmail ||
      process.env.FROM_EMAIL?.trim() ||
      process.env.SMTP_EMAIL?.trim() ||
      ''

    const leadName = recipient?.name || recipient?.mergeData?.name || ''
    const result = await createCalendarInvite({
      accessToken,
      summary:
        summary ||
        (recipient ? `Meeting with ${leadName || recipient.email}` : 'Meeting'),
      description:
        description ||
        [
          leadName ? `Meeting with ${leadName}` : 'Meeting',
          email ? `Guest: ${email}` : '',
          'A Google Meet link will be attached to this event.',
        ]
          .filter(Boolean)
          .join('\n'),
      attendeeEmail: email,
      adminEmail: admin,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })

    let meetLink = result.meetLink || result.hangoutLink || ''
    if (!meetLink && result.eventId) {
      const ensured = await ensureMeetOnEvent(accessToken, result.eventId)
      meetLink = ensured.meetLink || ''
    }

    if (recipient) {
      recipient.meetingStatus = 'scheduled'
      recipient.meetingScheduledAt = start
      if (meetLink) recipient.meetingLink = meetLink
      recipient.calendarEventId = result.eventId || ''
      recipient.meetingReminderSentAt = null
      recipient.meetingConfirmSentAt = null
      if (!recipient.mergeData) recipient.mergeData = {}
      recipient.mergeData = {
        ...recipient.mergeData,
        meetingLink: recipient.meetingLink,
      }
      await recipient.save()
    }

    // Email the SAME Meet URL to lead + admin (one room)
    if (email && (meetLink || start.toISOString())) {
      try {
        const { emailMeetLinkToParties } = await import('../lib/meetingNotify.js')
        const mailed = await emailMeetLinkToParties({
          leadEmail: email,
          leadName,
          meetLink,
          whenIso: start.toISOString(),
          summary:
            summary ||
            (recipient ? `Meeting with ${leadName || email}` : 'Meeting'),
          calendarHtmlLink: result.htmlLink || '',
          workspaceId: req.workspaceId,
          broadcast: true,
        })
        if (recipient && (mailed?.lead || mailed?.appNotified)) {
          recipient.meetingConfirmSentAt = new Date()
          await recipient.save()
        }
      } catch {
        /* non-fatal */
      }
    }

    res.json({
      ...result,
      meetLink,
      meetingLink: meetLink || result.htmlLink || '',
      recipient: recipient ? mapRecipient(recipient) : null,
      emailedParties: Boolean(meetLink || email),
    })
  } catch (err) {
    res.status(400).json({ ok: false, error: calendarAuthErrorMessage(err) })
  }
})

router.post('/email/calendar/sync', requirePlanFeature('email'), async (req, res, next) => {
  try {
    const config = await getWorkspaceConfig(req.workspaceId)
    if (!isCalendarConnected(config)) {
      return res.status(400).json({
        ok: false,
        error: 'Connect Gmail (Calendar scopes) in Integrations first.',
      })
    }
    await refreshGmailTokenIfNeeded(req.workspaceId)
    const { accessToken } = await getGmailAccessToken(req.workspaceId)
    const result = await syncMeetingsFromCalendar(req.workspaceId, accessToken)
    res.json(result)
  } catch (err) {
    res.status(400).json({ ok: false, error: calendarAuthErrorMessage(err) })
  }
})

router.get('/email/settings', async (req, res) => {
  try {
    const config = await getWorkspaceConfig(req.workspaceId)
    res.json({
      ok: true,
      meetingLink: getCalendarBookingUrl(config),
      calendarBookingUrl: config.gmail?.calendarBookingUrl || '',
      calendarConnected: isCalendarConnected(config),
      calendarConnectedAt: config.gmail?.calendarConnectedAt || null,
      smtpConfigured: isSmtpConfigured(),
      fromEmail:
        config.gmail?.fromEmail ||
        process.env.FROM_EMAIL?.trim() ||
        process.env.SMTP_EMAIL?.trim() ||
        '',
      defaults: {
        cooldownMinutes: 8,
        batchSize: 18,
        dailyCap: 200,
      },
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.put('/email/settings/calendar', async (req, res, next) => {
  try {
    const calendarBookingUrl = String(req.body?.calendarBookingUrl ?? '').trim().slice(0, 2000)
    if (calendarBookingUrl && !isBookingUrl(calendarBookingUrl)) {
      return res.status(400).json({
        ok: false,
        error:
          'Booking link must be a Google Calendar / Calendly / Cal.com URL — not your product or portfolio site.',
      })
    }
    const next = await saveGmailConfig(req.workspaceId, { calendarBookingUrl })
    res.json({
      ok: true,
      calendarBookingUrl: next.gmail?.calendarBookingUrl || '',
      meetingLink: getCalendarBookingUrl(next),
      calendarConnected: isCalendarConnected(next),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/email/templates', async (req, res, next) => {
  try {
    const type = String(req.query.type || '').trim()
    const meetingLink = String(
      req.query.meetingLink || (await resolveBookingUrl(req.workspaceId)),
    )
    const templates = type
      ? templatesByType(type, meetingLink)
      : listEmailHtmlTemplates(meetingLink)
    res.json({ ok: true, templates })
  } catch (err) {
    next(err)
  }
})

router.get('/email/templates/:id', async (req, res, next) => {
  try {
    const meetingLink = String(
      req.query.meetingLink || (await resolveBookingUrl(req.workspaceId)),
    )
    const template = getEmailHtmlTemplate(req.params.id, meetingLink)
    if (!template) return res.status(404).json({ ok: false, error: 'Template not found' })
    res.json({ ok: true, template })
  } catch (err) {
    next(err)
  }
})

router.get('/email/template-draft', async (req, res, next) => {
  try {
    const draft = await EmailTemplateDraft.findOne({ workspaceId: req.workspaceId }).lean()
    res.json({
      ok: true,
      draft: draft
        ? {
            subject: draft.subject,
            body: draft.body,
            meetingLink: draft.meetingLink,
            templateType: draft.templateType,
          }
        : null,
    })
  } catch (err) {
    next(err)
  }
})

router.put('/email/template-draft', async (req, res, next) => {
  try {
    const subject = String(req.body?.subject ?? '').slice(0, 2000)
    const body = String(req.body?.body ?? '').slice(0, 20000)
    const meetingLink = String(req.body?.meetingLink ?? '').slice(0, 2000)
    const templateType = String(req.body?.templateType ?? 'custom').slice(0, 32)
    await EmailTemplateDraft.findOneAndUpdate(
      { workspaceId: req.workspaceId },
      { workspaceId: req.workspaceId, subject, body, meetingLink, templateType },
      { upsert: true, new: true },
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
