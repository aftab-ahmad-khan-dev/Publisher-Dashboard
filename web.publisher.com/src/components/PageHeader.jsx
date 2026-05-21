export default function PageHeader({ title, subtitle, action, compact = true }) {
  return (
    <div
      className={`page-header shrink-0 flex flex-wrap items-center justify-between gap-2 ${
        compact ? 'mb-2' : 'mb-4'
      }`}
    >
      <div className="min-w-0">
        <h2 className={compact ? 'page-title-compact' : 'page-title'}>{title}</h2>
        {subtitle && (
          <p className={`page-subtitle truncate ${compact ? 'text-[11px]' : ''}`}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
