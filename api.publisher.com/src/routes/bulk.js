import { Router } from 'express'
import { ScheduledPost } from '../models/ScheduledPost.js'
import { DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE } from '../lib/scheduleConstants.js'
import { validateCommunityPublish } from '../lib/contentPolicy.js'
import { sanitizePublishedText } from '../lib/contentSanitize.js'
import { validatePoll } from '../lib/pollPolicy.js'
import { mediaPublicUrl } from '../lib/mediaResolve.js'
import { isRedditConfigured, isQuoraConfigured } from '../lib/platforms.js'
import { getWorkspaceConfig } from '../lib/configStore.js'
import {
  ensureFutureBulkStartDate,
  computeBulkScheduleDate,
  parseScheduleTime,
} from '../lib/bulkSchedule.js'

const router = Router()

router.post('/bulk/schedule', async (req, res, next) => {
  try {
    const { posts, platforms, timezone, startDate } = req.body || {}

    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ ok: false, error: 'No posts to schedule.' })
    }
    if (!platforms?.length) {
      return res.status(400).json({ ok: false, error: 'Select at least one platform.' })
    }

    const config = await getWorkspaceConfig(req.workspaceId)
    if (platforms.includes('reddit') && !isRedditConfigured(config.reddit)) {
      return res.status(400).json({ ok: false, error: 'Reddit is not configured in API Config.' })
    }
    if (platforms.includes('quora') && !isQuoraConfigured(config.quora)) {
      return res.status(400).json({ ok: false, error: 'Quora profile URL is required in API Config.' })
    }

    const defaultScheduleTime =
      config.defaults?.scheduleTime || `${DEFAULT_SCHEDULE_HOUR}:${DEFAULT_SCHEDULE_MINUTE}`
    const [defHour, defMinute] = parseScheduleTime(defaultScheduleTime)
    const resolvedStart = ensureFutureBulkStartDate(
      startDate || new Date().toISOString().slice(0, 10),
      defaultScheduleTime,
    )
    const created = []

    for (const post of posts) {
      const body = sanitizePublishedText(post.body)
      const communityCheck = validateCommunityPublish(body, platforms)
      if (!communityCheck.ok) {
        return res.status(400).json({
          ok: false,
          error: `Post ${post.postNum || post.dayNum}: ${communityCheck.error}`,
        })
      }

      const dayNum = Number(post.dayNum) || 1
      const scheduled = computeBulkScheduleDate(resolvedStart, dayNum, defHour, defMinute)

      if (scheduled <= new Date()) {
        return res.status(400).json({
          ok: false,
          error: `Post ${post.postNum || dayNum}: schedule time must be in the future. Pick a later start date or default schedule time.`,
        })
      }

      const postState = {
        body: body || '',
        platforms: Object.fromEntries(platforms.map((p) => [p, true])),
        hashtags: post.hashtags || [],
        bulkTitle: post.title,
        bulkPostNum: post.postNum,
        bulkDayNum: dayNum,
        imageMediaId: post.imageMediaId || null,
        imageUrl: post.imageUrl || mediaPublicUrl(post.imageMediaId) || null,
        imageDataUrl: post.imageDataUrl || null,
        imagePreview: post.imageDataUrl || post.imagePreview || post.imageUrl || null,
        imageMeta: post.imageMeta || null,
        imageVisibility: post.imageVisibility || undefined,
        cropHint: post.cropHint || undefined,
        timezone: timezone || 'UTC',
      }

      if (post.poll?.enabled) {
        postState.poll = post.poll
        const pollCheck = validatePoll(postState, platforms)
        if (!pollCheck.ok) {
          return res.status(400).json({
            ok: false,
            error: `Post ${post.postNum || dayNum}: ${pollCheck.error}`,
          })
        }
      }

      const existing = post.postNum
        ? await ScheduledPost.findOne({
            workspaceId: req.workspaceId,
            status: { $in: ['scheduled', 'failed'] },
            'postState.bulkPostNum': post.postNum,
          })
        : null

      let doc
      if (existing) {
        existing.body = body || ''
        existing.platforms = platforms
        existing.scheduledAt = scheduled
        existing.timezone = timezone || 'UTC'
        existing.status = 'scheduled'
        existing.error = undefined
        existing.postState = postState
        existing.markModified('postState')
        await existing.save()
        doc = existing
      } else {
        doc = await ScheduledPost.create({
          workspaceId: req.workspaceId,
          body: body || '',
          platforms,
          scheduledAt: scheduled,
          timezone: timezone || 'UTC',
          status: 'scheduled',
          postState,
        })
      }

      created.push({
        id: doc._id.toString(),
        body: doc.body,
        platforms: doc.platforms,
        scheduledAt: doc.scheduledAt.toISOString(),
        title: post.title,
        dayNum,
        postNum: post.postNum,
      })
    }

    res.json({ ok: true, count: created.length, scheduled: created, startDate: resolvedStart })
  } catch (err) {
    next(err)
  }
})

export default router
