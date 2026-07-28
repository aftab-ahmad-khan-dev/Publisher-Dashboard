import { useMemo, useState } from 'react'

const PORTFOLIO = 'https://www.aftabahmadkhan.online'
const PORTFOLIO_PROJECTS = `${PORTFOLIO}/projects`

/** @typedef {'products' | 'open-source' | 'about'} ProductCategory */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'products', label: 'Products' },
  { id: 'open-source', label: 'Open source' },
  { id: 'about', label: 'About' },
]

const PRODUCTS = [
  {
    id: 'publisher-suite',
    name: 'Publisher Suite',
    blurb: 'Compose once and auto-publish to LinkedIn, Meta, Reddit, Pinterest & Threads.',
    category: /** @type {ProductCategory} */ ('products'),
    badge: 'Current',
    image: '/products/publisher-suite-dashboard.jpg',
    imageAlt: 'Publisher Suite social publishing dashboard',
    href: '/',
    cta: 'Open live',
    featured: true,
  },
  {
    id: 'frameo',
    name: 'Frameo',
    blurb: 'Offline Loom-style screen recorder for macOS & Windows — WhatsApp LICENSE upgrades.',
    category: /** @type {ProductCategory} */ ('products'),
    badge: 'Live',
    image: '/products/frameo-dashboard.jpg',
    imageAlt: 'Frameo home dashboard',
    href: 'https://frameo-blond.vercel.app/',
    cta: 'Open live',
    featured: true,
  },
  {
    id: 'vorkspro',
    name: 'VorksPro',
    blurb: 'Projects, CRM, HR, payroll & invoicing in one workspace.',
    category: /** @type {ProductCategory} */ ('products'),
    badge: 'SaaS',
    image: '/products/vorkspro-dashboard.jpg',
    imageAlt: 'VorksPro operations platform',
    href: 'https://vorkspro.com',
    cta: 'Open live',
    featured: true,
  },
  {
    id: 'wareflow',
    name: 'Wareflow',
    blurb: 'Inventory, contacts, invoices & operations — barcode/QR scan at checkout.',
    category: /** @type {ProductCategory} */ ('products'),
    badge: 'Live',
    image: '/products/wareflow-dashboard.jpg',
    imageAlt: 'Wareflow inventory and operations platform',
    href: 'https://ware-flow-web.vercel.app/',
    cta: 'Open live',
    featured: true,
  },
  {
    id: 'coded-by-aftab',
    name: '30 Days of JavaScript',
    blurb: 'Interactive JS lessons with live console, timeline, and tips — coded by aftab.',
    category: /** @type {ProductCategory} */ ('products'),
    badge: 'Learning',
    image: '/products/coded-by-aftab.jpg',
    imageAlt: '30 Days of JavaScript lesson console',
    href: 'https://coded-by-aftab.vercel.app/',
    cta: 'Open live',
  },
  {
    id: 'encoded-by-aftab',
    name: 'Encoded by Aftab',
    blurb: 'Frontend coding challenges with live previews & solutions.',
    category: /** @type {ProductCategory} */ ('products'),
    badge: 'Learning',
    image: '/products/code-crafters-dashboard.jpg',
    imageAlt: 'Code Crafters challenges',
    href: 'https://code-crafters.vercel.app/',
    cta: 'Open live',
  },
  {
    id: 'pet-corner',
    name: 'Pet Corner',
    blurb: 'Clinic workflows — patients, appointments, inventory & billing.',
    category: /** @type {ProductCategory} */ ('products'),
    badge: 'Clinic',
    image: '/products/pet-corner.jpg',
    imageAlt: 'Pet Corner veterinary platform',
    href: 'https://pet-corner-omega.vercel.app/',
    cta: 'Open live',
  },
  {
    id: 'npm-dashboard',
    name: 'npm Packages Dashboard',
    blurb: 'Track downloads & metadata for your npm and pub.dev packages.',
    category: /** @type {ProductCategory} */ ('open-source'),
    badge: 'Open source',
    image: '/products/npm-dashboard.jpg',
    imageAlt: 'npm Packages Dashboard',
    href: 'https://npm-dashboard-eta.vercel.app/',
    cta: 'Open live',
  },
  {
    id: 'pubdev',
    name: 'pub.dev packages',
    blurb: 'Flutter / Dart packages — app flow, localization, and tooling on pub.dev.',
    category: /** @type {ProductCategory} */ ('open-source'),
    badge: 'Open source',
    image: '/products/pubdev-packages.jpg',
    imageAlt: 'pub.dev packages',
    href: 'https://pub.dev/packages?q=app_flow_orchestrator+auto_localization_kit',
    cta: 'Open pub.dev',
  },
  {
    id: 'discord-generator',
    name: 'Discord Server Generator',
    blurb: 'One /setup command builds roles, channels, tickets & more.',
    category: /** @type {ProductCategory} */ ('open-source'),
    badge: 'Open source',
    image: '/products/discord-generator.png',
    imageAlt: 'Discord Server Generator',
    href: 'https://github.com/aftab-ahmad-khan-dev/discord-generator',
    cta: 'View on GitHub',
  },
  {
    id: 'ai-guardrails',
    name: 'AI Dev Guardrails',
    blurb: 'Installable skills & rules for Cursor, Claude, Copilot & more.',
    category: /** @type {ProductCategory} */ ('open-source'),
    badge: 'Open source',
    image: '/products/ai-guardrails.jpg',
    imageAlt: 'AI Dev Guardrails',
    href: 'https://github.com/aftab-ahmad-khan-dev/ai-dev-guardrails',
    cta: 'View on GitHub',
  },
  {
    id: 'api-boilerplate',
    name: 'API Boilerplates',
    blurb: 'Rust · Nest + Fastify · Express + Redis — same API surface.',
    category: /** @type {ProductCategory} */ ('open-source'),
    badge: 'Open source',
    image: '/products/api-boilerplate.png',
    imageAlt: 'API Boilerplate monorepo',
    href: 'https://github.com/aftab-ahmad-khan-dev/api.boilerplate.com',
    cta: 'View on GitHub',
  },
  {
    id: 'about-me',
    name: 'About Me',
    blurb: 'Solo full-stack engineer — 97+ shipped projects & case studies.',
    category: /** @type {ProductCategory} */ ('about'),
    badge: 'Portfolio',
    image: '/products/portfolio.png',
    imageAlt: 'Aftab Ahmad Khan portfolio',
    href: PORTFOLIO,
    cta: 'Visit portfolio',
  },
]

function ExternalIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5M15 3h6m0 0v6m0-6L10.5 13.5"
      />
    </svg>
  )
}

function FeaturedCard({ product }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-indigo-500/35 bg-gradient-to-br from-indigo-600/[0.12] via-transparent to-sky-500/[0.06]">
      <div className="grid lg:grid-cols-2">
        <a
          href={product.href}
          target="_blank"
          rel="noreferrer"
          className="relative block min-h-[220px] overflow-hidden bg-[#0b0d16] lg:min-h-[320px]"
        >
          <img
            src={product.image}
            alt={product.imageAlt}
            className="h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#05060a]/40 max-lg:bg-gradient-to-t max-lg:from-[#05060a]/70 max-lg:to-transparent" />
        </a>

        <div className="flex flex-col justify-center p-7 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Featured
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-400">
              {product.badge}
            </span>
          </div>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {product.name}
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-slate-400">{product.blurb}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={product.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 font-display text-sm font-bold text-white transition hover:opacity-90"
            >
              {product.cta}
              <ExternalIcon className="h-4 w-4" />
            </a>
            <a
              href={PORTFOLIO_PROJECTS}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
            >
              More details
              <ExternalIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}

function ProductCard({ product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition duration-300 hover:-translate-y-0.5 hover:border-indigo-500/30">
      <a
        href={product.href}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-[16/10] overflow-hidden bg-[#0b0d16]"
      >
        <img
          src={product.image}
          alt={product.imageAlt}
          loading="lazy"
          className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#05060a]/75 px-2.5 py-1 text-[10px] font-semibold text-slate-200 backdrop-blur-sm">
          {product.badge}
        </span>
      </a>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold tracking-tight text-white">{product.name}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">{product.blurb}</p>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <a
            href={product.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-sky-400 transition hover:text-sky-300"
          >
            {product.cta}
            <ExternalIcon />
          </a>
          {product.category !== 'about' && (
            <a
              href={PORTFOLIO_PROJECTS}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-300"
            >
              More details
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function ProductsPage() {
  const [filter, setFilter] = useState('all')

  const { featured, rest } = useMemo(() => {
    const filtered =
      filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter)

    const featuredItem = filter === 'all' || filter === 'products' ? filtered.find((p) => p.featured) : null
    const restItems = featuredItem ? filtered.filter((p) => p.id !== featuredItem.id) : filtered

    return { featured: featuredItem, rest: restItems }
  }, [filter])

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-28 top-8 h-64 w-64 rounded-full bg-sky-600/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 top-36 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <header className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-400">Products</p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Pick a product. Open it. Dig deeper on the portfolio.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Live apps, open-source tools, and portfolio work — each card has one clear next step.
            Case studies live on aftabahmadkhan.online.
          </p>
        </header>

        <div
          className="mt-8 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter products"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-[#05060a]'
                    : 'border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="mt-10 space-y-8">
          {featured && <FeaturedCard product={featured} />}

          {rest.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {rest.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <aside className="mt-14 flex flex-col items-start justify-between gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-6 sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="font-display text-lg font-bold text-white">Need the full case study?</p>
            <p className="mt-1 text-sm text-slate-400">
              Stack, problem, and outcomes for these builds — plus 97+ more projects.
            </p>
          </div>
          <a
            href={PORTFOLIO_PROJECTS}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 font-display text-sm font-bold text-white hover:opacity-90"
          >
            Browse portfolio
            <ExternalIcon className="h-4 w-4" />
          </a>
        </aside>
      </div>
    </section>
  )
}
