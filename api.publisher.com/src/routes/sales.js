import { Router } from 'express'
import crypto from 'crypto'
import { EmailRecipient, PIPELINE_STAGE_VALUES, LOSS_REASON_VALUES } from '../models/EmailRecipient.js'
import { SalesActivity } from '../models/SalesActivity.js'
import { requirePlanFeature } from '../middleware/planGate.js'
import {
  resolveSalesWorkspace,
  ensureSalesTeam,
  mapTeam,
} from '../lib/salesWorkspace.js'
import {
  mapSalesLead,
  applyCrmPatch,
  buildSalesMetrics,
  buildSalesProjection,
  num,
} from '../lib/salesMetrics.js'

const router = Router()

async function withSalesCtx(req, res) {
  const ctx = await resolveSalesWorkspace(req)
  if (!ctx.salesWorkspaceId) {
    res.status(401).json({ ok: false, error: 'Unauthorized' })
    return null
  }
  return ctx
}

function userEmail(req) {
  return (
    req.headers['x-user-email'] ||
    req.auth?.sessionClaims?.email ||
    ''
  )
}

/** GET /sales/leads */
router.get('/sales/leads', async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return

    const filter = {
      workspaceId: ctx.salesWorkspaceId,
      pipelineStage: { $nin: ['', null] },
    }

    const stage = String(req.query.stage || '').trim()
    if (stage) filter.pipelineStage = stage

    const setter = String(req.query.setter || '').trim()
    if (setter) filter.setterName = setter

    const closer = String(req.query.closer || '').trim()
    if (closer) filter.closerName = closer

    const source = String(req.query.source || '').trim()
    if (source) filter.source = source

    const q = String(req.query.q || '').trim()
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { name: rx },
        { email: rx },
        { company: rx },
        { phone: rx },
        { source: rx },
      ]
    }

    const sortKey = String(req.query.sort || 'updatedAt')
    const sortDir = String(req.query.dir || 'desc') === 'asc' ? 1 : -1
    const allowedSort = new Set([
      'updatedAt',
      'createdAt',
      'name',
      'company',
      'pipelineStage',
      'totalDealValue',
      'cashCollected',
      'lastTouchAt',
      'setterName',
      'closerName',
    ])
    const sort = { [allowedSort.has(sortKey) ? sortKey : 'updatedAt']: sortDir }

    const leads = await EmailRecipient.find(filter).sort(sort).lean()
    const now = new Date()
    res.json({
      ok: true,
      leads: leads.map((l) => mapSalesLead(l, now)),
      stages: PIPELINE_STAGE_VALUES,
    })
  } catch (err) {
    next(err)
  }
})

/** POST /sales/leads — create manual CRM lead */
router.post('/sales/leads', requirePlanFeature('email'), async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return

    const body = req.body || {}
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    if (!name && !email) {
      return res.status(400).json({ ok: false, error: 'Name or email is required' })
    }

    const stage = PIPELINE_STAGE_VALUES.includes(body.pipelineStage)
      ? body.pipelineStage
      : 'new'

    if (stage === 'lost' && !LOSS_REASON_VALUES.includes(body.lossReason)) {
      return res.status(400).json({
        ok: false,
        error: 'Loss reason is required when stage is Lost',
      })
    }

    const doc = new EmailRecipient({
      workspaceId: ctx.salesWorkspaceId,
      campaignId: undefined,
      email: email || `${Date.now()}@crm.local`,
      name,
      company: String(body.company || '').trim(),
      status: 'cancelled',
      meetingStatus: 'none',
      mailboxFolder: 'inbox',
      pipelineStage: stage,
      lastTouchAt: new Date(),
    })

    applyCrmPatch(doc, body)
    doc.pipelineStage = stage
    if (!doc.lastTouchAt) doc.lastTouchAt = new Date()

    await doc.save()
    res.status(201).json({ ok: true, lead: mapSalesLead(doc.toObject()) })
  } catch (err) {
    next(err)
  }
})

