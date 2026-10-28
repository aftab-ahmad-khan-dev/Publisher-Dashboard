import { Area, AreaChart, ResponsiveContainer } from 'recharts'

function TrendBadge({ value }) {
  if (value == null || Number.isNaN(Number(value))) return null
  const n = Number(value)
  const up = n >= 0
  return (
    <span
      className={`text-[11px] font-medium tabular-nums ${
        up ? 'text-emerald-400' : 'text-rose-400'
      }`}
    >
      {up ? '+' : ''}
      {n}%
    </span>
  )
}

/**
 * Metric tile with optional sparkline from the overview series.
 */
export default function KpiCard({
  label,
  value,
  hint,
  trend,
  series = [],
  dataKey = 'value',
  featured = false,
  tone = 'zinc',
}) {
  const stroke =
    tone === 'rose'
      ? '#f87171'
      : tone === 'sky'
        ? '#7dd3fc'
        : tone === 'emerald'
          ? '#34d399'
          : featured
            ? '#fafafa'
            : '#a1a1aa'

  const chartData = series.map((point, i) => ({
    i,
    value: typeof point === 'number' ? point : Number(point?.[dataKey] ?? 0),
  }))
  const hasChart = chartData.length > 1 && chartData.some((d) => d.value > 0)

  return (
    <div
      className={`kpi-card relative overflow-hidden ${
        featured ? 'kpi-card--featured' : 'kpi-card--plain'
      }`}
    >
      <div className="relative z-[1] flex items-start justify-between gap-2">
        <p className="kpi-card__label">{label}</p>
        <TrendBadge value={trend} />
      </div>
      <p className="kpi-card__value relative z-[1]">{value}</p>
      {hint ? <p className="kpi-card__hint relative z-[1]">{hint}</p> : null}

      {hasChart ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] opacity-80"
          aria-hidden
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`kpi-fill-${tone}-${featured ? 'f' : 'p'}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={featured ? 0.35 : 0.22} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={1.5}
                fill={`url(#kpi-fill-${tone}-${featured ? 'f' : 'p'})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}
