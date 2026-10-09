import { Area, AreaChart, ResponsiveContainer } from 'recharts'

function TrendBadge({ value }) {
  if (value == null || Number.isNaN(Number(value))) return null
  const n = Number(value)
  const up = n >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
        up ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
      }`}
    >
      <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d={up ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {Math.abs(n)}%
    </span>
  )
}

/**
 * KPI scorecard with optional sparkline — matches the reference dashboard cards.
 */
export default function KpiCard({
  label,
  value,
  hint,
  trend,
  series = [],
  dataKey = 'value',
  featured = false,
  tone = 'indigo',
}) {
  const stroke =
    tone === 'rose'
      ? '#fb7185'
      : tone === 'sky'
        ? '#38bdf8'
        : tone === 'emerald'
          ? '#34d399'
          : '#a78bfa'

  const chartData = series.map((point, i) => ({
    i,
    value: typeof point === 'number' ? point : Number(point?.[dataKey] ?? 0),
  }))

  return (
    <div
      className={`kpi-card relative overflow-hidden ${
        featured ? 'kpi-card--featured' : 'kpi-card--plain'
      }`}
    >
      <div className="relative z-[1] flex items-start justify-between gap-2">
        <p className={`kpi-card__label ${featured ? 'text-indigo-200/80' : ''}`}>{label}</p>
        <TrendBadge value={trend} />
      </div>
      <p className={`kpi-card__value relative z-[1] ${featured ? 'text-white' : ''}`}>{value}</p>
      {hint ? (
        <p className={`kpi-card__hint relative z-[1] ${featured ? 'text-indigo-200/60' : ''}`}>
          {hint}
        </p>
      ) : null}

      {chartData.length > 1 ? (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 ${
            featured ? 'h-[52%]' : 'h-[42%]'
          } opacity-90`}
          aria-hidden
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`kpi-fill-${tone}-${featured ? 'f' : 'p'}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={featured ? 0.55 : 0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={featured ? 2.25 : 1.75}
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
