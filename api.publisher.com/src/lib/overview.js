/**
 * Workspace Overview aggregates for the dashboard home page.
 */
import { EmailRecipient } from '../models/EmailRecipient.js'
import { ScheduledPost } from '../models/ScheduledPost.js'
import { Draft } from '../models/Draft.js'
import { isNudgeEligible } from './nudgeEmails.js'

function rate(part, whole) {
  if (!whole || whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

function startOfUtcDay(d) {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function dayKey(d) {
  return startOfUtcDay(d).toISOString().slice(0, 10)
}

function pctDelta(current, previous) {
  if (!previous || previous <= 0) {
    if (!current) return 0
    return 100
  }
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function fillDailySeries(map, fromDay, days) {
  const out = []
  for (let i = 0; i < days; i++) {
    const d = new Date(fromDay)
    d.setUTCDate(d.getUTCDate() + i)
    const key = dayKey(d)
    const row = map.get(key) || { sent: 0, opened: 0, clicked: 0 }
    out.push({
      date: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' }),
      sent: row.sent,
      opened: row.opened,
      clicked: row.clicked,
    })
  }
  return out
}

async function buildMailSeries(workspaceId, from, to) {
  const rows = await EmailRecipient.aggregate([
    {
      $match: {
        workspaceId,
        sentAt: { $gte: from, $lt: to },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$sentAt', timezone: 'UTC' },
        },
        sent: { $sum: 1 },
        opened: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $gt: [{ $ifNull: ['$openCount', 0] }, 0] },
                  { $ne: [{ $ifNull: ['$openedAt', null] }, null] },
                  { $in: ['$status', ['opened', 'clicked']] },
                ],
              },
              1,
              0,
            ],
          },
        },
        clicked: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $gt: [{ $ifNull: ['$clickCount', 0] }, 0] },
                  { $ne: [{ $ifNull: ['$clickedAt', null] }, null] },
                  { $eq: ['$status', 'clicked'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ])

  const map = new Map()
  for (const r of rows) {
    map.set(r._id, {
      sent: r.sent || 0,
      opened: r.opened || 0,
      clicked: r.clicked || 0,
    })
  }
  return map
}

