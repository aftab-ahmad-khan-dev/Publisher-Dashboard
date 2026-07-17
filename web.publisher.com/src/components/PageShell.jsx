export default function PageShell({ children, className = '' }) {
  return (
    <div className={`page-shell saas-page-shell flex h-full min-h-0 w-full flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function PageBody({ children, className = '' }) {
  return <div className={`page-body min-h-0 flex-1 overflow-hidden ${className}`}>{children}</div>
}

export function PageScroll({ children, className = '' }) {
  return (
    <div className={`saas-page-scroll scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch] ${className}`}>
      {children}
    </div>
  )
}

export { PageStatsRow, PageStat, ContentCard, PageSection, PageGrid, InfoBanner } from './PageLayout'

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="saas-empty-state">
      {icon && <div className="saas-empty-state__icon">{icon}</div>}
      <p className="font-display text-base font-semibold text-slate-200">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
