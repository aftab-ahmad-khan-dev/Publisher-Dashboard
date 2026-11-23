import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import { useAppData } from '../../contexts/AppDataContext'
import { useAuth } from '../../contexts/AuthContext'
import { NAV_ITEMS } from '../../lib/constants'
import { ADMIN_NAV_ITEM, getNavItems } from '../../lib/admin'
import { NavGlyph } from '../../lib/navIcons'
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

/** Primary labeled items in the header; overflow goes under More. */
const PRIMARY_PATHS = [
  '/overview',
  '/compose',
  '/bulk',
  '/email',
  '/sales',
  '/drafts',
  '/scheduled',
  '/calendar',
]

const SHORT_LABEL = {
  '/email': 'Mail',
  '/bulk': 'Bulk',
  '/api-config': 'Integrations',
}

function PageLabel() {
  const { pathname } = useLocation()
  const allItems = [...NAV_ITEMS, ADMIN_NAV_ITEM]
  const match = allItems.find((n) => pathname.startsWith(n.path))
  return match?.label ?? 'Dashboard'
}

function HeaderNavItem({ path, label, icon, locked, count }) {
  const display = SHORT_LABEL[path] || label
  return (
    <NavLink
      to={path}
      title={locked ? `${label} (Pro)` : label}
      className={({ isActive }) =>
        `orbit-hnav__link ${isActive ? 'orbit-hnav__link--active' : ''} ${locked ? 'is-locked' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`orbit-hnav__icon ${isActive ? 'orbit-hnav__icon--active' : ''}`}>
            <NavGlyph name={icon} onDark={isActive} className="h-4 w-4" />
            {count > 0 && (icon === 'drafts' || icon === 'scheduled') ? (
              <span className="orbit-hnav__badge">{count > 9 ? '9+' : count}</span>
            ) : null}
          </span>
          <span className="orbit-hnav__label">{display}</span>
        </>
      )}
    </NavLink>
  )
}

function MoreMenu({ items, moreActive }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  if (!items.length) return null

  return (
    <div className="orbit-hnav__more" ref={wrapRef}>
      <button
        type="button"
        className={`orbit-hnav__more-btn ${open || moreActive ? 'is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="orbit-hnav__label">More</span>
        <svg
          className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div className="orbit-hnav__menu" role="menu">
          {items.map((item) => {
            const active = pathname.startsWith(item.path)
            return (
              <button
                key={item.path}
                type="button"
                role="menuitem"
                className={`orbit-hnav__menu-item ${active ? 'is-active' : ''} ${item.locked ? 'is-locked' : ''}`}
                onClick={() => {
                  setOpen(false)
                  navigate(item.path)
                }}
              >
                <NavGlyph name={item.icon} className="h-4 w-4" />
                <span>{item.label}</span>
                {item.locked ? <span className="orbit-hnav__pro">Pro</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default function TopBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { user: clerkUser } = useUser()
  const { queue, drafts, processing, processingLabel, subscription } = useAppData()
  const scheduled = queue?.length ?? 0
  const draftCount = drafts?.length ?? 0
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const page = PageLabel()
  const avatarUrl = clerkUser?.imageUrl || user?.imageUrl || ''
  const avatarName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    user?.name ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    'Account'
  const avatarInitial = (avatarName || 'U').trim().charAt(0).toUpperCase() || 'U'

  const navItems = useMemo(
    () => getNavItems(user?.email, subscription),
    [user?.email, subscription],
  )

  const primary = navItems.filter((n) => PRIMARY_PATHS.includes(n.path))
  const more = navItems.filter((n) => !PRIMARY_PATHS.includes(n.path))
  const moreActive = more.some((n) => pathname.startsWith(n.path))

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

  const countFor = (icon) => {
    if (icon === 'drafts') return draftCount
    if (icon === 'scheduled') return scheduled
    return 0
  }

  return (
    <header className="orbit-topbar z-30 shrink-0">
      <div className="orbit-topbar__inner orbit-topbar__inner--nav">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link to="/overview" className="flex shrink-0 items-center gap-2" title="Overview">
            <BrandLogo className="h-8 w-8 shrink-0" />
            <span className="hidden font-[family-name:var(--font-display)] text-[15px] font-bold tracking-tight text-[#2D0000] sm:inline">
              Publisher Suite
            </span>
          </Link>

          <nav className="orbit-hnav hidden min-w-0 lg:flex" aria-label="Main navigation">
            {primary.map((item) => (
              <HeaderNavItem
                key={item.path}
                path={item.path}
                label={item.label}
                icon={item.icon}
                locked={item.locked}
                count={countFor(item.icon)}
              />
            ))}
            <MoreMenu items={more} moreActive={moreActive} />
          </nav>

          <p className="truncate text-[13px] font-bold tracking-tight text-[#2D0000] lg:hidden">
            {page}
          </p>
        </div>

        <div className="orbit-topbar__actions">
          <form
            onSubmit={onSubmit}
            className="orbit-search relative flex min-w-0"
            role="search"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          >
            <svg
              className="orbit-search__icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
            <input
              id="orbit-workspace-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              placeholder=" "
              aria-label="Search here"
            />
            <span className="orbit-search__copy">Search here</span>
            <kbd className="orbit-search__kbd hidden xl:inline">⌘K</kbd>
            {open && results.length > 0 ? (
              <div className="orbit-search__menu">
                {results.map((r) => (
                  <button
                    key={r.path + r.label}
                    type="button"
                    className="orbit-search__item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(r.path)}
                  >
                    <span className="truncate font-semibold text-[#2D0000]">{r.label}</span>
                    <span className="ml-auto truncate text-[10px] font-medium text-[#5a6258]">{r.path}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </form>

          {processing ? (
            <span className="orbit-chip orbit-chip--pulse hidden xl:inline-flex" title={processingLabel}>
              <span className="orbit-live-pill__dot" />
              {processingLabel || 'Processing'}
            </span>
          ) : null}

          <div className="orbit-topbar__icons">
            <NotificationPanel />
          </div>

          <span className="orbit-topbar__divider" aria-hidden />

          <div className="orbit-topbar__account" title={avatarName}>
            {avatarUrl ? (
              <img
                key={avatarUrl}
                src={avatarUrl}
                alt=""
                className="orbit-topbar__avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="orbit-topbar__avatar-fallback" aria-hidden>
                {avatarInitial}
              </span>
            )}
            <UserButton
              appearance={clerkAppearance}
              afterSignOutUrl="/sign-in"
              aria-label={avatarName}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
