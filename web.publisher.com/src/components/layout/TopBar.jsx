import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useAppData } from '../../contexts/AppDataContext'
import { NAV_ITEMS } from '../../lib/constants'
import { getConnectionSummary } from '../../lib/connections'
import { isLivePublishing } from '../../lib/api'

export default function TopBar({ onMenuOpen }) {
  const { user, logout } = useAuth()
  const { apiConfig } = useAppData()
  const { pathname } = useLocation()
  const title = NAV_ITEMS.find((n) => pathname.startsWith(n.path))?.label ?? 'Dashboard'
  const { connectedCount, anyConnected } = getConnectionSummary(apiConfig)
  const live = isLivePublishing()

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] bg-[#08090f]/80 px-4 backdrop-blur-2xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="rounded-lg p-2 text-slate-400 ring-1 ring-white/10 hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="font-display text-lg font-bold text-white sm:text-xl">{title}</h1>
          <p className="hidden text-xs text-slate-500 sm:block">Manage your cross-platform content</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {live ? (
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 sm:inline-flex">
            Live publish API
          </span>
        ) : (
          <span className="hidden rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400/90 sm:inline-block">
            Demo publish (no live posts)
          </span>
        )}
        {anyConnected && !live ? (
          <span className="hidden text-[10px] text-slate-500 sm:inline">
            {connectedCount} credential{connectedCount !== 1 ? 's' : ''} in localStorage
          </span>
        ) : null}

        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-bold text-white">
            JM
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="ml-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
