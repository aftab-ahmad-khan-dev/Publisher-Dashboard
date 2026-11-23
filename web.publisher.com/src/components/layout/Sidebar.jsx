import { NavLink } from 'react-router-dom'
import { getNavGroups } from '../../lib/admin'
import { useAuth } from '../../contexts/AuthContext'
import { useAppData } from '../../contexts/AppDataContext'
import BrandLogo from '../BrandLogo'

const ICONS = {
  overview: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
  ),
  compose: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  ),
  bulk: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  ),
  email: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  ),
  sales: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  ),
  drafts: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  ),
  scheduled: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  calendar: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  ),
  api: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  ),
  guide: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  ),
  users: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  ),
  billing: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  ),
}

const BADGE_COUNTS = {
  drafts: (data) => data.drafts.length,
  scheduled: (data) => data.queue.length,
}

function RailItem({ path, label, icon, locked, count, onNavigate }) {
  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      title={locked ? `${label} (Pro)` : label}
      aria-label={label}
      className={({ isActive }) =>
        `orbit-rail__link ${isActive ? 'orbit-rail__link--active' : ''} ${locked ? 'is-locked' : ''}`
      }
    >
      {({ isActive }) => (
        <span className={`orbit-rail__icon ${isActive ? 'orbit-rail__icon--active' : ''}`}>
          <svg
            className="orbit-rail__svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.85}
          >
            {ICONS[icon]}
          </svg>
          {count > 0 && (icon === 'drafts' || icon === 'scheduled') ? (
            <span className="orbit-rail__badge">{count > 9 ? '9+' : count}</span>
          ) : null}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ onNavigate, collapsed = true, onToggleCollapse }) {
  const { user } = useAuth()
  const app = useAppData()
  const navGroups = getNavGroups(user?.email, app.subscription)

  if (collapsed) {
    return (
      <aside className="orbit-rail">
        <div className="orbit-rail__brand">
          <BrandLogo className="orbit-rail__logo" />
        </div>

        <nav className="orbit-rail__nav scrollbar-none" aria-label="Main navigation">
          {navGroups.map((group, gi) => (
            <div key={group.id} className="orbit-rail__group">
              {gi > 0 ? <span className="orbit-rail__rule" aria-hidden /> : null}
              {group.items.map(({ path, label, icon, locked }) => {
                const countFn = BADGE_COUNTS[icon]
                const count = countFn ? countFn(app) : 0
                return (
                  <RailItem
                    key={path}
                    path={path}
                    label={label}
                    icon={icon}
                    locked={locked}
                    count={count}
                    onNavigate={onNavigate}
                  />
                )
              })}
            </div>
          ))}
        </nav>

        <div className="orbit-rail__foot">
          {onToggleCollapse ? (
            <button
              type="button"
              className="orbit-rail__expand"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand labels"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}
        </div>
      </aside>
    )
  }

  return (
    <aside className="saas-sidebar orbit-sidebar-wide flex h-full max-h-dvh w-full flex-col overflow-hidden lg:w-[232px]">
      <div className="saas-sidebar__brand">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-[14px] font-bold tracking-tight text-[#2D0000]">
              Publisher
            </p>
            <p className="truncate text-[10px] font-medium text-[#5a6258]">Workspace</p>
          </div>
        </div>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse to icon rail"
            className="saas-icon-btn hidden lg:flex"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}
      </div>

      <nav className="saas-sidebar__nav scrollbar-none flex-1 overflow-y-auto px-2.5 py-3">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-4 last:mb-0">
            <p className="saas-nav-section-label mb-1.5 px-2.5">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ path, label, icon, locked }) => {
                const countFn = BADGE_COUNTS[icon]
                const count = countFn ? countFn(app) : 0
                return (
                  <li key={path}>
                    <NavLink
                      to={path}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `saas-nav-link ${isActive ? 'saas-nav-link--active' : ''} ${
                          locked ? 'opacity-55' : ''
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`saas-nav-icon ${isActive ? 'saas-nav-icon--active' : ''}`}>
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              {ICONS[icon]}
                            </svg>
                            {count > 0 && (icon === 'drafts' || icon === 'scheduled') ? (
                              <span className="saas-nav-badge">{count > 9 ? '9+' : count}</span>
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {label}
                            {locked ? (
                              <span className="ml-1.5 rounded-md bg-[#EEEAD7] px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6D0808]">
                                Pro
                              </span>
                            ) : null}
                          </span>
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

      <div className="border-t border-[#757D6F]/15 px-3 py-3">
        <p className="truncate text-[11px] font-medium text-[#5a6258]">
          {user?.email || 'Signed in'}
        </p>
      </div>
    </aside>
  )
}
