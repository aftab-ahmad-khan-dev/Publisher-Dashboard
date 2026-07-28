import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'
import { SOCIALS } from '../../data/links'
import { WHATSAPP_DISPLAY, whatsappSupportUrl } from '../../data/billing'
import { WhatsAppIcon } from './WhatsAppFab'
import { SOCIAL_ICONS } from './SocialIcons'

const FOOTER_COLS = [
  {
    title: 'Platforms',
    links: [
      ['LinkedIn scheduler', '/#platforms'],
      ['Facebook publishing', '/#platforms'],
      ['Instagram scheduler', '/#platforms'],
      ['Reddit auto-poster', '/#platforms'],
      ['Email campaigns', '/#platforms'],
    ],
  },
  {
    title: 'Product',
    links: [
      ['Features', '/#features'],
      ['Products', '/products'],
      ['Compare', '/#compare'],
      ['Reviews', '/#reviews'],
      ['FAQ', '/#faq'],
      ['Pricing', '/pricing'],
    ],
  },
  {
    title: 'Get started',
    links: [
      ['Create free account', '/sign-up'],
      ['Sign in', '/sign-in'],
      ['WhatsApp support', whatsappSupportUrl(), true],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
      ['Contact', '/contact'],
    ],
  },
]

export default function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.07] px-6 pb-10 pt-14">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo className="h-6 w-6" />
              <span className="font-display text-sm font-bold text-white">Publisher Suite</span>
            </Link>
            <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-slate-500">
              Publish once, reach everywhere. The all-in-one social media scheduler for LinkedIn, Meta, Reddit & email.
            </p>
            <a
              href={whatsappSupportUrl()}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <WhatsAppIcon size={14} /> WhatsApp {WHATSAPP_DISPLAY}
            </a>
            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIALS.map((s) => {
                const external = !s.href.startsWith('mailto:')
                const Icon = SOCIAL_ICONS[s.id]
                return (
                  <a
                    key={s.id}
                    href={s.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer' : undefined}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-400 transition hover:border-white/25 hover:text-slate-200"
                  >
                    {Icon ? <Icon size={11} /> : null}
                    <span>{s.label}</span>
                  </a>
                )
              })}
            </div>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((row) => {
                  const [label, href, external] = row
                  return (
                    <li key={label}>
                      {external ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-500 transition hover:text-slate-300"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link to={href} className="text-xs text-slate-500 transition hover:text-slate-300">
                          {label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-6 sm:flex-row">
          <p className="text-xs text-slate-600">© 2026 Publisher Suite. All rights reserved.</p>
          <p className="text-[10px] text-slate-700">Ratings, review counts and comparisons shown are illustrative.</p>
        </div>
      </div>
    </footer>
  )
}