/** POST /sales/leads/promote — add Mail Box recipients to board */
router.post(
  '/sales/leads/promote',
  requirePlanFeature('email'),
  async (req, res, next) => {
    try {
      const ctx = await withSalesCtx(req, res)
      if (!ctx) return

      const ids = Array.isArray(req.body?.recipientIds)
        ? req.body.recipientIds
        : req.body?.id
          ? [req.body.id]
          : []
      if (!ids.length) {
        return res.status(400).json({ ok: false, error: 'recipientIds required' })
      }

      const personalWs = req.workspaceId
      const recipients = await EmailRecipient.find({
        _id: { $in: ids },
        workspaceId: { $in: [personalWs, ctx.salesWorkspaceId] },
      })

      const now = new Date()
      const updated = []
      for (const r of recipients) {
        const scheduled =
          r.meetingStatus === 'scheduled' ||
          r.meetingStatus === 'completed' ||
          Boolean(r.meetingScheduledAt)
        const stage = scheduled ? 'meeting_follow_up' : 'new'

        // Already on the shared board
        if (
          r.workspaceId === ctx.salesWorkspaceId &&
          r.pipelineStage &&
          r.pipelineStage !== ''
        ) {
          updated.push(mapSalesLead(r.toObject(), now))
          continue
        }

        // Same tenant as CRM board — promote in place
        if (r.workspaceId === ctx.salesWorkspaceId) {
          r.pipelineStage = stage
          if (r.meetingScheduledAt) {
            if (!r.meetingBookedAt) r.meetingBookedAt = r.meetingScheduledAt
            if (!r.meetingDateAt) r.meetingDateAt = r.meetingScheduledAt
          }
          if (!r.lastTouchAt) r.lastTouchAt = now
          await r.save()
          updated.push(mapSalesLead(r.toObject(), now))
          continue
        }

        // Team member promoting from their own Mail Box into shared board — clone CRM card
        const clone = new EmailRecipient({
          workspaceId: ctx.salesWorkspaceId,
          campaignId: undefined,
          email: r.email || `${Date.now()}@crm.local`,
          name: r.name || '',
          company: r.company || '',
          phone: r.phone || '',
          status: 'cancelled',
          meetingStatus: r.meetingStatus || 'none',
          meetingScheduledAt: r.meetingScheduledAt,
          meetingBookedAt: r.meetingScheduledAt || null,
          meetingDateAt: r.meetingScheduledAt || null,
          pipelineStage: stage,
          lastTouchAt: now,
          source: 'Mail Box',
        })
        await clone.save()
        updated.push(mapSalesLead(clone.toObject(), now))
      }

      res.json({ ok: true, leads: updated, count: updated.length })
    } catch (err) {
      next(err)
    }
  },
)

/** GET /sales/importable — count Mail Box meetings not yet on the board */
router.get('/sales/importable', async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return

    const filter = {
      workspaceId: { $in: [req.workspaceId, ctx.salesWorkspaceId] },
      $and: [
        {
          $or: [
            { pipelineStage: { $in: ['', null] } },
            { pipelineStage: { $exists: false } },
          ],
        },
        {
          $or: [
            { meetingStatus: { $in: ['invited', 'link_clicked', 'scheduled', 'completed', 'no_show'] } },
            { meetingScheduledAt: { $exists: true, $ne: null } },
            { meetingClickedAt: { $exists: true, $ne: null } },
            { calendarEventId: { $exists: true, $nin: [null, ''] } },
          ],
        },
      ],
    }
    const count = await EmailRecipient.countDocuments(filter)
    res.json({ ok: true, count })
  } catch (err) {
    next(err)
  }
})