export async function buildWorkspaceOverview(workspaceId) {
  const ws = workspaceId
  const now = new Date()
  const today = startOfUtcDay(now)
  const seriesDays = 10
  const currentFrom = new Date(today)
  currentFrom.setUTCDate(currentFrom.getUTCDate() - (seriesDays - 1))
  const previousFrom = new Date(currentFrom)
  previousFrom.setUTCDate(previousFrom.getUTCDate() - seriesDays)
  const seriesEnd = new Date(today)
  seriesEnd.setUTCDate(seriesEnd.getUTCDate() + 1)

  const [
    sent,
    opened,
    clicked,
    failed,
    meetingsBooked,
    upcomingMeetings,
    scheduledPosts,
    drafts,
    calendarClickDocs,
    portfolioClickDocs,
    otherClickDocs,
    followUpRows,
    currentSeriesMap,
    previousSeriesMap,
  ] = await Promise.all([
    EmailRecipient.countDocuments({
      workspaceId: ws,
      status: { $in: ['sent', 'opened', 'clicked', 'failed'] },
      sentAt: { $exists: true, $ne: null },
    }),
    EmailRecipient.countDocuments({
      workspaceId: ws,
      $or: [
        { openCount: { $gt: 0 } },
        { openedAt: { $exists: true, $ne: null } },
        { status: { $in: ['opened', 'clicked'] } },
      ],
    }),
    EmailRecipient.countDocuments({
      workspaceId: ws,
      $or: [
        { clickCount: { $gt: 0 } },
        { clickedAt: { $exists: true, $ne: null } },
        { status: 'clicked' },
      ],
    }),
    EmailRecipient.countDocuments({ workspaceId: ws, status: 'failed' }),
    EmailRecipient.countDocuments({ workspaceId: ws, meetingStatus: 'scheduled' }),
    EmailRecipient.countDocuments({
      workspaceId: ws,
      meetingStatus: 'scheduled',
      meetingScheduledAt: { $gte: now },
    }),
    ScheduledPost.countDocuments({
      workspaceId: ws,
      status: { $in: ['scheduled', 'publishing'] },
    }),
    Draft.countDocuments({ workspaceId: ws }),
    EmailRecipient.countDocuments({
      workspaceId: ws,
      $or: [
        { lastClickKind: 'calendar' },
        { 'clickEvents.kind': 'calendar' },
        { meetingClickedAt: { $exists: true, $ne: null } },
      ],
    }),
    EmailRecipient.countDocuments({
      workspaceId: ws,
      $or: [{ lastClickKind: 'portfolio' }, { 'clickEvents.kind': 'portfolio' }],
    }),
    EmailRecipient.countDocuments({
      workspaceId: ws,
      lastClickKind: 'other',
      clickCount: { $gt: 0 },
    }),
    EmailRecipient.find({
      workspaceId: ws,
      meetingStatus: { $nin: ['scheduled', 'completed'] },
      $or: [
        { openCount: { $gt: 0 } },
        { openedAt: { $exists: true, $ne: null } },
        { status: { $in: ['opened', 'clicked'] } },
        { meetingStatus: { $in: ['link_clicked', 'invited'] } },
        { meetingClickedAt: { $exists: true, $ne: null } },
      ],
    })
      .sort({ meetingClickedAt: -1, lastOpenedAt: -1, openedAt: -1, updatedAt: -1 })
      .limit(40)
      .lean(),
    buildMailSeries(ws, currentFrom, seriesEnd),
    buildMailSeries(ws, previousFrom, currentFrom),
  ])

  const followUps = followUpRows
    .filter((r) => isNudgeEligible(r))
    .slice(0, 25)
    .map((r) => {
      const name =
        String(r.name || r.mergeData?.name || '').trim() ||
        String(r.email || '').split('@')[0] ||
        ''
      return {
        id: String(r._id),
        email: r.email,
        name,
        company: r.company || r.mergeData?.company || '',
        openCount: r.openCount || 0,
        clickCount: r.clickCount || 0,
        lastClickedUrl: r.lastClickedUrl || '',
        lastClickKind: r.lastClickKind || (r.meetingClickedAt ? 'calendar' : ''),
        meetingStatus: r.meetingStatus || 'none',
        lastNudgeType: r.lastNudgeType || '',
        lastNudgeAt: r.lastNudgeAt ? new Date(r.lastNudgeAt).toISOString() : null,
        nudgeEligible: true,
        sentAt: r.sentAt ? new Date(r.sentAt).toISOString() : null,
        openedAt: r.openedAt ? new Date(r.openedAt).toISOString() : null,
      }
    })

  const linkTotal = calendarClickDocs + portfolioClickDocs + otherClickDocs
  const series = fillDailySeries(currentSeriesMap, currentFrom, seriesDays)
  const previousSeries = fillDailySeries(previousSeriesMap, previousFrom, seriesDays)

  const sumField = (rows, field) => rows.reduce((acc, r) => acc + (r[field] || 0), 0)
  const sentPeriod = sumField(series, 'sent')
  const openedPeriod = sumField(series, 'opened')
  const clickedPeriod = sumField(series, 'clicked')
  const prevSent = sumField(previousSeries, 'sent')
  const prevOpened = sumField(previousSeries, 'opened')
  const prevClicked = sumField(previousSeries, 'clicked')

  return {
    mail: {
      sent,
      opened,
      clicked,
      failed,
      openRate: rate(opened, sent),
      clickRate: rate(clicked, sent),
      trends: {
        sent: pctDelta(sentPeriod, prevSent),
        opened: pctDelta(openedPeriod, prevOpened),
        clicked: pctDelta(clickedPeriod, prevClicked),
        openRate: pctDelta(rate(openedPeriod, sentPeriod), rate(prevOpened, prevSent)),
      },
      period: {
        sent: sentPeriod,
        opened: openedPeriod,
        clicked: clickedPeriod,
        days: seriesDays,
      },
    },
    links: {
      calendar: calendarClickDocs,
      portfolio: portfolioClickDocs,
      other: otherClickDocs,
      total: linkTotal,
      calendarPct: rate(calendarClickDocs, linkTotal || clicked),
      portfolioPct: rate(portfolioClickDocs, linkTotal || clicked),
      otherPct: rate(otherClickDocs, linkTotal || clicked),
    },
    meetings: {
      booked: meetingsBooked,
      upcoming: upcomingMeetings,
    },
    content: {
      scheduledPosts,
      drafts,
    },
    series,
    followUps,
  }
}
