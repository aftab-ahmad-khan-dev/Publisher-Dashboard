import { Router } from 'express'
import { requirePlatformAdmin } from '../middleware/admin.js'
import { Draft } from '../models/Draft.js'
import { ScheduledPost } from '../models/ScheduledPost.js'
import { PublishedPost } from '../models/PublishedPost.js'
import { ApiConfig } from '../models/ApiConfig.js'
import { PaymentSubmission } from '../models/PaymentSubmission.js'
import { Subscription } from '../models/Subscription.js'
import { getOrCreateSubscription } from '../lib/subscription.js'
import { PLAN_PRICES } from '../lib/plans.js'
import { sendMail, isMailerConfigured } from '../lib/mailer.js'
import { logger } from '../lib/logger.js'

const router = Router()

function planLabel(plan) {
  const price = PLAN_PRICES[plan]
  const names = { starter: 'Starter', growth: 'Growth', pro: 'Pro' }
  const formatted =
    price != null && Number.isFinite(Number(price)) ? Number(price).toFixed(2) : null
  return `${names[plan] || plan}${formatted != null ? ` ($${formatted}/mo)` : ''}`
}

async function sendSafeMail(payload) {
  if (!isMailerConfigured()) {
    logger.warn('SMTP not configured — skipped admin billing email', { to: payload.to })
    return
  }
  try {
    await sendMail(payload)
  } catch (err) {
    logger.error('Admin billing email failed', { error: err.message })
  }
}

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
      const subs = await Subscription.find({ workspaceId: { $in: workspaceIds } }).lean()
      const subByWs = Object.fromEntries(subs.map((s) => [s.workspaceId, s]))
      const users = clerkUsers.map((u) => {
        const mapped = mapClerkUser(u, stats)
        const sub = subByWs[mapped.workspaceId]
        return {
          ...mapped,
          subscription: {
            plan: sub?.plan || 'none',
            status: sub?.status || 'unpaid',
            activatedAt: sub?.activatedAt || null,
          },
        }
      })
      return res.json({ ok: true, users, total: users.length, source: 'clerk' })
    }

    const workspaceIds = await listWorkspaceIds()
    const stats = await loadWorkspaceStats(workspaceIds)
    const subs = await Subscription.find({ workspaceId: { $in: workspaceIds } }).lean()
    const subByWs = Object.fromEntries(subs.map((s) => [s.workspaceId, s]))
    const users = workspaceIds
      .map((workspaceId) => {
        const mapped = mapWorkspaceUser(workspaceId, stats)
        const sub = subByWs[workspaceId]
        return {
          ...mapped,
          subscription: {
            plan: sub?.plan || 'none',
            status: sub?.status || 'unpaid',
            activatedAt: sub?.activatedAt || null,
          },
        }
      })
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

router.get('/admin/signups', requirePlatformAdmin, async (_req, res, next) => {
  try {
    const clerkUsers = await listClerkUsers()
    const subs = await Subscription.find({}).sort({ createdAt: -1 }).limit(200).lean()
    const subByWs = Object.fromEntries(subs.map((s) => [s.workspaceId, s]))

    if (clerkUsers) {
      const signups = clerkUsers.map((u) => {
        const workspaceId = `user_${u.id}`.toLowerCase()
        const email =
          u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ||
          u.email_addresses?.[0]?.email_address ||
          ''
        const sub = subByWs[workspaceId]
        return {
          id: u.id,
          workspaceId,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ') || email || 'User',
          email,
          imageUrl: u.image_url || null,
          createdAt: u.created_at ? new Date(u.created_at).toISOString() : null,
          lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null,
          plan: sub?.plan || 'none',
          status: sub?.status || 'unpaid',
          activatedAt: sub?.activatedAt || null,
        }
      })
      return res.json({ ok: true, signups, total: signups.length, source: 'clerk' })
    }

    const signups = subs.map((s) => ({
      id: s.workspaceId,
      workspaceId: s.workspaceId,
      name: s.userEmail || s.workspaceId,
      email: s.userEmail || '',
      imageUrl: null,
      createdAt: s.createdAt,
      lastSignInAt: null,
      plan: s.plan,
      status: s.status,
      activatedAt: s.activatedAt,
    }))
    res.json({ ok: true, signups, total: signups.length, source: 'database' })
  } catch (err) {
    next(err)
  }
})

