import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { Draft } from '../models/Draft.js'
import { ScheduledPost } from '../models/ScheduledPost.js'
import { PublishedPost } from '../models/PublishedPost.js'
import {
  getWorkspaceConfig,
  saveWorkspaceConfig,
  saveLinkedInConfig,
  saveMetaConfig,
  saveRedditConfig,
  saveQuoraConfig,
  savePinterestConfig,
  saveThreadsConfig,
  saveDefaultsConfig,
  toClientConfig,
  stripPlaceholderSecrets,
} from '../lib/configStore.js'
import { consolidateUserWorkspacesOnce } from '../lib/workspaceMigration.js'
import { planMissedPostReschedule } from '../lib/rescheduleMissed.js'
import { DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE } from '../lib/scheduleConstants.js'
import { hydratePostStateMedia } from '../lib/mediaResolve.js'

const router = Router()

router.get('/bootstrap', async (req, res, next) => {
  try {
    let auth = null
    try {
      auth = getAuth(req)
    } catch {
      auth = null
    }
    await consolidateUserWorkspacesOnce(auth?.userId)

    const [config, drafts, scheduled, published] = await Promise.all([
      getWorkspaceConfig(req.workspaceId),
      Draft.find({ workspaceId: req.workspaceId }).sort({ updatedAt: -1 }).lean(),
      ScheduledPost.find({ workspaceId: req.workspaceId, status: { $in: ['scheduled', 'publishing', 'failed'] } })
        .sort({ scheduledAt: 1 })
        .lean(),
      PublishedPost.find({ workspaceId: req.workspaceId }).sort({ publishedAt: -1 }).limit(50).lean(),
    ])

    res.json({
      ok: true,
      config: toClientConfig(config),
      drafts: drafts.map(mapDraft),
      scheduled: scheduled.map(mapScheduled),
      published: published.map(mapPublished),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/config', async (req, res, next) => {
  try {
    const config = await getWorkspaceConfig(req.workspaceId)
    res.json({ ok: true, config: toClientConfig(config) })
  } catch (err) {
    next(err)
  }
})

router.put('/config', async (req, res, next) => {
  try {
    const config = await saveWorkspaceConfig(req.workspaceId, req.body?.config || req.body)
    res.json({ ok: true, config: toClientConfig(config) })
  } catch (err) {
    next(err)
  }
})

router.put('/config/linkedin', async (req, res, next) => {
  try {
    const linkedin = stripPlaceholderSecrets(req.body?.linkedin || req.body)
    const config = await saveLinkedInConfig(req.workspaceId, linkedin)
    res.json({ ok: true, config: toClientConfig(config), message: 'LinkedIn configuration saved to database' })
  } catch (err) {
    next(err)
  }
})

router.put('/config/meta', async (req, res, next) => {
  try {
    const meta = stripPlaceholderSecrets(req.body?.meta || req.body)
    const config = await saveMetaConfig(req.workspaceId, meta)
    res.json({ ok: true, config: toClientConfig(config), message: 'Meta configuration saved to database' })
  } catch (err) {
    next(err)
  }
})

router.put('/config/reddit', async (req, res, next) => {
  try {
    const reddit = stripPlaceholderSecrets(req.body?.reddit || req.body)
    const config = await saveRedditConfig(req.workspaceId, reddit)
    res.json({ ok: true, config: toClientConfig(config), message: 'Reddit configuration saved to database' })
  } catch (err) {
    next(err)
  }
})

router.put('/config/quora', async (req, res, next) => {
  try {
    const quora = req.body?.quora || req.body
    const config = await saveQuoraConfig(req.workspaceId, quora)
    res.json({ ok: true, config: toClientConfig(config), message: 'Quora configuration saved to database' })
  } catch (err) {
    next(err)
  }
})

router.put('/config/pinterest', async (req, res, next) => {
  try {
    const pinterest = stripPlaceholderSecrets(req.body?.pinterest || req.body)
    const config = await savePinterestConfig(req.workspaceId, pinterest)
    res.json({ ok: true, config: toClientConfig(config), message: 'Pinterest configuration saved to database' })
  } catch (err) {
    next(err)
  }
})

router.put('/config/threads', async (req, res, next) => {
  try {
    const threads = stripPlaceholderSecrets(req.body?.threads || req.body)
    const config = await saveThreadsConfig(req.workspaceId, threads)
    res.json({ ok: true, config: toClientConfig(config), message: 'Threads configuration saved to database' })
  } catch (err) {
    next(err)
  }
})

router.put('/config/defaults', async (req, res, next) => {
  try {
    const defaults = req.body?.defaults || req.body
    const config = await saveDefaultsConfig(req.workspaceId, defaults)
    res.json({ ok: true, config: toClientConfig(config), message: 'Scheduling defaults saved to database' })
  } catch (err) {
    next(err)
  }
})

router.get('/drafts', async (req, res, next) => {
  try {
    const drafts = await Draft.find({ workspaceId: req.workspaceId }).sort({ updatedAt: -1 }).lean()
    res.json({ ok: true, drafts: drafts.map(mapDraft) })
  } catch (err) {
    next(err)
  }
})

router.put('/drafts/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params
    const payload = req.body?.draft || req.body
    const doc = await Draft.findOneAndUpdate(
      { workspaceId: req.workspaceId, clientId },
      {
        workspaceId: req.workspaceId,
        clientId,
        ...payload,
      },
      { upsert: true, new: true, lean: true },
    )
    res.json({ ok: true, draft: mapDraft(doc) })
  } catch (err) {
    next(err)
  }
})

router.delete('/drafts/:clientId', async (req, res, next) => {
  try {
    await Draft.deleteOne({ workspaceId: req.workspaceId, clientId: req.params.clientId })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.get('/scheduled', async (req, res, next) => {
  try {
    const scheduled = await ScheduledPost.find({
      workspaceId: req.workspaceId,
      status: { $in: ['scheduled', 'publishing', 'failed'] },
    })
      .sort({ scheduledAt: 1 })
      .lean()
    res.json({ ok: true, scheduled: scheduled.map(mapScheduled) })
  } catch (err) {
    next(err)
  }
})

router.put('/scheduled/:id', async (req, res, next) => {
  try {
    const { body, platforms, scheduledAt, timezone } = req.body || {}
    const doc = await ScheduledPost.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!doc) return res.status(404).json({ ok: false, error: 'Not found' })
    // A post mid-publish (or already published/cancelled) can't be edited.
    if (!['scheduled', 'failed'].includes(doc.status)) {
      return res
        .status(409)
        .json({ ok: false, error: `Cannot edit a post that is ${doc.status}.` })
    }

    if (typeof body === 'string') {
      if (!body.trim()) {
        return res.status(400).json({ ok: false, error: 'Post body is required.' })
      }
      doc.body = body
      doc.postState = { ...(doc.postState || {}), body }
      doc.markModified('postState')
    }

    if (Array.isArray(platforms)) {
      if (!platforms.length) {
        return res
          .status(400)
          .json({ ok: false, error: 'Select at least one platform.' })
      }
      doc.platforms = platforms
    }

    if (scheduledAt) {
      // Frontend sends a real UTC ISO instant (see datetimeLocalToISO).
      const when = new Date(scheduledAt)
      if (Number.isNaN(when.getTime()) || when <= new Date()) {
        return res
          .status(400)
          .json({ ok: false, error: 'Scheduled time must be in the future.' })
      }
      doc.scheduledAt = when
    }

    if (timezone) doc.timezone = timezone

    // Editing re-arms the post: a previously failed post becomes pending again.
    doc.status = 'scheduled'
    doc.error = undefined
    await doc.save()
    res.json({ ok: true, scheduled: mapScheduled(doc) })
  } catch (err) {
    next(err)
  }
})

router.get('/scheduled/:id/image', async (req, res, next) => {
  try {
    const doc = await ScheduledPost.findOne({
      _id: req.params.id,
      workspaceId: req.workspaceId,
    })
    if (!doc) return res.status(404).end()

    const hydrated = await hydratePostStateMedia(doc.postState || {})
    const dataUrl = hydrated.imageDataUrl
    if (!dataUrl?.startsWith('data:image/')) return res.status(404).end()

    const [meta, b64] = dataUrl.split(',')
    const contentType = /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg'
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'private, max-age=300')
    return res.send(Buffer.from(b64 || '', 'base64'))
  } catch (err) {
    next(err)
  }
})

router.post('/scheduled/reschedule-missed', async (req, res, next) => {
  try {
    const { startDate, fromToday = true } = req.body || {}
    const config = await getWorkspaceConfig(req.workspaceId)
    const scheduleTime =
      config.defaults?.scheduleTime || `${DEFAULT_SCHEDULE_HOUR}:${DEFAULT_SCHEDULE_MINUTE}`

    const docs = await ScheduledPost.find({
      workspaceId: req.workspaceId,
      status: { $in: ['scheduled', 'failed'] },
    })

    const plan = planMissedPostReschedule(docs, { startDate, scheduleTime, fromToday })
    let rescheduled = 0
    for (const { doc, scheduledAt } of plan) {
      doc.status = 'scheduled'
      doc.error = undefined
      doc.scheduledAt = scheduledAt
      await doc.save()
      rescheduled += 1
    }

    res.json({ ok: true, rescheduled, startDate: plan[0]?.scheduledAt?.toISOString?.() || null })
  } catch (err) {
    next(err)
  }
})

router.post('/scheduled/fix-media', async (req, res, next) => {
  try {
    const docs = await ScheduledPost.find({
      workspaceId: req.workspaceId,
      status: { $in: ['scheduled', 'failed'] },
    })

    let scanned = 0
    let fixed = 0
    for (const doc of docs) {
      scanned += 1
      const ps = doc.postState || {}
      if (ps.imageDataUrl) continue

      const preview = typeof ps.imagePreview === 'string' ? ps.imagePreview.trim() : ''
      const previewUrl = typeof ps.imagePreviewUrl === 'string' ? ps.imagePreviewUrl.trim() : ''
      const candidate = preview || previewUrl
      if (!candidate.startsWith('data:image/')) continue

      doc.postState = {
        ...ps,
        imageDataUrl: candidate,
        imagePreview: ps.imagePreview || candidate,
      }
      doc.markModified('postState')
      await doc.save()
      fixed += 1
    }

    res.json({ ok: true, scanned, fixed })
  } catch (err) {
    next(err)
  }
})

router.delete('/scheduled', async (req, res, next) => {
  try {
    const result = await ScheduledPost.updateMany(
      {
        workspaceId: req.workspaceId,
        status: { $in: ['scheduled', 'failed'] },
      },
      { status: 'cancelled' },
    )
    res.json({ ok: true, removed: result.modifiedCount || 0 })
  } catch (err) {
    next(err)
  }
})

router.delete('/scheduled/:id', async (req, res, next) => {
  try {
    const doc = await ScheduledPost.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      { status: 'cancelled' },
      { new: true },
    )
    if (!doc) return res.status(404).json({ ok: false, error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.get('/published', async (req, res, next) => {
  try {
    const published = await PublishedPost.find({ workspaceId: req.workspaceId })
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean()
    res.json({ ok: true, published: published.map(mapPublished) })
  } catch (err) {
    next(err)
  }
})

function mapDraft(d) {
  return {
    id: d.clientId,
    title: d.title,
    body: d.body,
    cropHint: d.cropHint,
    imageVisibility: d.imageVisibility,
    hashtags: d.hashtags,
    platforms: d.platforms,
    publishMode: d.publishMode,
    scheduledAt: d.scheduledAt,
    timezone: d.timezone,
    imageMeta: d.imageMeta,
    poll: d.poll || null,
    createdAt: d.createdAt?.toISOString?.() || d.createdAt,
    updatedAt: d.updatedAt?.toISOString?.() || d.updatedAt,
  }
}

function mapScheduled(d) {
  const ps = d.postState || {}
  const preview = ps.imagePreview || ps.imageUrl
  const hasInlineImage = preview?.startsWith?.('data:image/')
  return {
    id: d._id.toString(),
    body: d.body,
    platforms: d.platforms,
    scheduledAt: d.scheduledAt?.toISOString?.() || d.scheduledAt,
    timezone: d.timezone,
    status: d.status,
    error: d.error,
    bulkTitle: ps.bulkTitle,
    imagePreview: hasInlineImage ? preview : null,
    imagePreviewUrl: hasInlineImage ? preview : null,
    imageMediaId: ps.imageMediaId || null,
    imageUrl: ps.imageUrl,
    imageMissing: !hasInlineImage && Boolean(ps.imageMediaId || ps.imageUrl),
    // Extra fields so the post can be previewed accurately per platform.
    hashtags: ps.hashtags,
    imageType: ps.imageType,
    cropHint: ps.cropHint,
    poll: ps.poll || null,
  }
}

function mapPublished(d) {
  return {
    id: d._id.toString(),
    body: d.body,
    platforms: d.platforms,
    publishedAt: d.publishedAt?.toISOString?.() || d.publishedAt,
    status: d.status,
    platformResults: d.platformResults,
  }
}

export default router
