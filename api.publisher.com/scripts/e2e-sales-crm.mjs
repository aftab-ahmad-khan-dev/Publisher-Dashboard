/**
 * End-to-end Sales Tracker CRM smoke test.
 * Mounts /api/sales with mocked workspace + admin email (plan gate bypass),
 * hits the real MongoDB, then cleans up.
 *
 * Usage: node scripts/e2e-sales-crm.mjs
 */
import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import salesRoutes from '../src/routes/sales.js'
import { EmailRecipient } from '../src/models/EmailRecipient.js'
import { SalesTeam } from '../src/models/SalesTeam.js'
import { SalesActivity } from '../src/models/SalesActivity.js'
import { Subscription } from '../src/models/Subscription.js'

const PORT = 3099
const WS = `e2e_sales_${Date.now()}`
const ADMIN_EMAIL = 'aftabahmadkhan.dev@gmail.com'
const BASE = `http://127.0.0.1:${PORT}/api`

const results = []
function pass(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail })
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': ADMIN_EMAIL,
      'X-Admin-Email': ADMIN_EMAIL,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

async function cleanup() {
  await EmailRecipient.deleteMany({ workspaceId: WS })
  await SalesTeam.deleteMany({ ownerWorkspaceId: WS })
  await SalesActivity.deleteMany({ workspaceId: WS })
  await Subscription.deleteMany({ workspaceId: WS })
}

