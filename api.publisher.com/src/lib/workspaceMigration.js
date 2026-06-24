import { clerkEnabled, contentWorkspaceId } from '../middleware/workspace.js'
import { WorkspaceMigration } from '../models/WorkspaceMigration.js'
import { ApiConfig } from '../models/ApiConfig.js'
import { Draft } from '../models/Draft.js'
import { ScheduledPost } from '../models/ScheduledPost.js'
import { PublishedPost } from '../models/PublishedPost.js'
import { Media } from '../models/Media.js'
import { EmailCampaign } from '../models/EmailCampaign.js'
import { EmailRecipient } from '../models/EmailRecipient.js'
import { EmailTemplateDraft } from '../models/EmailTemplateDraft.js'
import { logger } from './logger.js'

/** Pre-Clerk single-tenant workspace ids (platform-owner data only). */
const LEGACY_WORKSPACE_IDS = ['joseph-morgan']

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'aftabahmadkhan.dev@gmail.com').toLowerCase()

async function migrationDone(clerkUserId, fromWorkspaceId) {
  const hit = await WorkspaceMigration.exists({ clerkUserId, fromWorkspaceId })
  return Boolean(hit)
}

async function recordMigration(clerkUserId, fromWorkspaceId, toWorkspaceId) {
  await WorkspaceMigration.updateOne(
    { clerkUserId, fromWorkspaceId },
    { $set: { toWorkspaceId, completedAt: new Date() } },
    { upsert: true },
  )
}

async function workspaceHasAnyData(workspaceId) {
  const [scheduled, drafts, published, config, media] = await Promise.all([
    ScheduledPost.countDocuments({ workspaceId }),
    Draft.countDocuments({ workspaceId }),
    PublishedPost.countDocuments({ workspaceId }),
    ApiConfig.exists({ workspaceId }),
    Media.exists({ workspaceId }),
  ])
  return scheduled > 0 || drafts > 0 || published > 0 || Boolean(config) || Boolean(media)
}

function sectionHasValues(section) {
  if (!section || typeof section !== 'object') return false
  return Object.values(section).some((value) => {
    if (value == null || value === '') return false
    if (typeof value === 'boolean') return value
    if (value instanceof Date) return true
    if (typeof value === 'object') return sectionHasValues(value)
    return true
  })
}

async function mergeApiConfig(fromId, toId) {
  const [from, to] = await Promise.all([
    ApiConfig.findOne({ workspaceId: fromId }),
    ApiConfig.findOne({ workspaceId: toId }),
  ])
  if (!from) return

  if (!to) {
    from.workspaceId = toId
    await from.save()
    return
  }

  const sections = ['meta', 'linkedin', 'reddit', 'quora', 'pinterest', 'threads', 'gmail', 'defaults']
  for (const key of sections) {
    if (!sectionHasValues(to[key]) && sectionHasValues(from[key])) {
      to[key] = from[key]
      to.markModified(key)
    }
  }
  if (from.webhookUrl && !to.webhookUrl) to.webhookUrl = from.webhookUrl
  if (from.notificationsEnabled != null && to.notificationsEnabled == null) {
    to.notificationsEnabled = from.notificationsEnabled
  }
  await to.save()
  await ApiConfig.deleteOne({ _id: from._id })
}

async function moveUniqueDoc(Model, fromId, toId) {
  if (Model === ApiConfig) {
    await mergeApiConfig(fromId, toId)
    return
  }

  const from = await Model.findOne({ workspaceId: fromId })
  if (!from) return

  const existing = await Model.findOne({ workspaceId: toId })
  if (existing) {
    await Model.deleteOne({ _id: from._id })
    return
  }

  from.workspaceId = toId
  await from.save()
}

async function migrateWorkspace(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return
  logger.info('One-time workspace consolidation', { from: fromId, to: toId })

  await moveUniqueDoc(ApiConfig, fromId, toId)
  await moveUniqueDoc(EmailTemplateDraft, fromId, toId)

  const collections = [Draft, ScheduledPost, PublishedPost, Media, EmailCampaign, EmailRecipient]
  for (const Model of collections) {
    await Model.updateMany({ workspaceId: fromId }, { $set: { workspaceId: toId } })
  }
}

async function fetchClerkUserEmail(clerkUserId) {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) return ''
  const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  if (!res.ok) return ''
  const user = await res.json()
  const primaryId = user.primary_email_address_id
  const match = user.email_addresses?.find((e) => e.id === primaryId)
  return (match?.email_address || user.email_addresses?.[0]?.email_address || '').toLowerCase()
}

async function listSoloOrgWorkspaceIds(clerkUserId) {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret || !clerkUserId) return []

  const res = await fetch(
    `https://api.clerk.com/v1/users/${clerkUserId}/organization_memberships?limit=50`,
    { headers: { Authorization: `Bearer ${secret}` } },
  )
  if (!res.ok) return []

  const body = await res.json()
  const rows = Array.isArray(body) ? body : body.data || []
  return rows
    .filter((row) => (row.organization?.members_count ?? 1) <= 1)
    .map((row) => row.organization?.id || row.organization_id)
    .filter(Boolean)
    .map((id) => id.toLowerCase().slice(0, 64))
}

async function legacyMigrationAllowed(clerkUserId, userEmail) {
  if (userEmail === ADMIN_EMAIL) return true

  const res = await fetch('https://api.clerk.com/v1/users?limit=2', {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  })
  if (!res.ok) return false
  const users = await res.json()
  const count = Array.isArray(users) ? users.length : users.total_count ?? 0
  return count <= 1
}

async function sourcesForUser(clerkUserId, userEmail) {
  const sources = []

  for (const legacyId of LEGACY_WORKSPACE_IDS) {
    if (await legacyMigrationAllowed(clerkUserId, userEmail)) {
      sources.push(legacyId)
    }
  }

  const soloOrgs = await listSoloOrgWorkspaceIds(clerkUserId)
  sources.push(...soloOrgs)

  return [...new Set(sources)]
}

/**
 * One-time consolidation into the canonical `user_<clerkUserId>` workspace.
 * Runs once per source workspace per user — never moves data on org switch.
 */
export async function consolidateUserWorkspacesOnce(clerkUserId) {
  if (!clerkEnabled || !clerkUserId) return false

  const canonicalId = contentWorkspaceId(clerkUserId)
  const userEmail = await fetchClerkUserEmail(clerkUserId)
  const sources = await sourcesForUser(clerkUserId, userEmail)

  let migrated = false
  for (const fromId of sources) {
    if (fromId === canonicalId) continue
    if (await migrationDone(clerkUserId, fromId)) continue
    if (!(await workspaceHasAnyData(fromId))) {
      await recordMigration(clerkUserId, fromId, canonicalId)
      continue
    }

    await migrateWorkspace(fromId, canonicalId)
    await recordMigration(clerkUserId, fromId, canonicalId)
    migrated = true
  }

  return migrated
}

/** @deprecated */
export async function migrateIntoWorkspaceIfNeeded(targetWorkspaceId, clerkUserId) {
  return consolidateUserWorkspacesOnce(clerkUserId)
}

/** One-off helper for scripts / manual recovery. */
export async function migrateWorkspaceNow(fromId, toId) {
  await migrateWorkspace(fromId, toId)
}
