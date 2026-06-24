import { Router } from 'express'
import { requirePlatformAdmin } from '../middleware/admin.js'
import { Draft } from '../models/Draft.js'
import { ScheduledPost } from '../models/ScheduledPost.js'
import { PublishedPost } from '../models/PublishedPost.js'
import { ApiConfig } from '../models/ApiConfig.js'

const router = Router()

function mapCounts(rows) {
  const out = {}
  for (const row of rows) out[row._id] = row.count
  return out
}

function connectionFlags(config) {
  if (!config) {
    return { meta: false, linkedin: false, reddit: false, pinterest: false, threads: false, gmail: false }
  }
  return {
    meta: Boolean(config.meta?.appId && (config.meta?.pageToken || config.meta?.appSecret)),
    linkedin: Boolean(config.linkedin?.clientId && config.linkedin?.accessToken),
    reddit: Boolean(config.reddit?.clientId && config.reddit?.refreshToken),
    pinterest: Boolean(config.pinterest?.accessToken),
    threads: Boolean(config.threads?.accessToken),
    gmail: Boolean(config.gmail?.accessToken || config.gmail?.refreshToken),
  }
}

async function listClerkUsers() {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) return null

  const users = []
  let offset = 0
  const limit = 100

  while (true) {
    const res = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=-created_at`,
      { headers: { Authorization: `Bearer ${secret}` } },
    )
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Clerk users API failed (${res.status}): ${err.slice(0, 120)}`)
    }
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    users.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }

  return users
}

async function listWorkspaceIds() {
  const [fromConfig, fromDrafts, fromScheduled, fromPublished] = await Promise.all([
    ApiConfig.distinct('workspaceId'),
    Draft.distinct('workspaceId'),
    ScheduledPost.distinct('workspaceId'),
    PublishedPost.distinct('workspaceId'),
  ])
  return [...new Set([...fromConfig, ...fromDrafts, ...fromScheduled, ...fromPublished])].filter(
    Boolean,
  )
}

function workspaceLabel(workspaceId) {
  if (workspaceId.startsWith('user_')) {
    return workspaceId.replace(/^user_/, '').slice(0, 12) + '…'
  }
  return workspaceId
}

async function loadWorkspaceStats(workspaceIds) {
  const [draftCounts, scheduledCounts, publishedCounts, configs] = await Promise.all([
    Draft.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
    ]),
    ScheduledPost.aggregate([
      {
        $match: {
          workspaceId: { $in: workspaceIds },
          status: { $in: ['scheduled', 'publishing', 'failed'] },
        },
      },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
    ]),
    PublishedPost.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
    ]),
    ApiConfig.find({ workspaceId: { $in: workspaceIds } })
      .select('workspaceId meta linkedin reddit pinterest threads gmail createdAt updatedAt')
      .lean(),
  ])

  return {
    draftsByWs: mapCounts(draftCounts),
    scheduledByWs: mapCounts(scheduledCounts),
    publishedByWs: mapCounts(publishedCounts),
    configByWs: Object.fromEntries(configs.map((c) => [c.workspaceId, c])),
  }
}

function mapClerkUser(u, stats) {
  const workspaceId = `user_${u.id}`.toLowerCase()
  const email =
    u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ||
    u.email_addresses?.[0]?.email_address ||
    ''
  const config = stats.configByWs[workspaceId]

  return {
    id: u.id,
    workspaceId,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || email || 'User',
    email,
    imageUrl: u.image_url || null,
    createdAt: u.created_at ? new Date(u.created_at).toISOString() : null,
    lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null,
    lastActiveAt: u.last_active_at ? new Date(u.last_active_at).toISOString() : null,
    stats: {
      drafts: stats.draftsByWs[workspaceId] || 0,
      scheduled: stats.scheduledByWs[workspaceId] || 0,
      published: stats.publishedByWs[workspaceId] || 0,
    },
    connections: connectionFlags(config),
    hasApiConfig: Boolean(config),
    configUpdatedAt: config?.updatedAt?.toISOString?.() || null,
  }
}

function mapWorkspaceUser(workspaceId, stats) {
  const config = stats.configByWs[workspaceId]
  const email = config?.gmail?.fromEmail?.trim() || ''

  return {
    id: workspaceId,
    workspaceId,
    name: workspaceLabel(workspaceId),
    email,
    imageUrl: null,
    createdAt: config?.createdAt?.toISOString?.() || null,
    lastSignInAt: null,
    lastActiveAt: config?.updatedAt?.toISOString?.() || null,
    stats: {
      drafts: stats.draftsByWs[workspaceId] || 0,
      scheduled: stats.scheduledByWs[workspaceId] || 0,
      published: stats.publishedByWs[workspaceId] || 0,
    },
    connections: connectionFlags(config),
    hasApiConfig: Boolean(config),
    configUpdatedAt: config?.updatedAt?.toISOString?.() || null,
  }
}

router.get('/admin/users', requirePlatformAdmin, async (_req, res, next) => {
  try {
    const clerkUsers = await listClerkUsers()

    if (clerkUsers) {
      const workspaceIds = clerkUsers.map((u) => `user_${u.id}`.toLowerCase())
      const stats = await loadWorkspaceStats(workspaceIds)
      const users = clerkUsers.map((u) => mapClerkUser(u, stats))
      return res.json({ ok: true, users, total: users.length, source: 'clerk' })
    }

    const workspaceIds = await listWorkspaceIds()
    const stats = await loadWorkspaceStats(workspaceIds)
    const users = workspaceIds
      .map((workspaceId) => mapWorkspaceUser(workspaceId, stats))
      .sort((a, b) => {
        const aTime = a.configUpdatedAt || a.createdAt || ''
        const bTime = b.configUpdatedAt || b.createdAt || ''
        return bTime.localeCompare(aTime)
      })

    res.json({
      ok: true,
      users,
      total: users.length,
      source: 'database',
      note: 'Set CLERK_SECRET_KEY in api.publisher.com/.env to list all Clerk sign-ups.',
    })
  } catch (err) {
    next(err)
  }
})

export default router
