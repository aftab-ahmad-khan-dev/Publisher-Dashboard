import { Router } from 'express'
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
  toClientConfig,
  stripPlaceholderSecrets,
} from '../lib/configStore.js'

const router = Router()

router.get('/bootstrap', async (req, res, next) => {
  try {
    const [config, drafts, scheduled, published] = await Promise.all([
      getWorkspaceConfig(req.workspaceId),
      Draft.find({ workspaceId: req.workspaceId }).sort({ updatedAt: -1 }).lean(),
      ScheduledPost.find({ workspaceId: req.workspaceId, status: { $in: ['scheduled', 'publishing'] } })
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
    createdAt: d.createdAt?.toISOString?.() || d.createdAt,
    updatedAt: d.updatedAt?.toISOString?.() || d.updatedAt,
  }
}

function mapScheduled(d) {
  const ps = d.postState || {}
  return {
    id: d._id.toString(),
    body: d.body,
    platforms: d.platforms,
    scheduledAt: d.scheduledAt?.toISOString?.() || d.scheduledAt,
    timezone: d.timezone,
    status: d.status,
    error: d.error,
    bulkTitle: ps.bulkTitle,
    imagePreview: ps.imagePreview,
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