router.get('/admin/payments', requirePlatformAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = status && ['pending', 'approved', 'rejected'].includes(status) ? { status } : {}
    const rows = await PaymentSubmission.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    res.json({
      ok: true,
      payments: rows.map((p) => ({
        id: p._id.toString(),
        workspaceId: p.workspaceId,
        userEmail: p.userEmail,
        planRequested: p.planRequested,
        bankMethod: p.bankMethod,
        receiptMediaId: p.receiptMediaId,
        receiptUrl: p.receiptUrl,
        note: p.note,
        status: p.status,
        rejectReason: p.rejectReason,
        createdAt: p.createdAt,
        reviewedAt: p.reviewedAt,
        reviewedBy: p.reviewedBy,
      })),
    })
  } catch (err) {
    next(err)
  }
})

router.post('/admin/payments/:id/activate', requirePlatformAdmin, async (req, res, next) => {
  try {
    const payment = await PaymentSubmission.findById(req.params.id)
    if (!payment) {
      return res.status(404).json({ ok: false, error: 'Payment not found' })
    }

    payment.status = 'approved'
    payment.reviewedAt = new Date()
    payment.reviewedBy = req.adminUser?.email || ''
    payment.rejectReason = ''
    await payment.save()

    const sub = await getOrCreateSubscription(payment.workspaceId, payment.userEmail)
    sub.plan = payment.planRequested
    sub.status = 'active'
    sub.activatedAt = new Date()
    sub.activatedBy = req.adminUser?.email || ''
    if (payment.userEmail) sub.userEmail = payment.userEmail
    await sub.save()

    if (payment.userEmail) {
      await sendSafeMail({
        to: payment.userEmail,
        subject: 'Welcome onboard — your plan is active',
        text: [
          `Welcome onboard!`,
          '',
          `Your ${planLabel(payment.planRequested)} plan is now active.`,
          'You can open Publisher Suite and start using your unlocked features.',
          '',
          '— Publisher Suite',
        ].join('\n'),
        html: `
          <p><strong>Welcome onboard!</strong></p>
          <p>Your <strong>${planLabel(payment.planRequested)}</strong> plan is now active.</p>
          <p>You can open Publisher Suite and start using your unlocked features.</p>
          <p>— Publisher Suite</p>
        `,
      })
    }

    res.json({
      ok: true,
      payment: {
        id: payment._id.toString(),
        status: payment.status,
        planRequested: payment.planRequested,
      },
      subscription: {
        plan: sub.plan,
        status: sub.status,
        activatedAt: sub.activatedAt,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/admin/payments/:id/reject', requirePlatformAdmin, async (req, res, next) => {
  try {
    const payment = await PaymentSubmission.findById(req.params.id)
    if (!payment) {
      return res.status(404).json({ ok: false, error: 'Payment not found' })
    }

    const reason = String(req.body?.reason || '').slice(0, 500)
    payment.status = 'rejected'
    payment.reviewedAt = new Date()
    payment.reviewedBy = req.adminUser?.email || ''
    payment.rejectReason = reason
    await payment.save()

    const sub = await getOrCreateSubscription(payment.workspaceId, payment.userEmail)
    if (sub.status === 'pending') {
      sub.status = 'rejected'
      await sub.save()
    }

    if (payment.userEmail) {
      await sendSafeMail({
        to: payment.userEmail,
        subject: 'Payment receipt needs attention',
        text: [
          'We could not activate your plan from the submitted receipt.',
          reason ? `Reason: ${reason}` : 'Please re-upload a clearer receipt from Billing.',
          '',
          '— Publisher Suite',
        ].join('\n'),
      })
    }

    res.json({
      ok: true,
      payment: {
        id: payment._id.toString(),
        status: payment.status,
        rejectReason: payment.rejectReason,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
