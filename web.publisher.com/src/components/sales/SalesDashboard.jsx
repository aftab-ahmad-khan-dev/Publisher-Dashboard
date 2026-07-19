import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney, LOSS_REASON_LABELS } from '../../lib/salesConstants'
import { upsertSalesActivity } from '../../lib/backendApi'

const PIE_COLORS = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#fb7185']

function Metric({ label, value, hint, danger }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        danger
          ? 'border-rose-500/30 bg-rose-500/[0.07]'
          : 'border-white/[0.08] bg-white/[0.03]'
      }`}
    >
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${danger ? 'text-rose-400' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${danger ? 'text-rose-200' : 'text-white'}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      {children}
    </section>
  )
}

export default function SalesDashboard({ metrics, filters, onFiltersChange, teamMembers = [], onRefresh }) {
  const [activity, setActivity] = useState({
    date: new Date().toISOString().slice(0, 10),
    setterName: '',
    dials: 0,
    dmsSent: 0,
    conversations: 0,
  })
  const [savingActivity, setSavingActivity] = useState(false)

  const setters = useMemo(
    () => teamMembers.filter((m) => m.role === 'setter' || m.role === 'both'),
    [teamMembers],
  )
  const closers = useMemo(
    () => teamMembers.filter((m) => m.role === 'closer' || m.role === 'both'),
    [teamMembers],
  )

  useEffect(() => {
    if (!activity.setterName && setters[0]?.name) {
      setActivity((a) => ({ ...a, setterName: setters[0].name }))
    }
  }, [setters, activity.setterName])

  if (!metrics) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading metrics…</p>
  }

  const { setter, closer, money, leaks, agingLeads } = metrics
  const lossData = Object.entries(closer.lossReasons || {}).map(([key, value]) => ({
    name: LOSS_REASON_LABELS[key] || key,
    value,
  }))

  const saveActivity = async () => {
    if (!activity.setterName) return
    setSavingActivity(true)
    try {
      await upsertSalesActivity(activity)
      onRefresh?.()
    } finally {
      setSavingActivity(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
        <label className="text-xs text-slate-400">
          From
          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
            className="mt-1 block rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-400">
          To
          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
            className="mt-1 block rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-400">
          Setter
          <select
            value={filters.setter || ''}
            onChange={(e) => onFiltersChange({ ...filters, setter: e.target.value })}
            className="mt-1 block rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          >
            <option value="">All</option>
            {setters.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Closer
          <select
            value={filters.closer || ''}
            onChange={(e) => onFiltersChange({ ...filters, closer: e.target.value })}
            className="mt-1 block rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          >
            <option value="">All</option>
            {closers.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[120px] flex-1 text-xs text-slate-400">
          Source
          <input
            value={filters.source || ''}
            onChange={(e) => onFiltersChange({ ...filters, source: e.target.value })}
            placeholder="Any"
            className="mt-1 block w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
          />
        </label>
      </div>

      <Section title="Daily setter activity">
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <label className="text-xs text-slate-400">
            Date
            <input
              type="date"
              value={activity.date}
              onChange={(e) => setActivity((a) => ({ ...a, date: e.target.value }))}
              className="mt-1 block rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-400">
            Setter
            <input
              list="dash-setters"
              value={activity.setterName}
              onChange={(e) => setActivity((a) => ({ ...a, setterName: e.target.value }))}
              className="mt-1 block rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
            />
            <datalist id="dash-setters">
              {setters.map((m) => (
                <option key={m.name} value={m.name} />
              ))}
            </datalist>
          </label>
          {['dials', 'dmsSent', 'conversations'].map((key) => (
            <label key={key} className="text-xs text-slate-400">
              {key === 'dmsSent' ? 'DMs sent' : key.charAt(0).toUpperCase() + key.slice(1)}
              <input
                type="number"
                min={0}
                value={activity[key]}
                onChange={(e) =>
                  setActivity((a) => ({ ...a, [key]: Number(e.target.value) || 0 }))
                }
                className="mt-1 block w-24 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
              />
            </label>
          ))}
          <button
            type="button"
            disabled={savingActivity || !activity.setterName}
            onClick={saveActivity}
            className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {savingActivity ? 'Saving…' : 'Save activity'}
          </button>
        </div>
      </Section>

      <Section title="Setter metrics">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <Metric label="Dials" value={setter.dials} />
          <Metric label="DMs sent" value={setter.dmsSent} />
          <Metric label="Conversations" value={setter.conversations} />
          <Metric label="Conv → booked %" value={`${setter.conversationsToBookedPct}%`} />
          <Metric label="Speed to lead" value={`${setter.speedToLeadMinutes}m`} hint="Avg minutes" />
          <Metric
            label="Booking lag"
            value={`${setter.bookingLagDays}d`}
            danger={setter.bookingLagDays > 4}
            hint="Avg days"
          />
          <Metric label="Calls scheduled" value={setter.callsScheduled} />
          <Metric label="Calls taken" value={setter.callsTaken} />
          <Metric label="Declines" value={setter.declines} />
          <Metric label="Cancels" value={setter.cancels} />
          <Metric label="No-shows" value={setter.noShows} />
          <Metric label="Show-up rate" value={`${setter.showUpRatePct}%`} />
          <Metric label="DQ rate" value={`${setter.dqRatePct}%`} />
        </div>
      </Section>

      <Section title="Closer metrics">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Offer rate" value={`${closer.offerRatePct}%`} />
          <Metric label="Close rate" value={`${closer.closeRatePct}%`} />
          <Metric label="Close on offers" value={`${closer.closeRateOnOffersPct}%`} />
          <Metric label="1-call sales" value={closer.oneCallSales} />
          <Metric label="Follow-up sales" value={closer.followUpSales} />
          <Metric label="Avg deal size" value={formatMoney(closer.averageDealSize)} />
          <Metric label="RPC" value={formatMoney(closer.revenuePerCall)} hint="Revenue per call taken" />
          <Metric
            label="Follow-up aging"
            value={closer.followUpAgingCount}
            danger={closer.followUpAgingCount > 0}
            hint="Untouched 7+ days"
          />
        </div>
        {lossData.length ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="h-56 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase text-slate-500">Loss reasons</p>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={lossData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {lossData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f1219',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase text-slate-500">Loss breakdown</p>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={lossData}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1219',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Money">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Deposits" value={formatMoney(money.deposits)} />
          <Metric label="Total sales" value={formatMoney(money.totalSales)} />
          <Metric label="Cash collected" value={formatMoney(money.cashCollected)} />
          <Metric label="Deposit → PIF %" value={`${money.depositToPaidInFullPct}%`} />
          <Metric label="Avg days to collect" value={money.avgDaysToCollect} />
          <Metric label="Refunds" value={formatMoney(money.refunds)} />
          <Metric label="Net revenue" value={formatMoney(money.netRevenue)} />
          <Metric
            label="Goal completion"
            value={`${money.goalCompletionPct}%`}
            hint={money.revenueGoal ? `Goal ${formatMoney(money.revenueGoal)}` : 'Set goal in Team'}
          />
        </div>
        {Object.keys(money.commissionsByRep || {}).length ? (
          <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase text-slate-500">
              Commissions earned (net of clawbacks)
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(money.commissionsByRep).map(([rep, amt]) => (
                <div key={rep} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="text-xs text-slate-400">{rep}</p>
                  <p className="text-sm font-semibold text-emerald-300">{formatMoney(amt)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Leak signals">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Booking lag" value={leaks.bookingLag} danger={leaks.bookingLag > 0} />
          <Metric label="Follow-up aging" value={leaks.followUpAging} danger={leaks.followUpAging > 0} />
          <Metric label="Deposit unpaid" value={leaks.depositUnpaid} danger={leaks.depositUnpaid > 0} />
        </div>
        {agingLeads?.length ? (
          <ul className="mt-2 space-y-1">
            {agingLeads.slice(0, 8).map((l) => (
              <li key={l.id} className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-3 py-2 text-sm text-rose-200">
                {l.name || l.email} — untouched follow-up
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
    </div>
  )
}
