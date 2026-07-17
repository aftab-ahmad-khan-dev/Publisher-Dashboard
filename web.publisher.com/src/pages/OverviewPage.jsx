import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { isLivePublishing } from '../lib/api'
import { getOverview, sendEmailNudge } from '../lib/backendApi'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'
import { OverviewSkeleton } from '../components/Skeleton'

const FOLLOW_UP_PAGE_SIZE = 5

const NUDGE_TOOLTIPS = {
  follow_up:
    'Follow Up — reminds them slots are limited. Also auto-sends after Reason if meeting status is still unchanged.',
  final_call:
    'Final Call — last slot + 10% off. Auto-sends if meeting status stays the same.',
  reason:
    'Reason — asks why they haven’t booked. Auto-sends after Final Call if status is still unchanged.',
}

function StatCard({ label, value, hint, accent }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        accent
          ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
          : 'border-white/[0.08] bg-white/[0.03]'
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-wide ${
          accent ? 'text-emerald-400/80' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          accent ? 'text-emerald-200' : 'text-white'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  )
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
      <button
        type="button"
        className="has-tip rounded-lg bg-sky-500/15 px-2.5 py-1 text-[10px] font-semibold text-sky-200 disabled:opacity-50"
        disabled={disabled}
        aria-label={NUDGE_TOOLTIPS.follow_up}
        data-tip={NUDGE_TOOLTIPS.follow_up}
        onClick={() => onNudge(row, 'follow_up')}
      >
        {busyId === `${row.id}:follow_up` ? '…' : 'Follow Up'}
      </button>
      <button
        type="button"
        className="has-tip rounded-lg bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-200 disabled:opacity-50"
        disabled={disabled}
        aria-label={NUDGE_TOOLTIPS.final_call}
        data-tip={NUDGE_TOOLTIPS.final_call}
        onClick={() => onNudge(row, 'final_call')}
      >
        {busyId === `${row.id}:final_call` ? '…' : 'Final Call'}
      </button>
      <button
        type="button"
        className="has-tip rounded-lg bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-200 disabled:opacity-50"
        disabled={disabled}
        aria-label={NUDGE_TOOLTIPS.reason}
        data-tip={NUDGE_TOOLTIPS.reason}
        onClick={() => onNudge(row, 'reason')}
      >
        {busyId === `${row.id}:reason` ? '…' : 'Reason'}
      </button>
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
    const labels = { follow_up: 'Follow Up', final_call: 'Final Call', reason: 'Reason' }
    setNudgeBusyId(`${row.id}:${type}`)
    try {
      await sendEmailNudge(row.id, type)
      showToast(`${labels[type] || 'Nudge'} sent to ${row.email}`, 'success')
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

  return (
    <PageShell>
      <PageHeader
        title="Overview"
        subtitle="Mail performance, meetings, and follow-ups that need attention"
        action={
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={load}>
            Refresh
          </button>
        }
      />
      <PageScroll className="pb-8">
        {!live ? (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">
            Connect the live API to see workspace stats.
          </p>
        ) : loading && !data ? (
          <OverviewSkeleton />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="Sent"
                value={(mail.sent || 0).toLocaleString()}
                hint="Delivered / failed / opened / clicked"
              />
              <StatCard
                label="Opened"
                value={(mail.opened || 0).toLocaleString()}
                hint={`${mail.openRate ?? 0}% of sent`}
              />
              <StatCard
                label="Clicked"
                value={(mail.clicked || 0).toLocaleString()}
                hint={`${mail.clickRate ?? 0}% of sent`}
              />
              <StatCard
                label="Upcoming meetings"
                value={(meetings.upcoming || 0).toLocaleString()}
                hint={`${meetings.booked || 0} booked total`}
                accent
              />
              <StatCard
                label="Scheduled posts"
                value={(content.scheduledPosts || 0).toLocaleString()}
                hint={`${content.drafts || 0} drafts`}
              />
            </div>

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Link clicks</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300/90">
                    Calendar booking
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-indigo-100">
                    {(links.calendar || 0).toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-indigo-300/70">
                      · {links.calendarPct ?? 0}%
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
                    Portfolio
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-sky-100">
                    {(links.portfolio || 0).toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-sky-300/70">
                      · {links.portfolioPct ?? 0}%
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Other links
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">
                    {(links.other || 0).toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      · {links.otherPct ?? 0}%
                    </span>
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-600">
                Based on tracked clicks (calendar booking vs portfolio hosts). New clicks after this
                deploy get a precise kind; older calendar clicks are included via meeting-link
                activity.
              </p>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Quick actions</h3>
              <div className="flex flex-wrap gap-2">
                <Link to="/compose" className="btn-primary px-3 py-2 text-xs">
                  Compose post
                </Link>
                <Link to="/email?tab=campaigns" className="btn-secondary px-3 py-2 text-xs">
                  New campaign
                </Link>
                <Link to="/email?tab=meetings" className="btn-secondary px-3 py-2 text-xs">
                  Meetings
                </Link>
                <Link to="/email?tab=processed" className="btn-secondary px-3 py-2 text-xs">
                  Processed mail
                </Link>
                <Link to="/scheduled" className="btn-secondary px-3 py-2 text-xs">
                  Scheduled posts
                </Link>
                <Link to="/guide" className="btn-secondary px-3 py-2 text-xs">
                  LinkedIn export
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Follow-up needed</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Mature leads — opened or clicked booking, not booked yet
                  </p>
                </div>
                <Link
                  to="/email?tab=processed&engagement=engaged"
                  className="text-[11px] font-medium text-indigo-300 hover:text-white"
                >
                  Open processed →
                </Link>
              </div>

              {followUps.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No mature leads waiting on follow-up right now.
                </p>
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
                            Last nudge: {String(r.lastNudgeType).replace(/_/g, ' ')}
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
                          <th className="px-3 py-2.5">Lead</th>
                          <th className="px-3 py-2.5">Company</th>
                          <th className="px-3 py-2.5">Opens</th>
                          <th className="px-3 py-2.5">Clicks</th>
                          <th className="px-3 py-2.5">Last link</th>
                          <th className="px-3 py-2.5">Meeting</th>
                          <th className="px-3 py-2.5 text-right">Action</th>
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
                        {followUps.length} leads
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
                      {followUps.length} lead{followUps.length === 1 ? '' : 's'}
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
