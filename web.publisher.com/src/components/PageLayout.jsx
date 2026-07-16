/** Shared premium SaaS page building blocks. */

export function PageStatsRow({ children, className = '' }) {
  return <div className={`saas-page-stats ${className}`}>{children}</div>
}

const STAT_TONES = {
  default: 'saas-stat-card',
  indigo: 'saas-stat-card saas-stat-card--indigo',
  violet: 'saas-stat-card saas-stat-card--indigo',
  amber: 'saas-stat-card saas-stat-card--amber',
  emerald: 'saas-stat-card saas-stat-card--emerald',
  rose: 'saas-stat-card saas-stat-card--rose',
}

export function PageStat({ label, value, hint, tone = 'default' }) {
  return (
    <div className={STAT_TONES[tone] || STAT_TONES.default}>
      <p className="saas-stat-card__label">{label}</p>
      <p className="saas-stat-card__value">{value}</p>
      {hint && <p className="saas-stat-card__hint">{hint}</p>}
    </div>
  )
}

export function ContentCard({ children, className = '', flush = false }) {
  return (
    <section className={`saas-content-card ${flush ? 'saas-content-card--flush' : ''} ${className}`}>
      {children}
    </section>
  )
}

export function PageSection({ title, description, action, children, className = '', bodyClassName = '' }) {
  return (
    <ContentCard className={className}>
      {(title || description || action) && (
        <div className="saas-section-header">
          <div className="min-w-0">
            {title && <h2 className="saas-section-title">{title}</h2>}
            {description && <p className="saas-section-desc">{description}</p>}
          </div>
          {action && <div className="saas-section-action shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </ContentCard>
  )
}

export function PageGrid({ children, cols = 2, className = '' }) {
  const colClass = cols === 3 ? 'saas-page-grid--3' : cols === 1 ? 'saas-page-grid--1' : ''
  return <div className={`saas-page-grid ${colClass} ${className}`}>{children}</div>
}

export function InfoBanner({ children, tone = 'indigo', className = '' }) {
  return <div className={`saas-info-banner saas-info-banner--${tone} ${className}`}>{children}</div>
}
