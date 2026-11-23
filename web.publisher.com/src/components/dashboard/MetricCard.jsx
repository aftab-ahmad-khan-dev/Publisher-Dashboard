/**
 * Metric tile — featured maroon card or cream plain card.
 */
export default function MetricCard({
  label,
  value,
  hint,
  trend,
  featured = false,
  icon,
}) {
  const n = Number(trend)
  const hasTrend = trend != null && !Number.isNaN(n)
  const up = n >= 0

  return (
    <article
      className={`orbit-metric ${featured ? 'orbit-metric--featured on-dark' : 'orbit-metric--plain'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="orbit-metric__label">{label}</p>
          <p className="orbit-metric__value">{value}</p>
          {hint ? <p className="orbit-metric__hint">{hint}</p> : null}
        </div>
        {icon ? (
          <div className={`orbit-metric__icon ${featured ? 'keep-light' : ''}`}>{icon}</div>
        ) : null}
      </div>

      {hasTrend ? (
        <div
          className={`orbit-metric__trend ${
            up ? 'orbit-metric__trend--up' : 'orbit-metric__trend--down'
          }`}
        >
          <span aria-hidden>{up ? '▲' : '▼'}</span>
          <span>
            {up ? '+' : ''}
            {n}% than last period
          </span>
        </div>
      ) : null}
    </article>
  )
}
