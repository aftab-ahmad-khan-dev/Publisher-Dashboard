import { useEffect, useState } from 'react'
import { formatMoney } from '../../lib/salesConstants'

function CaseCard({ title, data, eom, accent }) {
  return (
    <div
      className={`rounded-md border p-4 ${
        accent === 'best'
          ? 'border-white/25 bg-white/[0.08]'
          : accent === 'worst'
            ? 'border-rose-500/30 bg-rose-500/[0.06]'
            : 'border-white/[0.12] bg-white/[0.04]'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
        {formatMoney(eom?.revenue ?? data?.revenue)}
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        End-of-month revenue · Cash {formatMoney(eom?.cash ?? data?.cash)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
        <div>
          <p className="text-zinc-500">Pipeline add</p>
          <p className="font-semibold text-zinc-200">{formatMoney(data?.revenue)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Expected sales</p>
          <p className="font-semibold text-zinc-200">{data?.expectedSales ?? '—'}</p>
        </div>
      </div>
    </div>
  )
}

export default function SalesProjection({ projection, onReload }) {
  const [overrides, setOverrides] = useState({
    showUpRate: '',
    offerRate: '',
    closeRate: '',
    avgDealSize: '',
  })

  useEffect(() => {
    if (!projection?.assumptions) return
    setOverrides({
      showUpRate: String(projection.assumptions.showUpRatePct ?? ''),
      offerRate: String(projection.assumptions.offerRatePct ?? ''),
      closeRate: String(projection.assumptions.closeRatePct ?? ''),
      avgDealSize: String(projection.assumptions.avgDealSize ?? ''),
    })
  }, [projection?.assumptions?.scheduledMeetings])

  if (!projection) {
    return <p className="py-12 text-center text-sm text-zinc-500">Loading projection…</p>
  }

  const a = projection.assumptions

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          Assumptions
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {a.scheduledMeetings} meetings in pipeline · rates from trailing performance (editable)
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { key: 'showUpRate', label: 'Show-up %' },
            { key: 'offerRate', label: 'Offer %' },
            { key: 'closeRate', label: 'Close %' },
            { key: 'avgDealSize', label: 'Avg deal $' },
          ].map((f) => (
            <label key={f.key} className="text-xs text-zinc-400">
              {f.label}
              <input
                type="number"
                value={overrides[f.key]}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, [f.key]: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-sm text-white"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onReload?.(overrides)}
          className="mt-3 btn-primary px-3 py-2 text-xs"
        >
          Recalculate
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <CaseCard
          title="Best case (+20%)"
          data={projection.best}
          eom={projection.endOfMonth?.best}
          accent="best"
        />
        <CaseCard
          title="Expected"
          data={projection.expected}
          eom={projection.endOfMonth?.expected}
          accent="expected"
        />
        <CaseCard
          title="Worst case (−20%)"
          data={projection.worst}
          eom={projection.endOfMonth?.worst}
          accent="worst"
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-zinc-400">
        Current net revenue {formatMoney(projection.current?.netRevenue)} · Cash collected{' '}
        {formatMoney(projection.current?.cashCollected)}. Projection adds forecasted closes from
        remaining pipeline meetings.
      </div>
    </div>
  )
}
