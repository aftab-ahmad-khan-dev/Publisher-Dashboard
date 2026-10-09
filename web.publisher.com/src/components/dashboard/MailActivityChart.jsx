import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-white/10 bg-[#111113] px-2.5 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <p key={p.dataKey} className="text-xs tabular-nums text-zinc-200">
            {p.name}: <span className="font-medium text-white">{p.value}</span>
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

  const empty = data.every((d) => !d.sent && !d.opened && !d.clicked)

  return (
    <section className="saas-content-card flex h-full min-h-[280px] flex-col">
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
          <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-white/[0.08]">
            <p className="max-w-xs text-center text-xs text-zinc-500">
              Activity appears here after campaigns start sending.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#a1a1aa"
                strokeWidth={1.75}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0, fill: '#fafafa' }}
              />
              <Line
                type="monotone"
                dataKey="opened"
                name="Opened"
                stroke="#fafafa"
                strokeWidth={1.75}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0, fill: '#fafafa' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