/** POST /sales/leads/import-meetings — promote all eligible Mail Box meetings */
router.post(
  '/sales/leads/import-meetings',
  requirePlanFeature('email'),
  async (req, res, next) => {
    try {
      const ctx = await withSalesCtx(req, res)
      if (!ctx) return

      const limit = Math.min(Math.max(Number(req.body?.limit) || 500, 1), 1000)
      const filter = {
        workspaceId: { $in: [req.workspaceId, ctx.salesWorkspaceId] },
        $and: [
          {
            $or: [
              { pipelineStage: { $in: ['', null] } },
              { pipelineStage: { $exists: false } },
            ],
          },
          {
            $or: [
              { meetingStatus: { $in: ['invited', 'link_clicked', 'scheduled', 'completed', 'no_show'] } },
              { meetingScheduledAt: { $exists: true, $ne: null } },
              { meetingClickedAt: { $exists: true, $ne: null } },
              { calendarEventId: { $exists: true, $nin: [null, ''] } },
            ],
          },
        ],
      }

      const recipients = await EmailRecipient.find(filter).limit(limit)
      const now = new Date()
      const updated = []

      for (const r of recipients) {
        const scheduled =
          r.meetingStatus === 'scheduled' ||
          r.meetingStatus === 'completed' ||
          Boolean(r.meetingScheduledAt)
        const stage = scheduled ? 'meeting_follow_up' : 'new'

        if (r.workspaceId === ctx.salesWorkspaceId) {
          r.pipelineStage = stage
          if (r.meetingScheduledAt) {
            if (!r.meetingBookedAt) r.meetingBookedAt = r.meetingScheduledAt
            if (!r.meetingDateAt) r.meetingDateAt = r.meetingScheduledAt
          }
          if (!r.source) r.source = 'Mail Box'
          if (!r.lastTouchAt) r.lastTouchAt = now
          await r.save()
          updated.push(mapSalesLead(r.toObject(), now))
          continue
        }

        const clone = new EmailRecipient({
          workspaceId: ctx.salesWorkspaceId,
          campaignId: undefined,
          email: r.email || `${Date.now()}@crm.local`,
          name: r.name || '',
          company: r.company || '',
          phone: r.phone || '',
          status: 'cancelled',
          meetingStatus: r.meetingStatus || 'none',
          meetingScheduledAt: r.meetingScheduledAt,
          meetingBookedAt: r.meetingScheduledAt || null,
          meetingDateAt: r.meetingScheduledAt || null,
          pipelineStage: stage,
          lastTouchAt: now,
          source: 'Mail Box',
        })
        await clone.save()
        updated.push(mapSalesLead(clone.toObject(), now))
      }

      res.json({
        ok: true,
        count: updated.length,
        leads: updated,
        imported: updated.length,
      })
    } catch (err) {
      next(err)
    }
  },
)

/** GET /sales/leads/:id */
router.get('/sales/leads/:id', async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return

    const doc = await EmailRecipient.findOne({
      _id: req.params.id,
      workspaceId: ctx.salesWorkspaceId,
    }).lean()
    if (!doc || !doc.pipelineStage) {
      return res.status(404).json({ ok: false, error: 'Lead not found on sales board' })
    }
    res.json({ ok: true, lead: mapSalesLead(doc) })
  } catch (err) {
    next(err)
  }
})

/** PATCH /sales/leads/:id */
router.patch(
  '/sales/leads/:id',
  requirePlanFeature('email'),
  async (req, res, next) => {
    try {
      const ctx = await withSalesCtx(req, res)
      if (!ctx) return

      const doc = await EmailRecipient.findOne({
        _id: req.params.id,
        workspaceId: ctx.salesWorkspaceId,
      })
      if (!doc) {
        return res.status(404).json({ ok: false, error: 'Lead not found' })
      }
      if (!doc.pipelineStage) {
        return res.status(400).json({
          ok: false,
          error: 'Lead is not on the sales board — promote it first',
        })
      }

      const body = req.body || {}
      const nextStage =
        body.pipelineStage !== undefined ? body.pipelineStage : doc.pipelineStage

      if (nextStage && !PIPELINE_STAGE_VALUES.includes(nextStage) && nextStage !== '') {
        return res.status(400).json({ ok: false, error: 'Invalid pipeline stage' })
      }

      if (nextStage === 'lost') {
        const reason =
          body.lossReason !== undefined ? body.lossReason : doc.lossReason
        if (!LOSS_REASON_VALUES.includes(reason)) {
          return res.status(400).json({
            ok: false,
            error: 'Loss reason is required when moving to Lost',
          })
        }
      }

      applyCrmPatch(doc, body)
      if (body.pipelineStage !== undefined) {
        doc.pipelineStage = body.pipelineStage
      }

      // Auto last-touch on meaningful edits unless explicitly set
      if (body.lastTouchAt === undefined) {
        doc.lastTouchAt = new Date()
      }

      await doc.save()
      res.json({ ok: true, lead: mapSalesLead(doc.toObject()) })
    } catch (err) {
      next(err)
    }
  },
)

