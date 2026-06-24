import { useLocation } from 'react-router-dom'
import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'
import { useAppData } from '../../contexts/AppDataContext'
import { NAV_ITEMS } from '../../lib/constants'
import { getConnectionSummary } from '../../lib/connections'
import { isLivePublishing } from '../../lib/api'
import { clerkAppearance } from '../../lib/clerkAppearance'
import BrandLogo from '../BrandLogo'

export default function TopBar() {
  const { apiConfig } = useAppData()
  const { pathname } = useLocation()
  const title = NAV_ITEMS.find((n) => pathname.startsWith(n.path))?.label ?? 'Dashboard'
  const { connectedCount, anyConnected } = getConnectionSummary(apiConfig)
  const live = isLivePublishing()

  return (
    <header className="z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#08090f]/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-2xl sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {/* Brand mark on mobile (sidebar logo is hidden there) */}
        <BrandLogo className="h-8 w-8 shrink-0 lg:hidden" />
        <div className="min-w-0">
          <h1 className="font-display truncate whitespace-nowrap text-lg font-bold text-white sm:text-xl">{title}</h1>
          <p className="hidden text-xs text-slate-500 sm:block">Manage your cross-platform content</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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

        <div className="max-w-[42vw] sm:max-w-none [&_.cl-organizationSwitcherTrigger]:max-w-full">
          <OrganizationSwitcher
            appearance={clerkAppearance}
            hidePersonal={false}
            afterCreateOrganizationUrl="/compose"
            afterSelectOrganizationUrl="/compose"
            afterSelectPersonalUrl="/compose"
          />
          <p className="mt-0.5 hidden text-[10px] text-slate-600 sm:block">
            Posts &amp; config stay on your account
          </p>
        </div>
        <UserButton
          appearance={clerkAppearance}
          afterSignOutUrl="/sign-in"
        />
      </div>
    </header>
  )
}
