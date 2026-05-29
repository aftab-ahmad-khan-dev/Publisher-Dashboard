import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../lib/constants'
import { useAppData } from '../../contexts/AppDataContext'

const ICONS = {
  compose: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  bulk: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
  email: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  drafts: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  scheduled: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  api: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  guide: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
}

// Most-used items live in the bar; the rest go in the "More" sheet.
const PRIMARY = ['/compose', '/calendar', '/scheduled', '/drafts']

function NavIcon({ icon, count }) {
  return (
    <span className="relative">
      <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {ICONS[icon]}
      </svg>
      {count > 0 && (icon === 'drafts' || icon === 'scheduled') && (
        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-600 px-1 text-[9px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </span>
  )
}

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const app = useAppData()
  const { pathname } = useLocation()
  const counts = { drafts: app.drafts?.length || 0, scheduled: app.queue?.length || 0 }

  const primary = PRIMARY.map((p) => NAV_ITEMS.find((n) => n.path === p)).filter(Boolean)
  const overflow = NAV_ITEMS.filter((n) => !PRIMARY.includes(n.path))
  const moreActive = overflow.some((n) => pathname.startsWith(n.path))

  return (
    <div className="lg:hidden">
      {/* Tap-away overlay */}
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* Upward dropdown of overflow items */}
      {moreOpen && (
        <div className="fixed inset-x-3 bottom-[4.75rem] z-50 rounded-2xl border border-white/10 bg-[#0b0d16]/95 p-2 shadow-2xl backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-1.5">
            {overflow.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive ? 'bg-violet-500/20 text-white ring-1 ring-violet-500/30' : 'text-slate-300 hover:bg-white/5'
                  }`
                }
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {ICONS[item.icon]}
                </svg>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[4.25rem] items-stretch justify-around border-t border-white/[0.08] bg-[#08090f]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
        {primary.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMoreOpen(false)}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
                isActive ? 'text-violet-300' : 'text-slate-500'
              }`
            }
          >
            <NavIcon icon={item.icon} count={counts[item.icon]} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
            moreOpen || moreActive ? 'text-violet-300' : 'text-slate-500'
          }`}
        >
          <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={moreOpen ? 'M6 18 18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
          More
        </button>
      </nav>
    </div>
  )
}
