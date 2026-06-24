import { Link, useLocation } from 'react-router-dom'
import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'
import { useAppData } from '../../contexts/AppDataContext'
import { isLivePublishing } from '../../lib/api'
import { NAV_ITEMS } from '../../lib/constants'
import { ADMIN_NAV_ITEM } from '../../lib/admin'
import { clerkAppearance } from '../../lib/clerkAppearance'
import BrandLogo from '../BrandLogo'

function Breadcrumb() {
  const { pathname } = useLocation()
  const allItems = [...NAV_ITEMS, ADMIN_NAV_ITEM]
  const match = allItems.find((n) => pathname.startsWith(n.path))
  const page = match?.label ?? 'Dashboard'

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
      <BrandLogo className="h-7 w-7 shrink-0 lg:hidden" />
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Link to="/compose" className="truncate font-medium text-slate-500 transition hover:text-slate-300">
          Suite
        </Link>
        <span className="text-slate-700">/</span>
        <span className="truncate font-display font-semibold text-white">{page}</span>
      </div>
      <span className="truncate font-display text-base font-bold text-white sm:hidden">{page}</span>
    </nav>
  )
}

export default function TopBar() {
  const { queue, drafts, syncing } = useAppData()
  const live = isLivePublishing()
  const scheduled = queue?.length ?? 0
  const draftCount = drafts?.length ?? 0

  return (
    <header className="saas-topbar z-30 shrink-0">
      <div className="flex min-h-[3.5rem] items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
        <div className="min-w-0 flex-1">
          <Breadcrumb />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {syncing && (
            <span className="hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-400 lg:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              Syncing
            </span>
          )}

          <div className="hidden items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 lg:flex">
            <span className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-400">
              <span className="text-violet-300">{scheduled}</span> queued
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-400">
              <span className="text-amber-300">{draftCount}</span> drafts
            </span>
          </div>

          {live ? (
            <span className="saas-status-pill saas-status-pill--live hidden sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Live API
            </span>
          ) : (
            <span className="saas-status-pill saas-status-pill--demo hidden sm:inline-flex">Demo mode</span>
          )}

          <div className="saas-topbar__account">
            <OrganizationSwitcher
              appearance={clerkAppearance}
              hidePersonal={false}
              afterCreateOrganizationUrl="/compose"
              afterSelectOrganizationUrl="/compose"
              afterSelectPersonalUrl="/compose"
            />
            <UserButton appearance={clerkAppearance} afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </div>
    </header>
  )
}
