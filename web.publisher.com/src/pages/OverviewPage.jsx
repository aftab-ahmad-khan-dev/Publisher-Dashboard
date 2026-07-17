import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { isLivePublishing } from '../lib/api'
import { getOverview } from '../lib/backendApi'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'

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

export default function OverviewPage() {
  const { showToast } = useAppData()
  const live = isLivePublishing()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!live) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await getOverview()
      setData(res)
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
          <p className="px-1 py-8 text-center text-sm text-slate-500">Loading overview…</p>
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

            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
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
                  <div className="mobile-data-cards">
                    {followUps.map((r) => (
                      <div key={r.id} className="mobile-data-card">
                        <p className="mobile-data-card__title">{r.name || '—'}</p>
                        <p className="mobile-data-card__meta">{r.email}</p>
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
                        <div className="mt-2">
                          <Link
                            to="/email?tab=processed"
                            className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-slate-300"
                          >
                            Open in Processed
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="saas-table-wrap">
                    <table className="saas-table saas-table--desktop-only w-full min-w-[720px] text-left text-xs">
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
                        {followUps.map((r) => (
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
                            <td className="px-3 py-2 text-slate-400">
                              {(r.meetingStatus || 'none').replace(/_/g, ' ')}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Link
                                to="/email?tab=processed"
                                className="rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.1]"
                              >
                                Follow up
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </PageScroll>
    </PageShell>
  )
}
