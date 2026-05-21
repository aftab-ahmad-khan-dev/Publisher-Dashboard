import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../lib/constants'
import { useAppData } from '../../contexts/AppDataContext'
import { getConnectionSummary } from '../../lib/connections'
import { MetaSuiteIcons } from '../PlatformIcon'
import PlatformIcon from '../PlatformIcon'

const ICONS = {
  compose: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
}

const BADGE_COUNTS = {
  drafts: (data) => data.drafts.length,
  scheduled: (data) => data.queue.length,
}

export default function Sidebar({ onNavigate }) {
  const app = useAppData()
  const { metaReady, linkedInReady } = getConnectionSummary(app.apiConfig)

  return (
    <aside className="flex h-full max-h-dvh w-full flex-col overflow-hidden border-r border-white/[0.07] bg-[#08090f]/95 backdrop-blur-2xl lg:w-[272px]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 shadow-lg shadow-fuchsia-500/20">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="font-display text-sm font-bold text-white">Pulse</p>
          <p className="text-[11px] text-slate-500">Publisher Suite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const countFn = BADGE_COUNTS[icon]
          const count = countFn ? countFn(app) : 0

          return (
            <NavLink
              key={path}
              to={path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-transparent text-white shadow-inner shadow-violet-500/10 ring-1 ring-violet-500/25'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      isActive ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.03] text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {ICONS[icon]}
                    </svg>
                    {count > 0 && (icon === 'drafts' || icon === 'scheduled') && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-600 px-1 text-[9px] font-bold text-white ring-2 ring-[#08090f]">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <div className="rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent p-3 ring-1 ring-white/[0.06]">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Connections</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <MetaSuiteIcons size="sm" />
            <span
              className={`text-[10px] font-semibold ${metaReady ? 'text-emerald-400' : 'text-slate-600'}`}
            >
              {metaReady ? 'Ready' : 'Setup'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <PlatformIcon platform="linkedin" size="sm" />
            <span
              className={`text-[10px] font-semibold ${linkedInReady ? 'text-emerald-400' : 'text-slate-600'}`}
            >
              {linkedInReady ? 'Ready' : 'Setup'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
