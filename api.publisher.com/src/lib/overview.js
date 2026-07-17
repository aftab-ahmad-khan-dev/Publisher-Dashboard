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

export async function buildWorkspaceOverview(workspaceId) {
  const ws = workspaceId
  const now = new Date()

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

  return {
    mail: {
      sent,
      opened,
      clicked,
      failed,
      openRate: rate(opened, sent),
      clickRate: rate(clicked, sent),
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
    followUps,
  }
}