async function main() {
  console.log('\n══ Sales CRM E2E ══════════════════════════════════════')
  console.log(`Workspace: ${WS}`)

  if (!process.env.DATABASE?.trim()) {
    throw new Error('DATABASE env is not set')
  }

  await mongoose.connect(process.env.DATABASE)
  console.log('MongoDB connected\n')

  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    req.workspaceId = WS
    req.clerkUserId = 'user_e2e_sales_test'
    next()
  })
  app.use('/api', salesRoutes)

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s))
  })
  console.log(`Test server http://127.0.0.1:${PORT}\n`)

  let leadId = null
  let inviteToken = null

  try {
    // 1. Empty board
    {
      const { status, data } = await req('GET', '/sales/leads')
      if (status === 200 && data.ok && Array.isArray(data.leads) && data.leads.length === 0) {
        pass('GET /sales/leads empty board')
      } else fail('GET /sales/leads empty board', `status=${status} ${JSON.stringify(data).slice(0, 120)}`)
    }

    // 2. Create lead
    {
      const { status, data } = await req('POST', '/sales/leads', {
        name: 'E2E Lead',
        email: 'e2e.lead@example.com',
        company: 'Acme Test Co',
        phone: '+1-555-0100',
        source: 'E2E',
        setterName: 'Setter Sam',
        closerName: 'Closer Casey',
        pipelineStage: 'new',
        firstContactAt: new Date().toISOString(),
        meetingBookedAt: new Date().toISOString(),
        meetingDateAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        offerMade: false,
        depositAmount: 0,
        totalDealValue: 5000,
        commissionPercent: 10,
      })
      if (status === 201 && data.ok && data.lead?.id && data.lead.pipelineStage === 'new') {
        leadId = data.lead.id
        pass('POST /sales/leads create', leadId)
      } else fail('POST /sales/leads create', `status=${status} ${JSON.stringify(data).slice(0, 200)}`)
    }

    // 3. Move to proposal
    if (leadId) {
      const { status, data } = await req('PATCH', `/sales/leads/${leadId}`, {
        pipelineStage: 'proposal',
        offerMade: true,
      })
      if (status === 200 && data.lead?.pipelineStage === 'proposal' && data.lead.offerMade) {
        pass('PATCH move → proposal + offer')
      } else fail('PATCH move → proposal + offer', JSON.stringify(data).slice(0, 160))
    }

    // 4. Lost without reason should fail
    if (leadId) {
      const { status, data } = await req('PATCH', `/sales/leads/${leadId}`, {
        pipelineStage: 'lost',
      })
      if (status === 400) {
        pass('PATCH lost without reason → 400')
      } else fail('PATCH lost without reason → 400', `status=${status}`)
    }

    // 5. Move to won with money
    if (leadId) {
      const { status, data } = await req('PATCH', `/sales/leads/${leadId}`, {
        pipelineStage: 'won',
        saleType: 'one_call',
        crmMeetingOutcome: 'show',
        depositAmount: 1000,
        cashCollected: 5000,
        datePaidInFull: new Date().toISOString(),
        refundAmount: 0,
        commissionPercent: 10,
      })
      const earn = data.lead?.earnings
      if (status === 200 && data.lead?.pipelineStage === 'won' && earn === 500) {
        pass('PATCH → won + earnings auto-calc', `earnings=${earn}`)
      } else fail('PATCH → won + earnings', `status=${status} earnings=${earn} ${JSON.stringify(data.lead || data).slice(0, 160)}`)
    }

    // 6. Touch
    if (leadId) {
      const { status, data } = await req('POST', `/sales/leads/${leadId}/touch`, {})
      if (status === 200 && data.lead?.lastTouchAt) {
        pass('POST /sales/leads/:id/touch')
      } else fail('POST touch', `status=${status}`)
    }

    // 7. Aging follow-up lead + leak flags
    {
      const aged = await EmailRecipient.create({
        workspaceId: WS,
        email: 'aging@example.com',
        name: 'Aging Lead',
        status: 'cancelled',
        meetingStatus: 'none',
        pipelineStage: 'follow_up_ongoing',
        lastTouchAt: new Date(Date.now() - 10 * 86400000),
        setterName: 'Setter Sam',
      })
      const { status, data } = await req('GET', '/sales/leads')
      const found = (data.leads || []).find((l) => l.id === String(aged._id))
      if (status === 200 && found?.leakFlags?.followUpAging && found.hasLeak) {
        pass('Leak flag: follow-up aging 7d+')
      } else fail('Leak flag: follow-up aging', JSON.stringify(found?.leakFlags || data).slice(0, 160))
    }

    // 8. Daily activity
    {
      const { status, data } = await req('PUT', '/sales/activity', {
        date: new Date().toISOString().slice(0, 10),
        setterName: 'Setter Sam',
        dials: 40,
        dmsSent: 15,
        conversations: 8,
      })
      if (status === 200 && data.activity?.dials === 40) {
        pass('PUT /sales/activity')
      } else fail('PUT /sales/activity', `status=${status}`)
    }

    // 9. Team roster + goal
    {
      const { status, data } = await req('PUT', '/sales/team', {
        revenueGoal: 50000,
        members: [
          { name: 'Setter Sam', role: 'setter', commissionPercent: 5 },
          { name: 'Closer Casey', role: 'closer', commissionPercent: 10 },
        ],
      })
      if (
        status === 200 &&
        data.team?.revenueGoal === 50000 &&
        data.team?.members?.length === 2 &&
        data.team?.isOwner
      ) {
        pass('PUT /sales/team roster + goal')
      } else fail('PUT /sales/team', `status=${status} ${JSON.stringify(data).slice(0, 160)}`)
    }

    // 10. Invite
    {
      const { status, data } = await req('POST', '/sales/team/invite', {
        email: 'setter.invitee@example.com',
        name: 'Invitee',
        role: 'setter',
      })
      inviteToken = data.invite?.token
      if (status === 200 && inviteToken) {
        pass('POST /sales/team/invite', inviteToken.slice(0, 8) + '…')
      } else fail('POST /sales/team/invite', `status=${status}`)
    }

    // 11. Metrics
    {
      const { status, data } = await req('GET', '/sales/metrics')
      const m = data.metrics
      if (
        status === 200 &&
        m?.setter?.dials === 40 &&
        m?.closer?.oneCallSales >= 1 &&
        m?.money?.netRevenue >= 5000 &&
        m?.money?.revenueGoal === 50000 &&
        m?.leaks?.followUpAging >= 1
      ) {
        pass(
          'GET /sales/metrics',
          `dials=${m.setter.dials} wins=${m.closer.totalSales} net=${m.money.netRevenue} aging=${m.leaks.followUpAging}`,
        )
      } else fail('GET /sales/metrics', JSON.stringify(m || data).slice(0, 240))
    }

    // 12. Projection
    {
      const { status, data } = await req('GET', '/sales/projection')
      const p = data.projection
      if (
        status === 200 &&
        p?.endOfMonth?.best &&
        p?.endOfMonth?.expected &&
        p?.endOfMonth?.worst &&
        typeof p.assumptions?.scheduledMeetings === 'number'
      ) {
        pass(
          'GET /sales/projection',
          `expected EOM rev=${p.endOfMonth.expected.revenue}`,
        )
      } else fail('GET /sales/projection', JSON.stringify(p || data).slice(0, 200))
    }

    // 13. Promote (from another recipient in same workspace)
    {
      const mailLead = await EmailRecipient.create({
        workspaceId: WS,
        email: 'mailbox.promote@example.com',
        name: 'Mailbox Lead',
        company: 'Promote Co',
        status: 'sent',
        meetingStatus: 'scheduled',
        meetingScheduledAt: new Date(Date.now() + 86400000),
        pipelineStage: '',
      })
      const { status, data } = await req('POST', '/sales/leads/promote', {
        recipientIds: [String(mailLead._id)],
      })
      const promoted = data.leads?.[0]
      if (
        status === 200 &&
        promoted?.pipelineStage === 'meeting_follow_up' &&
        promoted?.name === 'Mailbox Lead'
      ) {
        pass('POST /sales/leads/promote', promoted.pipelineStage)
      } else fail('POST /sales/leads/promote', JSON.stringify(data).slice(0, 200))
    }

    // 14. Remove from board
    if (leadId) {
      const { status, data } = await req('DELETE', `/sales/leads/${leadId}`)
      const list = await req('GET', '/sales/leads')
      const still = (list.data.leads || []).some((l) => l.id === leadId)
      if (status === 200 && data.removed && !still) {
        pass('DELETE remove from board')
      } else fail('DELETE remove from board', `status=${status} still=${still}`)
    }

    // 15. Frontend /sales route reachable
    {
      let web
      try {
        web = await fetch('http://127.0.0.1:5173/sales')
      } catch (e) {
        try {
          web = await fetch('http://localhost:5173/sales')
        } catch (e2) {
          web = { ok: false, status: 0, error: e2.message }
        }
      }
      if (web.ok || web.status === 200) {
        pass('Frontend GET /sales (Vite)', `status=${web.status}`)
      } else fail('Frontend GET /sales', web.error || `status=${web.status}`)
    }

    // 16. Live API has sales mount (expects auth redirect/401 without token)
    {
      const live = await fetch('http://127.0.0.1:3001/api/sales/leads', { redirect: 'manual' })
      if (live.status === 302 || live.status === 401 || live.status === 200) {
        pass('Live API /api/sales/leads mounted', `status=${live.status}`)
      } else fail('Live API sales mount', `status=${live.status}`)
    }
  } finally {
    await cleanup()
    console.log('\nCleanup done')
    await new Promise((resolve) => server.close(resolve))
    await mongoose.disconnect()
  }

  const failed = results.filter((r) => !r.ok)
  console.log('\n════════════════════════════════════════════════════')
  console.log(`Results: ${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    console.log('Failed:')
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`))
    process.exit(1)
  }
  console.log('All E2E checks passed.\n')
}

main().catch((err) => {
  console.error('\nE2E crashed:', err)
  process.exit(1)
})
