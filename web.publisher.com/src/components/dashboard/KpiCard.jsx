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

/** Quiet metric tile — no neon fills, no decorative charts. */
export default function KpiCard({ label, value, hint, trend }) {
  return (
    <div className="kpi-card kpi-card--plain">
      <div className="flex items-center justify-between gap-2">
        <p className="kpi-card__label">{label}</p>
        <TrendBadge value={trend} />
      </div>
      <p className="kpi-card__value">{value}</p>
      {hint ? <p className="kpi-card__hint">{hint}</p> : null}
    </div>
  )
}
