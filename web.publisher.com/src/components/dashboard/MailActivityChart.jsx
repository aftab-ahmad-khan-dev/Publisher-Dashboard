import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-xl">
      <p className="text-[11px] text-slate-400">{label}</p>
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <p key={p.dataKey} className="text-xs tabular-nums text-slate-600">
            <span
              className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: p.color }}
            />
            {p.name}: <span className="font-medium text-slate-900">{p.value}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

export default function MailActivityChart({ series = [], onDownload, lifetimeSent = 0 }) {
  const [range, setRange] = useState(10)
  const data = useMemo(() => {
    const rows = Array.isArray(series) ? series : []
    return rows.slice(-range)
  }, [series, range])

  const empty = data.every((d) => !d.sent && !d.opened && !d.clicked)

  const peak = useMemo(() => {
    if (!data.length) return null
    let best = data[0]
    for (const row of data) {
      if ((row.sent || 0) > (best.sent || 0)) best = row
    }
    if (!best?.sent) return null
    const avg = data.reduce((a, r) => a + (r.sent || 0), 0) / data.length
    const lift = avg > 0 ? Math.round(((best.sent - avg) / avg) * 100) : 0
    return { ...best, lift }
  }, [data])

  return (
    <section className="saas-content-card flex h-full min-h-[300px] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="saas-section-title">Mail activity</h3>
          <p className="saas-section-desc">Sent and opened over time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="saas-select py-1.5 text-xs"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            aria-label="Chart range"
          >
            <option value={7}>Last 7 days</option>
            <option value={10}>Last 10 days</option>
          </select>
          {onDownload ? (
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={onDownload}>
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {empty ? (
          <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
            <p className="max-w-xs text-center text-xs text-slate-400">
              {lifetimeSent > 0
                ? 'No sends in this date range. Totals above include earlier campaigns.'
                : 'Activity chart fills in after campaigns start sending.'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="mail-sent-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mail-opened-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8f542" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#c8f542" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(15,23,42,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#mail-sent-fill)"
                activeDot={{ r: 4, strokeWidth: 0, fill: '#22c55e' }}
              />
              <Area
                type="monotone"
                dataKey="opened"
                name="Opened"
                stroke="#84cc16"
                strokeWidth={2}
                fill="url(#mail-opened-fill)"
                activeDot={{ r: 4, strokeWidth: 0, fill: '#84cc16' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {peak?.lift > 0 ? (
          <div className="pointer-events-none absolute right-[14%] top-2 hidden rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm sm:block">
            Peak +{peak.lift}% · {peak.label}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> Sent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#84cc16]" /> Opened
        </span>
      </div>
    </section>
  )
}
