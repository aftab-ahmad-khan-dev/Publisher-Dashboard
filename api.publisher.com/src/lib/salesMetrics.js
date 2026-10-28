import { SalesActivity } from '../models/SalesActivity.js'
import { SalesTeam } from '../models/SalesTeam.js'

const DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS = 7 * DAY_MS
const FOUR_DAYS = 4 * DAY_MS
const FOURTEEN_DAYS = 14 * DAY_MS

export function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function pct(numera, denoma) {
  const d = num(denoma)
  if (d <= 0) return 0
  return Math.round((num(numera) / d) * 1000) / 10
}

export function avg(values) {
  const list = (values || []).filter((v) => Number.isFinite(v))
  if (!list.length) return 0
  return list.reduce((a, b) => a + b, 0) / list.length
}

export function computeEarnings(lead) {
  const cash = num(lead.cashCollected)
  const refund = num(lead.refundAmount)
  const commission = num(lead.commissionPercent)
  return Math.round((cash - refund) * (commission / 100) * 100) / 100
}

export function computeLeakFlags(lead, now = new Date()) {
  const flags = {
    bookingLag: false,
    followUpAging: false,
    depositUnpaid: false,
  }

  if (lead.meetingBookedAt && lead.meetingDateAt) {
    const lag = new Date(lead.meetingDateAt) - new Date(lead.meetingBookedAt)
    if (lag > FOUR_DAYS) flags.bookingLag = true
  } else if (lead.meetingBookedAt && !lead.meetingDateAt) {
    const lag = now - new Date(lead.meetingBookedAt)
    if (lag > FOUR_DAYS) flags.bookingLag = true
  }

  if (lead.pipelineStage === 'follow_up_ongoing') {
    const touch = lead.lastTouchAt ? new Date(lead.lastTouchAt) : null
    if (!touch || now - touch >= SEVEN_DAYS) flags.followUpAging = true
  }

  const depositAmt = num(lead.depositAmount)
  if (
    depositAmt > 0 &&
    !lead.datePaidInFull &&
    (lead.pipelineStage === 'deposit' || num(lead.cashCollected) < num(lead.totalDealValue))
  ) {
    const anchor = lead.depositAt
      ? new Date(lead.depositAt)
      : lead.lastTouchAt
        ? new Date(lead.lastTouchAt)
        : lead.updatedAt
          ? new Date(lead.updatedAt)
          : null
    if (anchor && now - anchor >= FOURTEEN_DAYS) flags.depositUnpaid = true
  }

  return flags
}

function iso(d) {
  if (!d) return null
  try {
    return new Date(d).toISOString()
  } catch {
    return null
  }
}

export function mapSalesLead(doc, now = new Date()) {
  const earnings = computeEarnings(doc)
  const flags = computeLeakFlags(doc, now)
  return {
    id: doc._id?.toString?.() || doc.id,
    campaignId: doc.campaignId?.toString?.() || doc.campaignId || null,
    email: doc.email || '',
    name: doc.name || '',
    company: doc.company || '',
    phone: doc.phone || '',
    source: doc.source || '',
    setterName: doc.setterName || '',
    closerName: doc.closerName || '',
    pipelineStage: doc.pipelineStage || '',
    firstContactAt: iso(doc.firstContactAt),
    meetingBookedAt: iso(doc.meetingBookedAt),
    meetingDateAt: iso(doc.meetingDateAt),
    lastTouchAt: iso(doc.lastTouchAt),
    dateCreated: iso(doc.createdAt),
    crmMeetingOutcome: doc.crmMeetingOutcome || '',
    offerMade: Boolean(doc.offerMade),
    saleType: doc.saleType || '',
    lossReason: doc.lossReason || '',
    depositAmount: num(doc.depositAmount),
    totalDealValue: num(doc.totalDealValue),
    cashCollected: num(doc.cashCollected),
    datePaidInFull: iso(doc.datePaidInFull),
    refundAmount: num(doc.refundAmount),
    commissionPercent: num(doc.commissionPercent),
    depositAt: iso(doc.depositAt),
    earnings,
    leakFlags: flags,
    hasLeak: flags.bookingLag || flags.followUpAging || flags.depositUnpaid,
    meetingStatus: doc.meetingStatus || 'none',
    updatedAt: iso(doc.updatedAt),
    createdAt: iso(doc.createdAt),
  }
}