/** POST /sales/leads/:id/touch */
router.post(
  '/sales/leads/:id/touch',
  requirePlanFeature('email'),
  async (req, res, next) => {
    try {
      const ctx = await withSalesCtx(req, res)
      if (!ctx) return

      const doc = await EmailRecipient.findOne({
        _id: req.params.id,
        workspaceId: ctx.salesWorkspaceId,
        pipelineStage: { $nin: ['', null] },
      })
      if (!doc) {
        return res.status(404).json({ ok: false, error: 'Lead not found' })
      }
      doc.lastTouchAt = new Date()
      await doc.save()
      res.json({ ok: true, lead: mapSalesLead(doc.toObject()) })
    } catch (err) {
      next(err)
    }
  },
)

/** DELETE /sales/leads/:id — remove from board (clear stage), keep Mail Box row */
router.delete(
  '/sales/leads/:id',
  requirePlanFeature('email'),
  async (req, res, next) => {
    try {
      const ctx = await withSalesCtx(req, res)
      if (!ctx) return

      const doc = await EmailRecipient.findOne({
        _id: req.params.id,
        workspaceId: ctx.salesWorkspaceId,
      })
      if (!doc) {
        return res.status(404).json({ ok: false, error: 'Lead not found' })
      }

      const hard = String(req.query.hard || '') === '1' && !doc.campaignId
      if (hard) {
        await doc.deleteOne()
        return res.json({ ok: true, deleted: true })
      }

      doc.pipelineStage = ''
      await doc.save()
      res.json({ ok: true, removed: true })
    } catch (err) {
      next(err)
    }
  },
)

/** GET /sales/metrics */
router.get('/sales/metrics', async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return
    const metrics = await buildSalesMetrics(ctx.salesWorkspaceId, req.query)
    res.json({ ok: true, metrics })
  } catch (err) {
    next(err)
  }
})

/** GET /sales/projection */
router.get('/sales/projection', async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return
    const projection = await buildSalesProjection(ctx.salesWorkspaceId, req.query)
    res.json({ ok: true, projection })
  } catch (err) {
    next(err)
  }
})

/** GET /sales/team */
router.get('/sales/team', async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return

    let team = ctx.team
    if (!team && ctx.isOwner) {
      const created = await ensureSalesTeam(ctx.salesWorkspaceId, {
        clerkUserId: req.clerkUserId || '',
        email: userEmail(req),
      })
      team = created.toObject ? created.toObject() : created
    }
    res.json({ ok: true, team: mapTeam(team, { isOwner: ctx.isOwner }) })
  } catch (err) {
    next(err)
  }
})

/** PUT /sales/team — update roster + goal (owner only) */
router.put('/sales/team', requirePlanFeature('email'), async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return
    if (!ctx.isOwner) {
      return res.status(403).json({ ok: false, error: 'Only the team owner can edit settings' })
    }

    const team = await ensureSalesTeam(ctx.salesWorkspaceId, {
      clerkUserId: req.clerkUserId || '',
      email: userEmail(req),
    })

    const body = req.body || {}
    if (body.revenueGoal !== undefined) {
      team.revenueGoal = Math.max(0, num(body.revenueGoal))
    }

    if (Array.isArray(body.members)) {
      team.members = body.members.map((m) => ({
        name: String(m.name || '').trim(),
        role: ['setter', 'closer', 'both'].includes(m.role) ? m.role : 'both',
        commissionPercent: Math.max(0, num(m.commissionPercent)),
        clerkUserId: String(m.clerkUserId || ''),
        email: String(m.email || '').toLowerCase().trim(),
        ...(m.id ? { _id: m.id } : {}),
      })).filter((m) => m.name)
    }

    await team.save()
    res.json({ ok: true, team: mapTeam(team.toObject(), { isOwner: true }) })
  } catch (err) {
    next(err)
  }
})

