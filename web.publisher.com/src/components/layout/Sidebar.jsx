import { NavLink } from 'react-router-dom'
import { getNavGroups } from '../../lib/admin'
import { useAuth } from '../../contexts/AuthContext'
import { useAppData } from '../../contexts/AppDataContext'
import { getConnectionSummary } from '../../lib/connections'
import { MetaSuiteIcons } from '../PlatformIcon'
import PlatformIcon from '../PlatformIcon'
import BrandLogo from '../BrandLogo'

const ICONS = {
  overview: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
  ),
  compose: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  ),
  bulk: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  ),
  email: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  ),
  drafts: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  ),
  scheduled: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  calendar: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  ),
  api: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  ),
  guide: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  ),
  users: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  ),
  billing: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  ),
}

const BADGE_COUNTS = {
  drafts: (data) => data.drafts.length,
  scheduled: (data) => data.queue.length,
}

function ConnectionRow({ ready, label, children }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2">{children}</div>
      <span
        className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
          ready ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-slate-600'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

export default function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }) {
  const { user } = useAuth()
  const app = useAppData()
  const navGroups = getNavGroups(user?.email, app.subscription)
  const {
    metaReady,
    linkedInReady,
    linkedInPublish,
    redditReady,
    threadsReady,
    gmailReady,
    connectedCount,
  } = getConnectionSummary(app.apiConfig)
  const linkedInLabel = linkedInPublish ? 'Live' : linkedInReady ? 'Setup' : 'Off'
  const gmailSendReady =
    app.apiConfig?.gmail?.sendReady ||
    app.apiConfig?.gmail?.hasRefreshToken ||
    app.apiConfig?.gmail?.smtpConfigured ||
    app.apiConfig?.gmail?.transport === 'smtp'
  const gmailLabel = gmailSendReady ? 'Live' : gmailReady ? 'Setup' : 'Off'
  const healthPct = Math.round((connectedCount / 5) * 100)

  return (
    <aside
      className={`saas-sidebar flex h-full max-h-dvh w-full flex-col overflow-hidden transition-[width] duration-300 ${
        collapsed ? 'lg:w-[76px]' : 'lg:w-[280px]'
      }`}
    >
      <div className={`saas-sidebar__brand ${collapsed ? 'lg:justify-center lg:px-3' : ''}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-sky-500/15 blur-md" />
            <BrandLogo className="relative h-10 w-10 rounded-xl shadow-lg shadow-indigo-500/20" />
          </div>
          {!collapsed && (
            <div className="min-w-0 lg:block">
              <p className="truncate font-display text-[15px] font-bold tracking-tight text-white">
                Publisher Suite
              </p>
              <p className="truncate text-[11px] text-slate-500">Cross-platform publishing</p>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`saas-icon-btn hidden lg:flex ${collapsed ? 'lg:hidden' : ''}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          className="saas-icon-btn mx-auto mt-3 hidden lg:flex"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <nav className="saas-sidebar__nav scrollbar-none flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-5 last:mb-2">
            {!collapsed && (
              <p className="saas-nav-section-label mb-2 px-2">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ path, label, icon, description, locked }) => {
                const countFn = BADGE_COUNTS[icon]
                const count = countFn ? countFn(app) : 0

                return (
                  <li key={path}>
                    <NavLink
                      to={path}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `saas-nav-link group ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                          isActive ? 'saas-nav-link--active' : ''
                        } ${locked ? 'opacity-70' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`saas-nav-icon ${isActive ? 'saas-nav-icon--active' : ''}`}>
                            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {ICONS[icon]}
                            </svg>
                            {count > 0 && (icon === 'drafts' || icon === 'scheduled') && (
                              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
                                {count > 9 ? '9+' : count}
                              </span>
                            )}
                          </span>
                          {!collapsed && (
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate">{label}</span>
                                {locked && (
                                  <svg className="h-3 w-3 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                )}
                              </span>
                              {description && (
                                <span className="block truncate text-[10px] font-normal text-slate-600 group-[.saas-nav-link--active]:text-indigo-300/70">
                                  {description}
                                </span>
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/[0.06] p-3">
          <div className="saas-connection-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Integrations
              </p>
              <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                {healthPct}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                style={{ width: `${healthPct}%` }}
              />
            </div>
            <div className="mt-3 space-y-0.5">
              <ConnectionRow ready={metaReady} label={metaReady ? 'Live' : 'Setup'}>
                <MetaSuiteIcons size="sm" />
              </ConnectionRow>
              <ConnectionRow ready={linkedInPublish || linkedInReady} label={linkedInLabel}>
                <PlatformIcon platform="linkedin" size="sm" />
              </ConnectionRow>
              <ConnectionRow ready={redditReady} label={redditReady ? 'Live' : 'Off'}>
                <PlatformIcon platform="reddit" size="sm" />
              </ConnectionRow>
              <ConnectionRow ready={threadsReady} label={threadsReady ? 'Live' : 'Off'}>
                <PlatformIcon platform="threads" size="sm" />
              </ConnectionRow>
              <ConnectionRow ready={gmailReady} label={gmailLabel}>
                <PlatformIcon platform="gmail" size="sm" />
              </ConnectionRow>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