export const CRM_FIELD_KEYS = [
  'name',
  'email',
  'company',
  'phone',
  'source',
  'setterName',
  'closerName',
  'pipelineStage',
  'firstContactAt',
  'meetingBookedAt',
  'meetingDateAt',
  'lastTouchAt',
  'crmMeetingOutcome',
  'offerMade',
  'saleType',
  'lossReason',
  'depositAmount',
  'totalDealValue',
  'cashCollected',
  'datePaidInFull',
  'refundAmount',
  'commissionPercent',
]

export function applyCrmPatch(doc, body) {
  const dateFields = new Set([
    'firstContactAt',
    'meetingBookedAt',
    'meetingDateAt',
    'lastTouchAt',
    'datePaidInFull',
  ])
  const numberFields = new Set([
    'depositAmount',
    'totalDealValue',
    'cashCollected',
    'refundAmount',
    'commissionPercent',
  ])
  const boolFields = new Set(['offerMade'])

  for (const key of CRM_FIELD_KEYS) {
    if (body[key] === undefined) continue
    if (dateFields.has(key)) {
      doc[key] = body[key] ? new Date(body[key]) : null
      continue
    }
    if (numberFields.has(key)) {
      doc[key] = num(body[key])
      continue
    }
    if (boolFields.has(key)) {
      doc[key] = Boolean(body[key])
      continue
    }
    doc[key] = body[key] == null ? '' : String(body[key])
  }

  // Track when deposit first set
  if (
    body.depositAmount !== undefined &&
    num(body.depositAmount) > 0 &&
    !doc.depositAt
  ) {
    doc.depositAt = new Date()
  }

  return doc
}

function inDateRange(lead, from, to, field = 'createdAt') {
  const raw = lead[field] || lead.createdAt
  if (!raw) return !from && !to
  const t = new Date(raw).getTime()
  if (from && t < from.getTime()) return false
  if (to && t > to.getTime()) return false
  return true
}

function parseRange(query) {
  const from = query.from ? new Date(query.from) : null
  let to = query.to ? new Date(query.to) : null
  if (to && !Number.isNaN(to.getTime())) {
    // inclusive end of day if date-only
    if (String(query.to).length <= 10) {
      to = new Date(to)
      to.setHours(23, 59, 59, 999)
    }
  }
  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null,
  }
}

/**
 * Build visibility dashboard metrics from CRM leads + activity logs.
 */
