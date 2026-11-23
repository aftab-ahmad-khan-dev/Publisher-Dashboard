export default function PageHeader({ title, subtitle, action, compact = true }) {
  return (
    <div className="orbit-page-header shrink-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="orbit-page-header__mark" aria-hidden>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
              </svg>
            </span>
            <h1 className={`orbit-page-header__title ${compact ? 'orbit-page-header__title--sm' : ''}`}>
              {title}
            </h1>
          </div>
          {subtitle ? (
            <p className="orbit-page-header__sub mt-1 line-clamp-2">{subtitle}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}