/** POST /sales/team/invite */
router.post(
  '/sales/team/invite',
  requirePlanFeature('email'),
  async (req, res, next) => {
    try {
      const ctx = await withSalesCtx(req, res)
      if (!ctx) return
      if (!ctx.isOwner) {
        return res.status(403).json({ ok: false, error: 'Only the team owner can invite' })
      }

      const email = String(req.body?.email || '').toLowerCase().trim()
      const name = String(req.body?.name || '').trim()
      const role = ['setter', 'closer', 'both'].includes(req.body?.role)
        ? req.body.role
        : 'both'
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is required' })
      }

      const team = await ensureSalesTeam(ctx.salesWorkspaceId, {
        clerkUserId: req.clerkUserId || '',
        email: userEmail(req),
      })

      team.invites = (team.invites || []).filter(
        (i) => i.email !== email && new Date(i.expiresAt) > new Date(),
      )
      const token = crypto.randomBytes(24).toString('hex')
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      team.invites.push({ email, name, role, token, expiresAt })

      // Ensure roster entry
      const existing = team.members.find(
        (m) => m.email === email || (name && m.name === name),
      )
      if (!existing) {
        team.members.push({
          name: name || email.split('@')[0],
          role,
          email,
          commissionPercent: num(req.body?.commissionPercent),
        })
      }

      await team.save()
      res.json({
        ok: true,
        invite: { email, role, token, expiresAt: expiresAt.toISOString() },
        team: mapTeam(team.toObject(), { isOwner: true }),
      })
    } catch (err) {
      next(err)
    }
  },
)

/** POST /sales/team/accept */
router.post('/sales/team/accept', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim()
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Invite token required' })
    }
    if (!req.clerkUserId) {
      return res.status(401).json({ ok: false, error: 'Sign in to accept an invite' })
    }

    const team = await (await import('../models/SalesTeam.js')).SalesTeam.findOne({
      'invites.token': token,
    })
    if (!team) {
      return res.status(404).json({ ok: false, error: 'Invite not found' })
    }

    const invite = team.invites.find((i) => i.token === token)
    if (!invite || new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ ok: false, error: 'Invite expired' })
    }

    const email = userEmail(req).toLowerCase()
    let member = team.members.find(
      (m) =>
        (invite.email && m.email === invite.email) ||
        (invite.name && m.name === invite.name),
    )
    if (!member) {
      team.members.push({
        name: invite.name || invite.email.split('@')[0],
        role: invite.role,
        email: invite.email,
        clerkUserId: req.clerkUserId,
      })
    } else {
      member.clerkUserId = req.clerkUserId
      if (email) member.email = email
      member.role = invite.role
    }

    team.invites = team.invites.filter((i) => i.token !== token)
    await team.save()

    res.json({
      ok: true,
      team: mapTeam(team.toObject(), { isOwner: false }),
    })
  } catch (err) {
    next(err)
  }
})

/** GET /sales/activity?from=&to=&setter= */
router.get('/sales/activity', async (req, res, next) => {
  try {
    const ctx = await withSalesCtx(req, res)
    if (!ctx) return

    const filter = { workspaceId: ctx.salesWorkspaceId }
    const from = String(req.query.from || '').slice(0, 10)
    const to = String(req.query.to || '').slice(0, 10)
    const setter = String(req.query.setter || '').trim()
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = from
      if (to) filter.date.$lte = to
    }
    if (setter) filter.setterName = setter

    const rows = await SalesActivity.find(filter).sort({ date: -1 }).lean()
    res.json({
      ok: true,
      activity: rows.map((a) => ({
        id: a._id.toString(),
        date: a.date,
        setterName: a.setterName,
        dials: a.dials || 0,
        dmsSent: a.dmsSent || 0,
        conversations: a.conversations || 0,
      })),
    })
  } catch (err) {
    next(err)
  }
})

/** PUT /sales/activity — upsert daily activity */
router.put(
  '/sales/activity',
  requirePlanFeature('email'),
  async (req, res, next) => {
    try {
      const ctx = await withSalesCtx(req, res)
      if (!ctx) return

      const date = String(req.body?.date || new Date().toISOString().slice(0, 10)).slice(0, 10)
      const setterName = String(req.body?.setterName || '').trim()
      if (!setterName) {
        return res.status(400).json({ ok: false, error: 'setterName is required' })
      }

      const row = await SalesActivity.findOneAndUpdate(
        { workspaceId: ctx.salesWorkspaceId, date, setterName },
        {
          $set: {
            dials: Math.max(0, num(req.body?.dials)),
            dmsSent: Math.max(0, num(req.body?.dmsSent)),
            conversations: Math.max(0, num(req.body?.conversations)),
          },
        },
        { upsert: true, new: true },
      )

      res.json({
        ok: true,
        activity: {
          id: row._id.toString(),
          date: row.date,
          setterName: row.setterName,
          dials: row.dials,
          dmsSent: row.dmsSent,
          conversations: row.conversations,
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
