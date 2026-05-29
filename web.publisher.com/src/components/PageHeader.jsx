export default function PageHeader({ title, subtitle, action, compact = true }) {
  return (
    <div
      className={`page-header shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
        compact ? 'mb-2' : 'mb-4'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-fuchsia-500 via-violet-500 to-violet-600 sm:block" />
        <div className="min-w-0">
          <h2 className={`truncate ${compact ? 'page-title-compact' : 'page-title'}`}>{title}</h2>
          {subtitle && (
            <p className={`page-subtitle truncate ${compact ? 'text-[11px]' : ''}`}>{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {action}
        </div>
      )}
    </div>
  )
}
