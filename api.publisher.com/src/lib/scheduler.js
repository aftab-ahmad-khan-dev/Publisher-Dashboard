import { ScheduledPost } from '../models/ScheduledPost.js'
import { PublishedPost } from '../models/PublishedPost.js'
import { getWorkspaceConfig } from './configStore.js'
import { refreshLinkedInTokenIfNeeded } from './linkedinOAuth.js'
import { publishToAllPlatforms } from './publishers/index.js'
import { broadcastEvent } from './events.js'
import { sanitizePostState } from './contentSanitize.js'
import { logger } from './logger.js'
import { isMongoNetworkError, markDisconnected } from '../db.js'
import { resetDbConnection } from './dbInit.js'

let timer = null

export function startScheduler() {
  if (timer) return
  timer = setInterval(() => {
    runDuePosts().catch(() => {})
  }, 15_000)
  runDuePosts().catch(() => {})
  logger.info('Scheduler started', { interval: '15s' })
}

export async function runDuePosts() {
  try {
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
    doc.status = 'publishing'
    await doc.save()

    await refreshLinkedInTokenIfNeeded(doc.workspaceId)
    const config = await getWorkspaceConfig(doc.workspaceId)
    const rawState = doc.postState || { body: doc.body, platforms: {} }
    for (const p of doc.platforms) rawState.platforms[p] = true
    const postState = sanitizePostState(rawState)

    const outcome = await publishToAllPlatforms({
      platforms: doc.platforms,
      postState,
      config,
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
