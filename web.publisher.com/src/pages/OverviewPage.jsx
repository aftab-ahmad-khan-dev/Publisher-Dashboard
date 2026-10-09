import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { isLivePublishing } from '../lib/api'
import { getOverview, sendEmailNudge } from '../lib/backendApi'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'
import { OverviewSkeleton } from '../components/Skeleton'
import KpiCard from '../components/dashboard/KpiCard'
import MailActivityChart from '../components/dashboard/MailActivityChart'
import LinkMixRadar from '../components/dashboard/LinkMixRadar'
import StatRing from '../components/dashboard/StatRing'

const FOLLOW_UP_PAGE_SIZE = 5

const NUDGE_LABELS = {
  follow_up: 'Gentle nudge',
  final_call: 'Last chance',
  reason: 'Check in',
}

const NUDGE_TOOLTIPS = {
  follow_up:
    'Gentle nudge — a warm reminder that a few slots remain. Also auto-sends after Check in if meeting status is still unchanged.',
  final_call:
    'Last chance — final slot + 10% off, written like a real human close. Auto-sends if meeting status stays the same.',
  reason:
    'Check in — asks what got in the way of booking, without pressure. Auto-sends after Last chance if status is still unchanged.',
}

function formatCompact(n) {
  const num = Number(n) || 0
  if (num >= 1000) {
    const k = num / 1000
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k+`
  }
  return num.toLocaleString()
}

function linkKindLabel(kind) {
  if (kind === 'calendar') return 'Calendar'
  if (kind === 'portfolio') return 'Portfolio'
  if (kind === 'other') return 'Other'
  return '—'
}

function NudgeActions({ row, busyId, onNudge, align = 'end' }) {
  const disabled = Boolean(busyId)
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${
        align === 'end' ? 'justify-end' : 'justify-start'
      }`}
    >
      {(['follow_up', 'final_call', 'reason']).map((type) => {
        const tones = {
          follow_up: 'bg-sky-500/15 text-sky-200',
          final_call: 'bg-violet-500/15 text-violet-200',
          reason: 'bg-amber-500/15 text-amber-200',
        }
        return (
          <button
            key={type}
            type="button"
            className={`has-tip rounded-lg px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50 ${tones[type]}`}
            disabled={disabled}
            aria-label={NUDGE_TOOLTIPS[type]}
            data-tip={NUDGE_TOOLTIPS[type]}
            onClick={() => onNudge(row, type)}
          >
            {busyId === `${row.id}:${type}` ? '…' : NUDGE_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}

function TopInsightCard({ title, eyebrow, value, icon }) {
  return (
    <div className="kpi-spotlight flex min-h-[112px] flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12151f] to-[#0a0c12] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </p>
          <p className="mt-1 font-display text-sm font-semibold text-white">{title}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/12 text-teal-300">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums text-white">
        {value}
        <span className="ml-1 text-xs font-medium text-slate-500">/ clicks</span>
      </p>
    </div>
  )
}

export default function OverviewPage() {
  const { showToast } = useAppData()
  const live = isLivePublishing()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followPage, setFollowPage] = useState(1)
  const [nudgeBusyId, setNudgeBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!live) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await getOverview()
      setData(res)
      setFollowPage(1)
    } catch (err) {
      showToast(err.message || 'Failed to load overview', 'error')
    } finally {
      setLoading(false)
    }
  }, [live, showToast])

  useEffect(() => {
    load()
  }, [load])

  const mail = data?.mail || {}
  const links = data?.links || {}
  const meetings = data?.meetings || {}
  const content = data?.content || {}
  const followUps = data?.followUps || []
  const series = data?.series || []
  const trends = mail.trends || {}

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
    const lines = ['date,sent,opened,clicked', ...series.map((r) => `${r.date},${r.sent},${r.opened},${r.clicked}`)]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mail-activity.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const meetingTarget = Math.max(meetings.booked || 0, meetings.upcoming || 0, 1) * 2
  const postTarget = Math.max(content.scheduledPosts || 0, content.drafts || 0, 1) * 2

  return (
    <PageShell>
      <PageHeader
        title="Overview"
        subtitle="A calm read on mail, meetings, and the people who need a human follow-up"
        action={
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={load}>
            Refresh
          </button>
        }
      />
      <PageScroll className="pb-8">
        {!live ? (
          <div className="saas-empty-state">
            <p className="font-display text-base text-slate-300">Connect your workspace</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Hook up the live API and this view becomes your daily pulse — sends, opens, and
              warm leads waiting on a reply.
            </p>
            <Link to="/api-config" className="btn-primary mt-4 px-4 py-2 text-xs">
              Open integrations
            </Link>
          </div>
        ) : loading && !data ? (
          <OverviewSkeleton />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                label="Emails sent"
                value={formatCompact(mail.sent)}
                hint={`${mail.period?.sent ?? 0} in last ${mail.period?.days ?? 10} days`}
                trend={trends.sent}
                series={series}
                dataKey="sent"
                featured
                tone="teal"
              />
              <KpiCard
                label="Opened"
                value={formatCompact(mail.opened)}
                hint={`${mail.openRate ?? 0}% open rate`}
                trend={trends.opened}
                series={series}
                dataKey="opened"
                tone="rose"
              />
              <KpiCard
                label="Clicked"
                value={formatCompact(mail.clicked)}
                hint={`${mail.clickRate ?? 0}% click rate`}
                trend={trends.clicked}
                series={series}
                dataKey="clicked"
                tone="sky"
              />
              <KpiCard
                label="Upcoming meetings"
                value={(meetings.upcoming || 0).toLocaleString()}
                hint={`${meetings.booked || 0} booked · ${content.scheduledPosts || 0} posts queued`}
                trend={trends.openRate}
                series={series}
                dataKey="opened"
                tone="emerald"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <MailActivityChart series={series} onDownload={downloadCsv} />
              </div>
              <div className="flex flex-col gap-3 xl:col-span-4">
                <LinkMixRadar links={links} />
                <section className="saas-content-card space-y-4">
                  <div>
                    <h3 className="saas-section-title">Pulse</h3>
                    <p className="saas-section-desc">Live attention signals</p>
                  </div>
                  <StatRing
                    value={meetings.upcoming || 0}
                    max={meetingTarget}
                    label="Meetings ahead"
                    sublabel={`${meetings.booked || 0} booked overall`}
                    tone="teal"
                  />
                  <StatRing
                    value={content.scheduledPosts || 0}
                    max={postTarget}
                    label="Posts scheduled"
                    sublabel={`${content.drafts || 0} drafts waiting`}
                    tone="sky"
                  />
                  <div className="rounded-lg border border-teal-500/15 bg-teal-500/[0.06] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-300/80">
                          Warm leads
                        </p>
                        <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-teal-100">
                          {followUps.length}
                        </p>
                      </div>
                      <span className="rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                        need a reply
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <h3 className="saas-section-title">Top click destinations</h3>
                  <p className="saas-section-desc">Where engaged leads are spending attention</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <TopInsightCard
                  eyebrow="Top destination"
                  title="Calendar booking"
                  value={formatCompact(links.calendar)}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                />
                <TopInsightCard
                  eyebrow="Top destination"
                  title="Portfolio"
                  value={formatCompact(links.portfolio)}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  }
                />
                <TopInsightCard
                  eyebrow="Top destination"
                  title="Other links"
                  value={formatCompact(links.other)}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  }
                />
              </div>
            </div>

            <section className="saas-content-card">
              <h3 className="saas-section-title mb-3">Quick actions</h3>
              <div className="flex flex-wrap gap-2">
                <Link to="/compose" className="btn-primary px-3 py-2 text-xs">
                  Write a post
                </Link>
                <Link to="/email?tab=campaigns" className="btn-secondary px-3 py-2 text-xs">
                  Start a campaign
                </Link>
                <Link to="/email?tab=meetings" className="btn-secondary px-3 py-2 text-xs">
                  Review meetings
                </Link>
                <Link to="/email?tab=processed" className="btn-secondary px-3 py-2 text-xs">
                  People who engaged
                </Link>
                <Link to="/scheduled" className="btn-secondary px-3 py-2 text-xs">
                  Scheduled posts
                </Link>
              </div>
            </section>

            <section className="saas-content-card">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="saas-section-title">People waiting on you</h3>
                  <p className="saas-section-desc">
                    Opened or clicked — not booked yet. A short, human note usually wins.
                  </p>
                </div>
                <Link
                  to="/email?tab=processed&engagement=engaged"
                  className="text-[11px] font-medium text-teal-300 hover:text-white"
                >
                  Open inbox →
                </Link>
              </div>

              {followUps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-300">You&apos;re caught up</p>
                  <p className="mt-1 text-xs text-slate-500">
                    No warm leads need a follow-up right now. Nice work.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mobile-data-cards !px-0 !pt-0">
                    {pagedFollowUps.map((r) => (
                      <div key={r.id} className="mobile-data-card">
                        <p className="mobile-data-card__title">{r.name || '—'}</p>
                        <p className="mobile-data-card__meta">{r.email}</p>
                        <div className="mobile-data-card__row">
                          <span className="mobile-data-card__label">Company</span>
                          <span className="mobile-data-card__value">{r.company || '—'}</span>
                        </div>
                        <div className="mobile-data-card__row">
                          <span className="mobile-data-card__label">Opens / Clicks</span>
                          <span className="mobile-data-card__value">
                            {r.openCount} · {r.clickCount}
                          </span>
                        </div>
                        <div className="mobile-data-card__row">
                          <span className="mobile-data-card__label">Last link</span>
                          <span className="mobile-data-card__value">
                            {linkKindLabel(r.lastClickKind)}
                          </span>
                        </div>
                        <div className="mobile-data-card__row">
                          <span className="mobile-data-card__label">Meeting</span>
                          <span className="mobile-data-card__value capitalize">
                            {(r.meetingStatus || 'none').replace(/_/g, ' ')}
                          </span>
                        </div>
                        {r.lastNudgeType ? (
                          <p className="mt-2 text-[10px] text-slate-500">
                            Last note: {NUDGE_LABELS[r.lastNudgeType] || String(r.lastNudgeType).replace(/_/g, ' ')}
                          </p>
                        ) : null}
                        <div className="mt-3">
                          <NudgeActions
                            row={r}
                            busyId={nudgeBusyId}
                            onNudge={handleNudge}
                            align="start"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="saas-table-wrap -mx-1 overflow-x-auto sm:mx-0">
                    <table className="saas-table saas-table--desktop-only w-full min-w-[780px] text-left text-xs">
                      <thead>
                        <tr>
                          <th className="px-3 py-2.5">Person</th>
                          <th className="px-3 py-2.5">Company</th>
                          <th className="px-3 py-2.5">Opens</th>
                          <th className="px-3 py-2.5">Clicks</th>
                          <th className="px-3 py-2.5">Last link</th>
                          <th className="px-3 py-2.5">Meeting</th>
                          <th className="px-3 py-2.5 text-right">Reach out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedFollowUps.map((r) => (
                          <tr key={r.id}>
                            <td className="px-3 py-2">
                              <p className="font-medium text-slate-200">{r.name || '—'}</p>
                              <p className="text-slate-500">{r.email}</p>
                            </td>
                            <td className="px-3 py-2 text-slate-400">{r.company || '—'}</td>
                            <td className="px-3 py-2 tabular-nums text-slate-300">
                              {r.openCount}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-slate-300">
                              {r.clickCount}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {linkKindLabel(r.lastClickKind)}
                            </td>
                            <td className="px-3 py-2 text-slate-400 capitalize">
                              {(r.meetingStatus || 'none').replace(/_/g, ' ')}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <NudgeActions
                                row={r}
                                busyId={nudgeBusyId}
                                onNudge={handleNudge}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {followUps.length > FOLLOW_UP_PAGE_SIZE ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                      <p className="text-[11px] text-slate-500">
                        Page {Math.min(followPage, followTotalPages)} of {followTotalPages} ·{' '}
                        {followUps.length} people
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                          disabled={followPage <= 1}
                          onClick={() => setFollowPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
                          disabled={followPage >= followTotalPages}
                          onClick={() =>
                            setFollowPage((p) => Math.min(followTotalPages, p + 1))
                          }
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-slate-600">
                      {followUps.length} person{followUps.length === 1 ? '' : 's'}
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </PageScroll>
    </PageShell>
  )
}
