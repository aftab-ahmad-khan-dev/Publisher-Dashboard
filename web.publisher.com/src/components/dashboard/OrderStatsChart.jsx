import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0)
  return (
    <div className="orbit-chart-tip">
      <p className="orbit-chart-tip__value">{total.toLocaleString()}</p>
      <p className="orbit-chart-tip__label">{label}</p>
    </div>
  )
}

/**
 * Bar chart — solid maroon top + sage hatch base.
 */
export default function OrderStatsChart({
  series = [],
  title = 'Mail statistics',
  subtitle = 'Sent volume over time',
  dataKey = 'sent',
  onExport,
}) {
  const [range, setRange] = useState(10)
  const data = useMemo(() => {
    const rows = Array.isArray(series) ? series : []
    return rows.slice(-range).map((r) => {
      const value = Number(r[dataKey] || 0)
      const top = Math.round(value * 0.42)
      const base = Math.max(0, value - top)
      return {
        label: r.label || r.date,
        value,
        top,
        base,
      }
    })
  }, [series, range, dataKey])

  const empty = !data.length || data.every((d) => !d.value)

  return (
    <section className="orbit-panel flex h-full min-h-[320px] flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="orbit-panel__title">{title}</h3>
          <p className="orbit-panel__desc">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="orbit-select"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            aria-label="Chart range"
          >
            <option value={7}>Last 7 days</option>
            <option value={10}>Last 10 days</option>
          </select>
          {onExport && !empty ? (
            <button type="button" className="orbit-ghost-btn" onClick={onExport}>
              Export
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {empty ? (
          <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-[#757D6F]/45 bg-[#EEEAD7]">
            <p className="max-w-xs text-center text-sm font-medium text-[#5a6258]">
              Activity appears here after campaigns start sending.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 28, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
              <defs>
                <pattern
                  id="orbit-hatch"
                  patternUnits="userSpaceOnUse"
                  width="7"
                  height="7"
                  patternTransform="rotate(45)"
                >
                  <rect width="7" height="7" fill="#D9D3BC" />
                  <line x1="0" y1="0" x2="0" y2="7" stroke="#757D6F" strokeWidth="2.5" />
                </pattern>
              </defs>
              <CartesianGrid stroke="rgba(45,0,0,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#757D6F', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#757D6F', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip cursor={{ fill: 'rgba(109,8,8,0.06)' }} content={<ChartTip />} />
              <Bar
                dataKey="base"
                stackId="mail"
                fill="url(#orbit-hatch)"
                radius={[0, 0, 8, 8]}
                maxBarSize={40}
              />
              <Bar
                dataKey="top"
                stackId="mail"
                fill="#6D0808"
                radius={[10, 10, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
