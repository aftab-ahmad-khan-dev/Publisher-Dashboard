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
import LinkMixBars from '../components/dashboard/LinkMixBars'

const FOLLOW_UP_PAGE_SIZE = 5

const NUDGE_LABELS = {
  follow_up: 'Follow up',
  final_call: 'Final note',
  reason: 'Check in',
}

const NUDGE_TOOLTIPS = {
  follow_up: 'Send a short follow-up while interest is warm.',
  final_call: 'Send a final note with the limited-slot offer.',
  reason: 'Ask what blocked booking — no pressure.',
}

function formatCompact(n) {
  const num = Number(n) || 0
  if (num >= 1000) {
    const k = num / 1000
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`
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
      {(['follow_up', 'final_call', 'reason']).map((type) => (
        <button
          key={type}
          type="button"
          className="has-tip rounded-md border border-white/10 bg-transparent px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
          disabled={disabled}
          aria-label={NUDGE_TOOLTIPS[type]}
          data-tip={NUDGE_TOOLTIPS[type]}
          onClick={() => onNudge(row, type)}
        >
          {busyId === `${row.id}:${type}` ? '…' : NUDGE_LABELS[type]}
        </button>
      ))}
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

  return (
    <PageShell>
      <PageHeader
        title="Overview"
        subtitle="Mail performance, meetings, and follow-ups that need attention"
        action={
          <div className="flex items-center gap-2">
            <Link to="/email?tab=campaigns" className="btn-secondary px-3 py-1.5 text-xs">
              New campaign
            </Link>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={load}>
              Refresh
            </button>
          </div>
        }
      />
      <PageScroll className="pb-8">
        {!live ? (
          <div className="saas-empty-state">
            <p className="text-sm font-medium text-zinc-200">Connect the API</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Workspace stats appear once the live backend is connected.
            </p>
            <Link to="/api-config" className="btn-primary mt-4 px-4 py-2 text-xs">
              Open integrations
            </Link>
          </div>
        ) : loading && !data ? (
          <OverviewSkeleton />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                label="Sent"
                value={formatCompact(mail.sent)}
                hint={`${mail.period?.sent ?? 0} in last ${mail.period?.days ?? 10} days`}
                trend={trends.sent}
              />
              <KpiCard
                label="Opened"
                value={formatCompact(mail.opened)}
                hint={`${mail.openRate ?? 0}% open rate`}
                trend={trends.opened}
              />
              <KpiCard
                label="Clicked"
                value={formatCompact(mail.clicked)}
                hint={`${mail.clickRate ?? 0}% click rate`}
                trend={trends.clicked}
              />
              <KpiCard
                label="Upcoming meetings"
                value={(meetings.upcoming || 0).toLocaleString()}
                hint={`${meetings.booked || 0} booked · ${followUps.length} waiting`}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <MailActivityChart series={series} onDownload={downloadCsv} />
              </div>
              <div className="flex flex-col gap-3 xl:col-span-4">
                <LinkMixBars links={links} />
                <section className="saas-content-card">
                  <h3 className="saas-section-title">Workspace</h3>
                  <p className="saas-section-desc mb-4">Content and meeting load</p>
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-zinc-500">Scheduled posts</dt>
                      <dd className="font-medium tabular-nums text-zinc-100">
                        {content.scheduledPosts || 0}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-zinc-500">Drafts</dt>
                      <dd className="font-medium tabular-nums text-zinc-100">
                        {content.drafts || 0}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-zinc-500">Meetings booked</dt>
                      <dd className="font-medium tabular-nums text-zinc-100">
                        {meetings.booked || 0}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                      <dt className="text-zinc-500">Warm leads</dt>
                      <dd className="font-medium tabular-nums text-zinc-100">
                        {followUps.length}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>

            <section className="saas-content-card">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="saas-section-title">Follow-up needed</h3>
                  <p className="saas-section-desc">
                    Engaged leads who have not booked yet
                  </p>
                </div>
                <Link
                  to="/email?tab=processed&engagement=engaged"
                  className="text-[12px] font-medium text-zinc-400 hover:text-white"
                >
                  View all
                </Link>
              </div>

              {followUps.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/[0.08] px-4 py-10 text-center">
                  <p className="text-sm font-medium text-zinc-300">No follow-ups waiting</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Warm leads will appear here when they engage.
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
                          <th className="px-3 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedFollowUps.map((r) => (
                          <tr key={r.id}>
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-zinc-200">{r.name || '—'}</p>
                              <p className="text-zinc-500">{r.email}</p>
                            </td>
                            <td className="px-3 py-2.5 text-zinc-400">{r.company || '—'}</td>
                            <td className="px-3 py-2.5 tabular-nums text-zinc-300">
                              {r.openCount}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums text-zinc-300">
                              {r.clickCount}
                            </td>
                            <td className="px-3 py-2.5 text-zinc-300">
                              {linkKindLabel(r.lastClickKind)}
                            </td>
                            <td className="px-3 py-2.5 capitalize text-zinc-400">
                              {(r.meetingStatus || 'none').replace(/_/g, ' ')}
                            </td>
                            <td className="px-3 py-2.5 text-right">
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
                      <p className="text-[11px] text-zinc-500">
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
