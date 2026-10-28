import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

function PageLabel() {
  const { pathname } = useLocation()
  const allItems = [...NAV_ITEMS, ADMIN_NAV_ITEM]
  const match = allItems.find((n) => pathname.startsWith(n.path))
  return match?.label ?? 'Dashboard'
}

export default function TopBar() {
  const navigate = useNavigate()
  const { queue, drafts, processing, processingLabel } = useAppData()
  const scheduled = queue?.length ?? 0
  const draftCount = drafts?.length ?? 0
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const page = PageLabel()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return SEARCH_TARGETS.filter(
      (t) => t.keywords.includes(q) || t.label.toLowerCase().includes(q),
    ).slice(0, 6)
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
      <div className="flex min-h-[3.5rem] items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <BrandLogo className="h-6 w-6 shrink-0 rounded" />
            <span className="truncate text-sm font-semibold text-zinc-100">{page}</span>
          </div>

          <form
            onSubmit={onSubmit}
            className="saas-search relative hidden sm:flex"
            role="search"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          >
            <svg
              className="h-3.5 w-3.5 shrink-0 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              placeholder="Search…"
              aria-label="Search workspace"
            />
            {open && results.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 overflow-hidden rounded-md border border-white/10 bg-[#111113] py-1 shadow-2xl">
                {results.map((r) => (
                  <button
                    key={r.path + r.label}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r.path)}
                  >
                    <span className="truncate font-medium">{r.label}</span>
                    <span className="ml-auto truncate text-[10px] text-zinc-600">{r.path}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {processing && (
            <span className="hidden items-center gap-1.5 text-[11px] font-medium text-zinc-500 lg:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              {processingLabel || 'Processing'}
            </span>
          )}

          <div className="hidden items-center gap-2 text-[11px] text-zinc-500 lg:flex">
            <span>
              <span className="font-medium text-zinc-300">{scheduled}</span> queued
            </span>
            <span className="text-zinc-700">·</span>
            <span>
              <span className="font-medium text-zinc-300">{draftCount}</span> drafts
            </span>
          </div>

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
