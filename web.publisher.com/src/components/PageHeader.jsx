export default function PageHeader({ title, subtitle, action, compact = true }) {
  return (
    <div className={`saas-page-header shrink-0 ${compact ? 'mb-4' : 'mb-6'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="saas-page-header__accent hidden sm:block" aria-hidden />
            <div className="min-w-0">
              <h1 className={`truncate ${compact ? 'page-title-compact' : 'page-title'}`}>
                {title}
              </h1>
              {subtitle && (
                <p
                  className={`page-subtitle mt-0.5 line-clamp-2 ${
                    compact ? 'text-[12px] sm:text-xs' : ''
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        {action && (
          <div className="saas-page-header__actions flex shrink-0 flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
