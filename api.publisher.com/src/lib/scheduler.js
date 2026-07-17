import { ScheduledPost } from '../models/ScheduledPost.js'
import { PublishedPost } from '../models/PublishedPost.js'
import { getWorkspaceConfig } from './configStore.js'
import { refreshLinkedInTokenIfNeeded } from './linkedinOAuth.js'
import { publishToAllPlatforms } from './publishers/index.js'
import { broadcastEvent } from './events.js'
import { sanitizePostState } from './contentSanitize.js'
import { hydratePostStateMedia } from './mediaResolve.js'
import { logger } from './logger.js'
import { isMongoNetworkError, markDisconnected } from '../db.js'
import { resetDbConnection } from './dbInit.js'

let timer = null
let lastCalendarSyncAt = 0
const CALENDAR_SYNC_INTERVAL_MS = 2 * 60 * 1000

async function syncCalendarBookingsTick() {
  const now = Date.now()
  if (now - lastCalendarSyncAt < CALENDAR_SYNC_INTERVAL_MS) return
  lastCalendarSyncAt = now

  const { ApiConfig } = await import('../models/ApiConfig.js')
  const { refreshGmailTokenIfNeeded, getGmailAccessToken } = await import('./gmailOAuth.js')
  const { syncMeetingsFromCalendar } = await import('./googleCalendar.js')

  const configs = await ApiConfig.find({
    $or: [
      { 'gmail.refreshToken': { $exists: true, $nin: [null, ''] } },
      { 'gmail.accessToken': { $exists: true, $nin: [null, ''] } },
    ],
  })
    .select('workspaceId')
    .limit(20)
    .lean()

  for (const cfg of configs) {
    const workspaceId = cfg.workspaceId
    if (!workspaceId) continue
    try {
      await refreshGmailTokenIfNeeded(workspaceId)
      const { accessToken } = await getGmailAccessToken(workspaceId)
      if (!accessToken) continue
      const result = await syncMeetingsFromCalendar(workspaceId, accessToken)
      if (result.guestsNotified || result.newlyScheduled) {
        logger.info('Calendar booking sync', {
          workspaceId,
          guestsNotified: result.guestsNotified,
          newlyScheduled: result.newlyScheduled,
          updated: result.updated,
        })
      }
    } catch (err) {
      logger.warn('Calendar sync for workspace failed', {
        workspaceId,
        error: err.message,
      })
    }
  }
}

function coerceScheduledImageData(postState = {}) {
  if (postState?.imageDataUrl) return postState
  if (postState?.imageMediaId) return postState

  const fromPreview = typeof postState.imagePreview === 'string' ? postState.imagePreview.trim() : ''
  const fromPreviewUrl =
    typeof postState.imagePreviewUrl === 'string' ? postState.imagePreviewUrl.trim() : ''
  const candidate = fromPreview || fromPreviewUrl
  if (!candidate.startsWith('data:image/')) return postState

  return {
    ...postState,
    imageDataUrl: candidate,
    imagePreview: postState.imagePreview || candidate,
  }
}

export function startScheduler() {
  if (timer) return
  timer = setInterval(() => {
    runDuePosts().catch(() => {})
  }, 30_000)
  runDuePosts().catch(() => {})
  logger.info('Scheduler started', { interval: '30s' })
}

export async function runDuePosts() {
  try {
    // Pre-meeting reminders (5–10 min window) — same tick as publish scheduler
    try {
      const { runMeetingReminders } = await import('./meetingNotify.js')
      await runMeetingReminders()
    } catch (err) {
      logger.warn('Meeting reminders tick failed', { error: err.message })
    }

    // Sync calendar bookings so guests get Meet link + confirmation without opening the UI
    try {
      await syncCalendarBookingsTick()
    } catch (err) {
      logger.warn('Calendar booking sync tick failed', { error: err.message })
    }

    // Resume bulk email campaigns after batch rest / serverless yield
    try {
      const { resumeSendingCampaigns } = await import('./emailWorker.js')
      await resumeSendingCampaigns()
    } catch (err) {
      logger.warn('Email campaign resume tick failed', { error: err.message })
    }

    const due = await ScheduledPost.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    }).limit(10)

    if (due.length) {
      logger.info('Publishing scheduled posts', { count: due.length })
    }
    for (const doc of due) {
      await processScheduled(doc)
    }
  } catch (err) {
    if (isMongoNetworkError(err)) {
      markDisconnected(err)
      resetDbConnection()
      logger.warn('Scheduler paused: database unreachable (DNS/network)', {
        error: err.message,
      })
      return
    }
    logger.error('Scheduler tick failed', { error: err.message })
  }
}

async function processScheduled(doc) {
  try {
    const upgradedState = coerceScheduledImageData(doc.postState || {})
    if (upgradedState !== doc.postState) {
      doc.postState = upgradedState
      doc.markModified('postState')
      await doc.save()
    }

    doc.status = 'publishing'
    await doc.save()

    await refreshLinkedInTokenIfNeeded(doc.workspaceId)
    const config = await getWorkspaceConfig(doc.workspaceId)
    const rawState = doc.postState || { body: doc.body, platforms: {} }
    for (const p of doc.platforms) rawState.platforms[p] = true
    const hydrated = await hydratePostStateMedia(rawState)
    const postState = sanitizePostState(hydrated)

    const outcome = await publishToAllPlatforms({
      platforms: doc.platforms,
      postState,
      config,
      workspaceId: doc.workspaceId,
    })

    if (!outcome.ok) {
      doc.status = 'failed'
      doc.error = outcome.error
      await doc.save()
      broadcastEvent('POST_FAILED', {
        workspaceId: doc.workspaceId,
        id: doc._id.toString(),
        error: outcome.error,
      })
      return
    }

    const published = await PublishedPost.create({
      workspaceId: doc.workspaceId,
      body: doc.body,
      platforms: doc.platforms,
      publishedAt: new Date(),
      platformResults: outcome.results,
      source: 'scheduled',
      scheduledPostId: doc._id,
    })

    doc.status = 'published'
    doc.platformResults = outcome.results
    await doc.save()

    logger.success('Scheduled post published', {
      id: doc._id.toString(),
      platforms: doc.platforms.join(', '),
    })

    broadcastEvent('POST_PUBLISHED', {
      workspaceId: doc.workspaceId,
      id: published._id.toString(),
      scheduledId: doc._id.toString(),
      platforms: doc.platforms,
      title: 'Scheduled Post Published',
      body: `Live on ${doc.platforms.join(', ')}.`,
    })
  } catch (err) {
    logger.error('Scheduled post failed', { id: doc._id.toString(), error: err.message })
    if (isMongoNetworkError(err)) {
      markDisconnected(err)
      resetDbConnection()
      return
    }
    try {
      doc.status = 'failed'
      doc.error = err.message
      await doc.save()
      broadcastEvent('POST_FAILED', {
        workspaceId: doc.workspaceId,
        id: doc._id.toString(),
        error: err.message,
      })
    } catch {
      /* DB may be down */
    }
  }
}
