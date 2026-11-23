import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { isLivePublishing } from '../lib/api'
import { getOverview, sendEmailNudge } from '../lib/backendApi'
import { withTimeout } from '../lib/fetchTimeout'
import { getConnectionSummary } from '../lib/connections'
import PageShell, { PageScroll } from '../components/PageShell'
import { OverviewSkeleton } from '../components/Skeleton'
import MetricCard from '../components/dashboard/MetricCard'
import OrderStatsChart from '../components/dashboard/OrderStatsChart'
import SegmentGauge from '../components/dashboard/SegmentGauge'
import PlatformPulse from '../components/dashboard/PlatformPulse'
import LinkMixBars from '../components/dashboard/LinkMixBars'

const FOLLOW_UP_PAGE_SIZE = 6
const POLL_MS = 15_000

const NUDGE_LABELS = {
  follow_up: 'Follow up',
  final_call: 'Final note',
  reason: 'Check in',
}

function formatCompact(n) {
  const num = Number(n) || 0
  if (num >= 1000) {
    const k = num / 1000
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`
  }
  return num.toLocaleString()
}

function initials(name, email) {
  const s = String(name || email || '?').trim()
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

function formatAgo(ts) {
  if (!ts) return ''
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}

function insightCopy({ openRate, clickRate, sent, followUps, meetings }) {
  if (!sent) {
    return {
      title: 'No mail sent yet',
      body: 'Launch a campaign to start live open-rate tracking and warm-lead follow-ups.',
      cta: { to: '/email?tab=campaigns', label: 'Start a campaign' },
    }
  }
  if (followUps > 0) {
    return {
      title: `${followUps} warm lead${followUps === 1 ? '' : 's'} need a nudge`,
      body: 'They opened or clicked but have not booked. Follow up while interest is high.',
      cta: { to: '#follow-ups', label: 'Jump to follow-ups' },
    }
  }
  if (openRate >= 40) {
    return {
      title: 'Strong open performance',
      body: `${openRate}% open rate · ${clickRate}% click rate. Keep the cadence — meetings: ${meetings}.`,
      cta: { to: '/email?tab=meetings', label: 'View meetings' },
    }
  }
  if (openRate > 0 && openRate < 20) {
    return {
      title: 'Open rate is soft',
      body: `${openRate}% opens — tighten subject lines or send windows, then refresh live.`,
      cta: { to: '/email?tab=campaigns', label: 'Review campaigns' },
    }
  }
  return {
    title: 'Workspace is live',
    body: `${formatCompact(sent)} sent · ${openRate}% open · ${meetings} upcoming meetings.`,
    cta: { to: '/email?tab=mailbox', label: 'Open mailbox' },
  }
}

function MailIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
function OpenIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}
function ClickIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  )
}
function MeetIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

export default function OverviewPage() {
  const { showToast, queue, drafts, published, apiConfig } = useAppData()
  const live = isLivePublishing()
  const conn = useMemo(() => getConnectionSummary(apiConfig), [apiConfig])
  const connections = useMemo(
    () => ({
      linkedin: conn.linkedInReady,
      meta: conn.metaReady,
      facebook: conn.metaReady,
      instagram: conn.metaReady,
      reddit: conn.redditReady,
      quora: conn.quoraReady,
      pinterest: conn.pinterestReady,
      threads: conn.threadsReady,
      gmail: conn.gmailReady,
    }),
    [conn],
  )
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followPage, setFollowPage] = useState(1)
  const [nudgeBusyId, setNudgeBusyId] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!live) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    try {
      const res = await withTimeout(
        getOverview(),
        25_000,
        'Overview took too long (API cold start?). Tap refresh.',
      )
      setData(res)
      setUpdatedAt(Date.now())
      if (!silent) setFollowPage(1)
    } catch (err) {
      if (!silent) showToast(err.message || 'Failed to load overview', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [live, showToast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(() => load({ silent: true }), POLL_MS)
    return () => clearInterval(id)
  }, [live, load])

  // Refresh "updated ago" label every few seconds
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000)
    return () => clearInterval(id)
  }, [])

  const mail = data?.mail || {}
  const meetings = data?.meetings || {}
  const followUps = data?.followUps || []
  const series = data?.series || []
  const links = data?.links || {}
  const content = data?.content || {}
  const trends = mail.trends || {}

  const openRate = Math.round(mail.openRate ?? 0)
  const clickRate = Math.round(mail.clickRate ?? 0)
  const gaugeMax = 100
  const failed = Number(mail.failed) || 0
  const scheduledPosts = Number(content.scheduledPosts) || queue?.length || 0
  const draftCount = Number(content.drafts) || drafts?.length || 0

  const insight = useMemo(
    () =>
      insightCopy({
        openRate,
        clickRate,
        sent: Number(mail.sent) || 0,
        followUps: followUps.length,
        meetings: meetings.upcoming || 0,
      }),
    [openRate, clickRate, mail.sent, followUps.length, meetings.upcoming],
  )

  const followTotalPages = Math.max(1, Math.ceil(followUps.length / FOLLOW_UP_PAGE_SIZE))
  const pagedFollowUps = useMemo(() => {
    const page = Math.min(followPage, followTotalPages)
    const start = (page - 1) * FOLLOW_UP_PAGE_SIZE
    return followUps.slice(start, start + FOLLOW_UP_PAGE_SIZE)
  }, [followUps, followPage, followTotalPages])

  useEffect(() => {
    if (followPage > followTotalPages) setFollowPage(followTotalPages)
  }, [followPage, followTotalPages])

  const handleNudge = async (row, type) => {
    setNudgeBusyId(`${row.id}:${type}`)
    try {
      await sendEmailNudge(row.id, type)
      showToast(`${NUDGE_LABELS[type] || 'Nudge'} sent to ${row.email}`, 'success')
      setData((prev) => {
        if (!prev?.followUps) return prev
        return {
          ...prev,
          followUps: prev.followUps.map((r) =>
            r.id === row.id
              ? { ...r, lastNudgeType: type, lastNudgeAt: new Date().toISOString() }
              : r,
          ),
        }
      })
    } catch (err) {
      showToast(err.message || 'Failed to send', 'error')
    } finally {
      setNudgeBusyId(null)
    }
  }

  const downloadCsv = () => {
    if (!series.length) {
      showToast('No activity to export yet', 'info')
      return
    }
    const lines = [
      'date,sent,opened,clicked',
      ...series.map((r) => `${r.date},${r.sent},${r.opened},${r.clicked}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mail-activity.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const ago = formatAgo(updatedAt)
  void tick

  return (
    <PageShell>
      <div className="orbit-overview-head shrink-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="orbit-overview-head__mark" aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
              </svg>
            </span>
            <h1 className="orbit-overview-head__title">Overview</h1>
            {live && data ? (
              <span className="orbit-live-pill" title="Auto-refreshes every 15s">
                <span className="orbit-live-pill__dot" />
                Live{ago ? ` · ${ago}` : ''}
              </span>
            ) : null}
          </div>
          <p className="orbit-overview-head__sub">
            Realtime mail performance · meetings & warm leads
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link to="/email?tab=campaigns" className="btn-primary px-4 py-2 text-xs">
            New campaign
          </Link>
          <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={() => load()}>
            Refresh
          </button>
        </div>
      </div>

      <PageScroll className="pb-8">
        {!live ? (
          <div className="orbit-panel px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#2D0000]">Connect the API</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[#5a6258]">
              Workspace stats appear once the live backend is connected.
            </p>
            <Link to="/api-config" className="btn-primary mt-5 inline-flex px-4 py-2 text-xs">
              Open integrations
            </Link>
          </div>
        ) : loading && !data ? (
          <OverviewSkeleton />
        ) : (
          <div className="space-y-5">
            {/* Actionable insight strip */}
            <div className="orbit-insight">
              <div className="min-w-0">
                <p className="orbit-insight__title">{insight.title}</p>
                <p className="orbit-insight__body">{insight.body}</p>
              </div>
              {insight.cta?.to?.startsWith('#') ? (
                <a href={insight.cta.to} className="orbit-ghost-btn shrink-0">
                  {insight.cta.label}
                </a>
              ) : insight.cta ? (
                <Link to={insight.cta.to} className="orbit-ghost-btn shrink-0">
                  {insight.cta.label}
                </Link>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                featured
                label="Mail sent"
                value={formatCompact(mail.sent)}
                hint={`${mail.period?.sent ?? 0} in last ${mail.period?.days ?? 10} days${
                  failed ? ` · ${failed} failed` : ''
                }`}
                trend={trends.sent}
                icon={<MailIcon />}
              />
              <MetricCard
                label="Opened"
                value={formatCompact(mail.opened)}
                hint={`${openRate}% open rate`}
                trend={trends.opened}
                icon={<OpenIcon />}
              />
              <MetricCard
                label="Clicked"
                value={formatCompact(mail.clicked)}
                hint={`${clickRate}% click rate`}
                trend={trends.clicked}
                icon={<ClickIcon />}
              />
              <MetricCard
                label="Meetings ahead"
                value={formatCompact(meetings.upcoming || 0)}
                hint={`${meetings.booked || 0} booked · ${followUps.length} warm`}
                icon={<MeetIcon />}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                label="Scheduled posts"
                value={formatCompact(scheduledPosts)}
                hint={`${conn.connectedCount} platforms connected`}
              />
              <MetricCard
                label="Drafts"
                value={formatCompact(draftCount)}
                hint={`${published?.length || 0} published in workspace`}
              />
              <MetricCard
                label="Link clicks"
                value={formatCompact(links.total || 0)}
                hint={`${links.calendarPct || 0}% calendar · ${links.portfolioPct || 0}% portfolio`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <OrderStatsChart
                  series={series}
                  dataKey="sent"
                  title="Mail statistics"
                  subtitle="Daily send volume · live series"
                  onExport={downloadCsv}
                />
              </div>
              <div className="xl:col-span-4">
                <SegmentGauge
                  title="Open performance"
                  description="Live open rate this period"
                  value={openRate}
                  max={gaugeMax}
                  label={`of ${gaugeMax} point`}
                  sublabel={
                    Number(mail.sent)
                      ? `${formatCompact(mail.opened)} opens from ${formatCompact(mail.sent)} sent`
                      : 'Send mail to populate this gauge'
                  }
                  badge={openRate >= 40 ? 'Top performance' : 'Realtime'}
                  live
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <PlatformPulse
                  queue={queue}
                  published={published}
                  drafts={drafts}
                  mailSent={mail.sent}
                  connections={connections}
                />
              </div>
              <div className="xl:col-span-5">
                <LinkMixBars links={links} />
              </div>
            </div>

            <section id="follow-ups" className="orbit-panel scroll-mt-4">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="orbit-panel__title">Follow-up needed</h3>
                  <p className="orbit-panel__desc">
                    Engaged leads who have not booked yet · updates with live refresh
                  </p>
                </div>
                <Link to="/email?tab=processed&engagement=engaged" className="orbit-ghost-btn">
                  View all
                </Link>
              </div>

              {followUps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#757D6F]/35 bg-[#EEEAD7]/70 px-4 py-12 text-center">
                  <p className="text-sm font-medium text-[#2D0000]">No follow-ups waiting</p>
                  <p className="mt-1 text-xs text-[#5a6258]">
                    Warm leads appear here the moment they open or click.
                  </p>
                  <Link to="/email?tab=campaigns" className="btn-primary mt-4 inline-flex px-4 py-2 text-xs">
                    Send outreach
                  </Link>
                </div>
              ) : (
                <>
                  <div className="orbit-table-wrap">
                    <table className="orbit-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Company</th>
                          <th>Email</th>
                          <th>Opens</th>
                          <th>Clicks</th>
                          <th>Meeting</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedFollowUps.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <span className="orbit-avatar">{initials(r.name, r.email)}</span>
                                <span className="font-semibold text-[#2D0000]">
                                  {r.name || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="text-[#5a6258]">{r.company || '—'}</td>
                            <td>
                              <a
                                className="font-medium text-[#6D0808] hover:underline"
                                href={`mailto:${r.email}`}
                              >
                                {r.email}
                              </a>
                            </td>
                            <td className="tabular-nums text-[#2D0000]">{r.openCount}</td>
                            <td className="tabular-nums text-[#2D0000]">{r.clickCount}</td>
                            <td>
                              <span className="orbit-status">
                                <span
                                  className={`orbit-status__dot ${
                                    r.meetingStatus && r.meetingStatus !== 'none'
                                      ? 'orbit-status__dot--on'
                                      : 'orbit-status__dot--off'
                                  }`}
                                />
                                {(r.meetingStatus || 'none').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {(['follow_up', 'final_call', 'reason']).map((type) => (
                                  <button
                                    key={type}
                                    type="button"
                                    className="orbit-ghost-btn !px-2.5 !py-1 text-[11px]"
                                    disabled={Boolean(nudgeBusyId)}
                                    onClick={() => handleNudge(r, type)}
                                  >
                                    {nudgeBusyId === `${r.id}:${type}`
                                      ? '…'
                                      : NUDGE_LABELS[type]}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {followUps.length > FOLLOW_UP_PAGE_SIZE ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#757D6F]/20 pt-3">
                      <p className="text-[11px] text-[#5a6258]">
                        Page {Math.min(followPage, followTotalPages)} of {followTotalPages} ·{' '}
                        {followUps.length} leads
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="orbit-ghost-btn disabled:opacity-40"
                          disabled={followPage <= 1}
                          onClick={() => setFollowPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="orbit-ghost-btn disabled:opacity-40"
                          disabled={followPage >= followTotalPages}
                          onClick={() =>
                            setFollowPage((p) => Math.min(followTotalPages, p + 1))
                          }
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        )}
      </PageScroll>
    </PageShell>
  )
}
