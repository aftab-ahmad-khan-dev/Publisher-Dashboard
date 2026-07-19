import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getNavItems } from '../../lib/admin'
import { useAuth } from '../../contexts/AuthContext'
import { useAppData } from '../../contexts/AppDataContext'

const ICONS = {
  overview: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />,
  compose: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  bulk: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
  email: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  sales: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />,
  drafts: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  scheduled: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  api: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  guide: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
  billing: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
}

const PRIMARY = ['/overview', '/compose', '/email', '/scheduled']

function NavIcon({ icon, count, active }) {
  return (
    <span className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? 'bg-indigo-500/20 text-indigo-300' : ''}`}>
      <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {ICONS[icon]}
      </svg>
      {count > 0 && (icon === 'drafts' || icon === 'scheduled') && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#07080f]">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  )
}

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { user } = useAuth()
  const app = useAppData()
  const { pathname } = useLocation()
  const navItems = getNavItems(user?.email, app.subscription)
  const counts = { drafts: app.drafts?.length || 0, scheduled: app.queue?.length || 0 }

  const primary = PRIMARY.map((p) => navItems.find((n) => n.path === p)).filter(Boolean)
  const overflow = navItems.filter((n) => !PRIMARY.includes(n.path))
  const moreActive = overflow.some((n) => pathname.startsWith(n.path))

  return (
    <div className="lg:hidden">
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {moreOpen && (
        <div className="saas-mobile-sheet fixed inset-x-3 bottom-[4.85rem] z-50 p-2">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">More</p>
          <div className="grid grid-cols-2 gap-1.5">
            {overflow.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-500/25'
                      : 'text-slate-300 hover:bg-white/[0.04]'
                  }`
                }
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {ICONS[item.icon]}
                </svg>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{item.label}</span>
                  {item.locked && (
                    <svg className="h-3 w-3 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav className="saas-bottom-nav fixed inset-x-0 bottom-0 z-50 flex h-[4.35rem] items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {primary.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMoreOpen(false)}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
                isActive ? 'text-indigo-300' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon icon={item.icon} count={counts[item.icon]} active={isActive} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
            moreOpen || moreActive ? 'text-indigo-300' : 'text-slate-500'
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              moreOpen || moreActive ? 'bg-indigo-500/20' : ''
            }`}
          >
            <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={moreOpen ? 'M6 18 18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </span>
          More
        </button>
      </nav>
    </div>
  )
}
