import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from '../BrandLogo'

const NAV_LINKS = [
  ['Features', '/#features'],
  ['Platforms', '/#platforms'],
  ['Products', '/products'],
  ['Pricing', '/pricing'],
  ['Reviews', '/#reviews'],
  ['FAQ', '/#faq'],
]

function linkActive(pathname, href) {
  if (href.startsWith('/#')) return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function MarketingNav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#05060a]/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <BrandLogo className="h-8 w-8 shrink-0" />
          <span className="font-display whitespace-nowrap text-base font-bold text-white sm:text-lg">Publisher Suite</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 xl:gap-7 lg:flex">
          {NAV_LINKS.map(([label, href]) => {
            const active = linkActive(pathname, href) && !href.startsWith('/#')
            return (
              <Link
                key={label}
                to={href}
                className={`text-sm font-medium transition ${
                  active ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link to="/sign-in" className="hidden text-sm font-medium text-slate-300 hover:text-white sm:block">
            Sign in
          </Link>
          <Link
            to="/sign-up"
            className="whitespace-nowrap rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-3.5 py-2 text-sm font-bold text-white transition hover:opacity-90 sm:px-5"
          >
            <span className="sm:hidden">Start free</span>
            <span className="hidden sm:inline">Get started free</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-300 ring-1 ring-white/10 lg:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeWidth={2} d={open ? 'M6 18 18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/[0.07] px-5 py-3 lg:hidden">
          {NAV_LINKS.map(([label, href]) => {
            const active = linkActive(pathname, href) && !href.startsWith('/#')
            return (
              <Link
                key={label}
                to={href}
                onClick={() => setOpen(false)}
                className={`block py-2 text-sm font-medium ${
                  active ? 'text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