export async function buildSalesMetrics(workspaceId, query = {}) {
  const { EmailRecipient } = await import('../models/EmailRecipient.js')
  const { from, to } = parseRange(query)
  const setterFilter = String(query.setter || '').trim()
  const closerFilter = String(query.closer || '').trim()
  const sourceFilter = String(query.source || '').trim()

  const boardFilter = {
    workspaceId,
    pipelineStage: { $nin: ['', null] },
  }
  if (setterFilter) boardFilter.setterName = setterFilter
  if (closerFilter) boardFilter.closerName = closerFilter
  if (sourceFilter) boardFilter.source = sourceFilter

  const leads = await EmailRecipient.find(boardFilter).lean()
  const now = new Date()

  const filtered = leads.filter((l) => inDateRange(l, from, to, 'createdAt'))

  // Activity
  const activityFilter = { workspaceId }
  if (from || to) {
    activityFilter.date = {}
    if (from) activityFilter.date.$gte = from.toISOString().slice(0, 10)
    if (to) activityFilter.date.$lte = to.toISOString().slice(0, 10)
  }
  if (setterFilter) activityFilter.setterName = setterFilter
  const activities = await SalesActivity.find(activityFilter).lean()

  const dials = activities.reduce((s, a) => s + num(a.dials), 0)
  const dmsSent = activities.reduce((s, a) => s + num(a.dmsSent), 0)
  const conversations = activities.reduce((s, a) => s + num(a.conversations), 0)

  const booked = filtered.filter((l) => l.meetingBookedAt || l.meetingDateAt)
  const callsScheduled = filtered.filter(
    (l) => l.meetingBookedAt || l.meetingDateAt || l.crmMeetingOutcome,
  )
  const shows = filtered.filter((l) => l.crmMeetingOutcome === 'show')
  const noShows = filtered.filter((l) => l.crmMeetingOutcome === 'no_show')
  const cancels = filtered.filter((l) => l.crmMeetingOutcome === 'cancel')
  const declines = filtered.filter(
    (l) => l.crmMeetingOutcome === 'cancel' || l.pipelineStage === 'lost',
  )
  const dqs = filtered.filter((l) => l.crmMeetingOutcome === 'dq')
  const callsTaken = shows.length
  const meetingsSet = callsScheduled.length

  const speedMinutes = filtered
    .filter((l) => l.firstContactAt && l.createdAt)
    .map((l) => (new Date(l.firstContactAt) - new Date(l.createdAt)) / 60000)
    .filter((m) => m >= 0)

  const bookingLagDays = filtered
    .filter((l) => l.meetingBookedAt && l.meetingDateAt)
    .map(
      (l) =>
        (new Date(l.meetingDateAt) - new Date(l.meetingBookedAt)) / DAY_MS,
    )
    .filter((d) => d >= 0)

  const offers = filtered.filter((l) => l.offerMade)
  const wins = filtered.filter((l) => l.pipelineStage === 'won')
  const oneCall = wins.filter((l) => l.saleType === 'one_call')
  const followUpSales = wins.filter((l) => l.saleType === 'follow_up')

  const dealSizes = wins.map((l) => num(l.totalDealValue)).filter((v) => v > 0)
  const avgDealSize = avg(dealSizes)

  const lossReasons = {}
  for (const l of filtered.filter((x) => x.pipelineStage === 'lost')) {
    const r = l.lossReason || 'unknown'
    lossReasons[r] = (lossReasons[r] || 0) + 1
  }

  const agingFollowUps = filtered.filter((l) => {
    if (l.pipelineStage !== 'follow_up_ongoing') return false
    return computeLeakFlags(l, now).followUpAging
  })

  const deposits = filtered.reduce((s, l) => s + num(l.depositAmount), 0)
  const totalSales = wins.reduce((s, l) => s + num(l.totalDealValue), 0)
  const cashCollected = filtered.reduce((s, l) => s + num(l.cashCollected), 0)
  const refunds = filtered.reduce((s, l) => s + num(l.refundAmount), 0)
  const netRevenue = cashCollected - refunds

  const withDeposit = filtered.filter((l) => num(l.depositAmount) > 0)
  const paidInFull = withDeposit.filter((l) => l.datePaidInFull)
  const daysToCollect = paidInFull
    .filter((l) => l.depositAt || l.createdAt)
    .map((l) => {
      const start = new Date(l.depositAt || l.createdAt)
      return (new Date(l.datePaidInFull) - start) / DAY_MS
    })
    .filter((d) => d >= 0)

  const team = await SalesTeam.findOne({ ownerWorkspaceId: workspaceId }).lean()
  const revenueGoal = num(team?.revenueGoal)

  const commissionsByRep = {}
  for (const l of filtered) {
    const rep = l.closerName || l.setterName || 'Unassigned'
    const earn = computeEarnings(l)
    commissionsByRep[rep] = (commissionsByRep[rep] || 0) + earn
  }

  const leakCounts = {
    bookingLag: filtered.filter((l) => computeLeakFlags(l, now).bookingLag).length,
    followUpAging: agingFollowUps.length,
    depositUnpaid: filtered.filter((l) => computeLeakFlags(l, now).depositUnpaid)
      .length,
  }

  const showUpRate = pct(shows.length, meetingsSet || shows.length + noShows.length + cancels.length)
  const offerRate = pct(offers.length, callsTaken || offers.length)
  const closeRate = pct(wins.length, callsTaken || wins.length)
  const closeOnOffers = pct(wins.length, offers.length)

  return {
    filters: {
      from: from?.toISOString() || null,
      to: to?.toISOString() || null,
      setter: setterFilter || null,
      closer: closerFilter || null,
      source: sourceFilter || null,
    },
    setter: {
      dials,
      dmsSent,
      conversations,
      conversationsToBookedPct: pct(booked.length, conversations || booked.length),
      speedToLeadMinutes: Math.round(avg(speedMinutes) * 10) / 10,
      bookingLagDays: Math.round(avg(bookingLagDays) * 10) / 10,
      callsScheduled: meetingsSet,
      callsTaken,
      declines: declines.length,
      cancels: cancels.length,
      noShows: noShows.length,
      showUpRatePct: showUpRate,
      dqRatePct: pct(dqs.length, meetingsSet || dqs.length),
      dqs: dqs.length,
    },
    closer: {
      offerRatePct: offerRate,
      closeRatePct: closeRate,
      closeRateOnOffersPct: closeOnOffers,
      oneCallSales: oneCall.length,
      followUpSales: followUpSales.length,
      totalSales: wins.length,
      averageDealSize: Math.round(avgDealSize * 100) / 100,
      revenuePerCall: callsTaken
        ? Math.round((totalSales / callsTaken) * 100) / 100
        : 0,
      lossReasons,
      followUpAgingCount: agingFollowUps.length,
      offersMade: offers.length,
      callsTaken,
    },
    money: {
      deposits: Math.round(deposits * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      revenueGenerated: Math.round(totalSales * 100) / 100,
      cashCollected: Math.round(cashCollected * 100) / 100,
      depositToPaidInFullPct: pct(paidInFull.length, withDeposit.length),
      avgDaysToCollect: Math.round(avg(daysToCollect) * 10) / 10,
      refunds: Math.round(refunds * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      revenueGoal,
      goalCompletionPct: pct(netRevenue, revenueGoal),
      commissionsByRep,
    },
    leaks: leakCounts,
    agingLeads: agingFollowUps.slice(0, 50).map((l) => mapSalesLead(l, now)),
    rates: {
      showUpRatePct: showUpRate,
      offerRatePct: offerRate,
      closeRatePct: closeRate,
      avgDealSize: Math.round(avgDealSize * 100) / 100,
    },
  }
}

export async function buildSalesProjection(workspaceId, query = {}) {
  const metrics = await buildSalesMetrics(workspaceId, query)
  const { EmailRecipient } = await import('../models/EmailRecipient.js')

  const upcoming = await EmailRecipient.find({
    workspaceId,
    pipelineStage: { $nin: ['', null, 'won', 'lost'] },
    $or: [
      { meetingDateAt: { $gte: new Date() } },
      {
        meetingDateAt: null,
        pipelineStage: { $in: ['new', 'meeting_follow_up', 'proposal'] },
      },
      { crmMeetingOutcome: { $in: ['', 'rescheduled_us', 'rescheduled_them'] } },
    ],
  }).lean()

  const scheduledMeetings = upcoming.filter(
    (l) =>
      l.meetingDateAt ||
      ['new', 'meeting_follow_up', 'proposal', 'follow_up_ongoing'].includes(
        l.pipelineStage,
      ),
  ).length

  const show = (num(query.showUpRate) || metrics.rates.showUpRatePct) / 100
  const offer = (num(query.offerRate) || metrics.rates.offerRatePct) / 100
  const close = (num(query.closeRate) || metrics.rates.closeRatePct) / 100
  const deal =
    num(query.avgDealSize) || metrics.rates.avgDealSize || 0

  // Fallbacks when no history
  const showR = show > 0 ? show : 0.7
  const offerR = offer > 0 ? offer : 0.8
  const closeR = close > 0 ? close : 0.25
  const dealR = deal > 0 ? deal : 0

  const expectedUnits = scheduledMeetings * showR * offerR * closeR
  const expectedRevenue = expectedUnits * dealR

  const scale = (factor) => {
    const units =
      scheduledMeetings *
      Math.min(1, showR * factor) *
      Math.min(1, offerR * factor) *
      Math.min(1, closeR * factor)
    const rev = units * dealR * factor
    return {
      meetings: scheduledMeetings,
      expectedSales: Math.round(units * 10) / 10,
      revenue: Math.round(rev * 100) / 100,
      cash: Math.round(rev * 0.85 * 100) / 100,
    }
  }

  const currentCash = metrics.money.cashCollected
  const currentRevenue = metrics.money.netRevenue

  return {
    assumptions: {
      scheduledMeetings,
      showUpRatePct: Math.round(showR * 1000) / 10,
      offerRatePct: Math.round(offerR * 1000) / 10,
      closeRatePct: Math.round(closeR * 1000) / 10,
      avgDealSize: dealR,
    },
    current: {
      netRevenue: currentRevenue,
      cashCollected: currentCash,
    },
    best: scale(1.2),
    expected: {
      meetings: scheduledMeetings,
      expectedSales: Math.round(expectedUnits * 10) / 10,
      revenue: Math.round(expectedRevenue * 100) / 100,
      cash: Math.round(expectedRevenue * 0.85 * 100) / 100,
    },
    worst: scale(0.8),
    endOfMonth: {
      best: {
        revenue: Math.round((currentRevenue + scale(1.2).revenue) * 100) / 100,
        cash: Math.round((currentCash + scale(1.2).cash) * 100) / 100,
      },
      expected: {
        revenue:
          Math.round((currentRevenue + expectedRevenue) * 100) / 100,
        cash:
          Math.round((currentCash + expectedRevenue * 0.85) * 100) / 100,
      },
      worst: {
        revenue: Math.round((currentRevenue + scale(0.8).revenue) * 100) / 100,
        cash: Math.round((currentCash + scale(0.8).cash) * 100) / 100,
      },
    },
  }
}
