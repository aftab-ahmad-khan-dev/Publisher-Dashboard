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
    <div className="rounded-xl border border-white/10 bg-[#0c101a]/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <p key={p.dataKey} className="text-xs tabular-nums text-slate-200">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-semibold text-white">{p.value}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

export default function MailActivityChart({ series = [], onDownload }) {
  const [range, setRange] = useState(10)
  const data = useMemo(() => {
    const rows = Array.isArray(series) ? series : []
    return rows.slice(-range)
  }, [series, range])

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
    <section className="saas-content-card flex h-full min-h-[280px] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="saas-section-title">Mail activity</h3>
          <p className="saas-section-desc">How outreach is landing day by day</p>
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
            <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={onDownload}>
              Download CSV
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {data.every((d) => !d.sent && !d.opened && !d.clicked) ? (
          <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
            <p className="max-w-xs text-center text-xs text-slate-500">
              Send a few campaigns and this chart will fill in with real opens and clicks.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="mail-sent-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mail-opened-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#818cf8"
                strokeWidth={2.25}
                fill="url(#mail-sent-fill)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#0b0e16', fill: '#a78bfa' }}
              />
              <Area
                type="monotone"
                dataKey="opened"
                name="Opened"
                stroke="#34d399"
                strokeWidth={1.75}
                fill="url(#mail-opened-fill)"
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#0b0e16', fill: '#6ee7b7' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {peak?.lift > 0 ? (
          <div className="pointer-events-none absolute right-[18%] top-3 hidden rounded-lg border border-indigo-400/25 bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold text-indigo-200 sm:block">
            +{peak.lift}% · {peak.label}
          </div>
        ) : null}
      </div>
    </section>
  )
}
