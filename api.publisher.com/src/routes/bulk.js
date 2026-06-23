import { Router } from 'express'
import { ScheduledPost } from '../models/ScheduledPost.js'
import { DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE } from '../lib/scheduleConstants.js'
import { validateCommunityPublish } from '../lib/contentPolicy.js'
import { sanitizePublishedText } from '../lib/contentSanitize.js'
import { isRedditConfigured, isQuoraConfigured } from '../lib/platforms.js'
import { getWorkspaceConfig } from '../lib/configStore.js'
import { validatePoll, platformSupportsPoll } from '../lib/pollPolicy.js'

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

    const [sy, sm, sd] = (startDate || new Date().toISOString().slice(0, 10)).split('-').map(Number)
    // Default time of day comes from the workspace's scheduling defaults ("HH:MM").
    const [defHour, defMinute] = (config.defaults?.scheduleTime || `${DEFAULT_SCHEDULE_HOUR}:${DEFAULT_SCHEDULE_MINUTE}`)
      .split(':')
      .map(Number)
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
      const scheduled = new Date(sy, sm - 1, sd, defHour, defMinute, 0, 0)
      scheduled.setDate(scheduled.getDate() + (dayNum - 1))

      if (scheduled <= new Date()) {
        return res.status(400).json({
          ok: false,
          error: `Post ${post.postNum || dayNum}: schedule time must be in the future.`,
        })
      }

      const postState = {
        body: body || '',
        platforms: Object.fromEntries(platforms.map((p) => [p, true])),
        hashtags: post.hashtags || [],
        bulkTitle: post.title,
        bulkPostNum: post.postNum,
        bulkDayNum: dayNum,
        // Canonical field used by publishers; keep imagePreview for existing UI cards.
        imageDataUrl: post.imageDataUrl || null,
        imagePreview: post.imageDataUrl || null,
        imageMeta: post.imageMeta || null,
        timezone: timezone || 'UTC',
      }

      const doc = await ScheduledPost.create({
        workspaceId: req.workspaceId,
        body: body || '',
        platforms,
        scheduledAt: scheduled,
        timezone: timezone || 'UTC',
        status: 'scheduled',
        postState,
      })

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

    res.json({ ok: true, count: created.length, scheduled: created })
  } catch (err) {
    next(err)
  }
})

router.post('/bulk/schedule-polls', async (req, res, next) => {
  try {
    const { polls, platforms, timezone, startDate } = req.body || {}

    if (!Array.isArray(polls) || polls.length === 0) {
      return res.status(400).json({ ok: false, error: 'No polls to schedule.' })
    }

    // Polls only publish on LinkedIn and Reddit; drop anything else.
    const pollPlatforms = (platforms || []).filter(platformSupportsPoll)
    if (!pollPlatforms.length) {
      return res
        .status(400)
        .json({ ok: false, error: 'Select a poll platform (LinkedIn or Reddit).' })
    }

    const config = await getWorkspaceConfig(req.workspaceId)
    if (pollPlatforms.includes('reddit') && !isRedditConfigured(config.reddit)) {
      return res.status(400).json({ ok: false, error: 'Reddit is not configured in API Config.' })
    }

    const [sy, sm, sd] = (startDate || new Date().toISOString().slice(0, 10)).split('-').map(Number)
    const [defHour, defMinute] = (config.defaults?.scheduleTime || `${DEFAULT_SCHEDULE_HOUR}:${DEFAULT_SCHEDULE_MINUTE}`)
      .split(':')
      .map(Number)
    const created = []

    for (const poll of polls) {
      const question = sanitizePublishedText(poll.question || '')
      const options = (poll.options || []).map((o) => sanitizePublishedText(o)).filter(Boolean)
      const durationDays = Number(poll.durationDays) || 3
      // Reddit only supports single-choice voting — force it off when Reddit is targeted.
      const allowMultiple = Boolean(poll.allowMultiple) && !pollPlatforms.includes('reddit')

      const postState = {
        body: question || '',
        platforms: Object.fromEntries(pollPlatforms.map((p) => [p, true])),
        bulkTitle: poll.title,
        bulkPollNum: poll.pollNum,
        bulkDayNum: poll.dayNum,
        poll: { enabled: true, question, options, allowMultiple, durationDays },
        timezone: timezone || 'UTC',
      }

      const check = validatePoll(postState, pollPlatforms)
      if (!check.ok) {
        return res.status(400).json({
          ok: false,
          error: `Poll ${poll.pollNum || poll.dayNum}: ${check.error}`,
        })
      }

      const dayNum = Number(poll.dayNum) || 1
      const scheduled = new Date(sy, sm - 1, sd, defHour, defMinute, 0, 0)
      scheduled.setDate(scheduled.getDate() + (dayNum - 1))

      // "From current": auto-schedule one poll per day starting today. If the first
      // day's slot has already passed (e.g. it's afternoon), publish it shortly from
      // now rather than rejecting — later days keep their one-per-day spacing.
      const now = new Date()
      const when = scheduled <= now ? new Date(now.getTime() + 60 * 1000) : scheduled

      const doc = await ScheduledPost.create({
        workspaceId: req.workspaceId,
        body: question || poll.title || 'Poll',
        platforms: pollPlatforms,
        scheduledAt: when,
        timezone: timezone || 'UTC',
        status: 'scheduled',
        postState,
      })

      created.push({
        id: doc._id.toString(),
        body: doc.body,
        platforms: doc.platforms,
        scheduledAt: doc.scheduledAt.toISOString(),
        title: poll.title,
        dayNum,
        pollNum: poll.pollNum,
      })
    }

    res.json({ ok: true, count: created.length, scheduled: created })
  } catch (err) {
    next(err)
  }
})

export default router
