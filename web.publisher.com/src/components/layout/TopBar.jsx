import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'
import { useAppData } from '../../contexts/AppDataContext'
import { NAV_ITEMS } from '../../lib/constants'
import { ADMIN_NAV_ITEM } from '../../lib/admin'
import { clerkAppearance } from '../../lib/clerkAppearance'
import BrandLogo from '../BrandLogo'
import NotificationPanel from '../NotificationPanel'

const SEARCH_TARGETS = [
  ...NAV_ITEMS.map((n) => ({ ...n, keywords: [n.label, n.path].join(' ').toLowerCase() })),
  { ...ADMIN_NAV_ITEM, keywords: `${ADMIN_NAV_ITEM.label} ${ADMIN_NAV_ITEM.path}`.toLowerCase() },
  { path: '/email?tab=campaigns', label: 'New campaign', keywords: 'email campaign outreach send' },
  { path: '/email?tab=meetings', label: 'Meetings', keywords: 'meetings calendar book' },
  { path: '/email?tab=mailbox', label: 'Inbox', keywords: 'mail inbox mailbox messages' },
  { path: '/compose', label: 'Compose post', keywords: 'write post compose publish' },
]

function Breadcrumb() {
  const { pathname } = useLocation()
  const allItems = [...NAV_ITEMS, ADMIN_NAV_ITEM]
  const match = allItems.find((n) => pathname.startsWith(n.path))
  const page = match?.label ?? 'Dashboard'

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm lg:hidden">
      <BrandLogo className="h-7 w-7 shrink-0" />
      <span className="truncate font-display text-base font-bold text-white">{page}</span>
    </nav>
  )
}

export default function TopBar() {
  const navigate = useNavigate()
  const { queue, drafts, processing, processingLabel } = useAppData()
  const scheduled = queue?.length ?? 0
  const draftCount = drafts?.length ?? 0
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return SEARCH_TARGETS.filter((t) => t.keywords.includes(q) || t.label.toLowerCase().includes(q)).slice(
      0,
      6,
    )
  }, [query])

  const go = (path) => {
    setQuery('')
    setOpen(false)
    navigate(path)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (results[0]) go(results[0].path)
  }

  return (
    <header className="saas-topbar z-30 shrink-0">
      <div className="flex min-h-[3.5rem] items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Breadcrumb />

          <form
            onSubmit={onSubmit}
            className="saas-search relative hidden sm:flex"
            role="search"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          >
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              placeholder="Search pages, campaigns, meetings…"
              aria-label="Search workspace"
            />
            {open && results.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 overflow-hidden rounded-xl border border-white/10 bg-[#0c101a] py-1 shadow-2xl">
                {results.map((r) => (
                  <button
                    key={r.path + r.label}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r.path)}
                  >
                    <span className="truncate font-medium">{r.label}</span>
                    <span className="ml-auto truncate text-[10px] text-slate-600">{r.path}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {processing && (
            <span className="hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-400 lg:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
              {processingLabel || 'Processing'}
            </span>
          )}

          <div className="hidden items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 lg:flex">
            <span className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-400">
              <span className="text-indigo-300">{scheduled}</span> queued
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-400">
              <span className="text-amber-300">{draftCount}</span> drafts
            </span>
          </div>

          <Link
            to="/email?tab=mailbox"
            className="saas-icon-btn hidden sm:flex"
            aria-label="Open mailbox"
            title="Mailbox"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </Link>

          <NotificationPanel />

          <div className="saas-topbar__account">
            <OrganizationSwitcher
              appearance={clerkAppearance}
              hidePersonal={false}
              afterCreateOrganizationUrl="/overview"
              afterSelectOrganizationUrl="/overview"
              afterSelectPersonalUrl="/overview"
            />
            <UserButton appearance={clerkAppearance} afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </div>
    </header>
  )
}
