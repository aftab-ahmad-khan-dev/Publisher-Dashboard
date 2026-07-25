const PORTFOLIO = 'https://www.aftabahmadkhan.online'
const PORTFOLIO_PROJECTS = `${PORTFOLIO}/projects`

const PRODUCTS = [
  {
    id: 'vorkspro',
    name: 'VorksPro',
    tagline: 'All-in-one operations platform — projects, CRM, HR, payroll & invoicing.',
    description:
      'Unify project management, client CRM, employees, payroll, PDF invoicing, attendance, leave, follow-ups, to-dos, knowledge base, and a credentials vault in one role-based workspace.',
    tags: ['SaaS', 'Business Ops', 'CRM', 'HR'],
    image: '/products/vorkspro.png',
    imageAlt: 'VorksPro operations platform preview',
    liveUrl: 'https://vorkspro.com',
    detailsUrl: PORTFOLIO_PROJECTS,
    featured: true,
  },
  {
    id: 'encoded-by-aftab',
    name: 'Encoded by Aftab',
    tagline: 'Code Crafters — frontend challenges with solutions.',
    description:
      'Practice HTML, CSS, and JavaScript through guided challenges — conference tickets, password generators, multi-step forms, and more — with live previews and progressive difficulty.',
    tags: ['Learning', 'Frontend', 'Challenges'],
    image: '/products/code-crafters.jpg',
    imageAlt: 'Code Crafters challenge preview',
    liveUrl: 'https://code-crafters.vercel.app/',
    detailsUrl: PORTFOLIO_PROJECTS,
  },
  {
    id: 'pet-corner',
    name: 'Pet Corner',
    tagline: 'Veterinary & pet care management for modern clinics.',
    description:
      'Streamline pet records, appointments, clinic and wholesale inventory, invoices, receipts, clinic finance, and staff access in one veterinary workflow.',
    tags: ['SaaS', 'Veterinary', 'Clinic'],
    image: '/products/pet-corner.jpg',
    imageAlt: 'Pet Corner clinic dashboard preview',
    liveUrl: 'https://pet-corner-omega.vercel.app/',
    detailsUrl: PORTFOLIO_PROJECTS,
  },
  {
    id: 'npm-dashboard',
    name: 'npm Packages Dashboard',
    tagline: 'Live overview of your published npm & pub.dev packages.',
    description:
      'Discover packages under your username, aggregate downloads via serverless workers, and track metadata and updates across npm and Flutter/Dart pub.dev packages.',
    tags: ['Open Source', 'Developer Tools', 'npm'],
    image: '/products/npm-dashboard.png',
    imageAlt: 'npm Packages Dashboard preview',
    liveUrl: 'https://npm-dashboard-eta.vercel.app/',
    githubUrl: 'https://github.com/aftab-ahmad-khan-dev/NPM_Dashboard',
    detailsUrl: PORTFOLIO_PROJECTS,
  },
  {
    id: 'about-me',
    name: 'About Me',
    tagline: 'Solo full-stack developer — MERN, Shopify & AI.',
    description:
      'Portfolio of 97+ production projects across web, mobile, desktop, Shopify, and AI automation. Hire directly for scoped product builds and end-to-end delivery.',
    tags: ['Portfolio', 'Freelance', 'Full-stack'],
    image: '/products/portfolio.png',
    imageAlt: 'Aftab Ahmad Khan portfolio preview',
    liveUrl: PORTFOLIO,
    detailsUrl: PORTFOLIO,
    primaryLabel: 'Visit portfolio',
  },
  {
    id: 'discord-generator',
    name: 'Discord Server Generator',
    tagline: 'Config-driven Discord.js v14 bot that builds a full server in one command.',
    description:
      'Admin-only /setup creates roles, categories, channels, and permissions from config — plus welcome, verify, tickets, suggestions, reaction roles, logs, and live member counters.',
    tags: ['Open Source', 'Discord', 'Bot'],
    image: '/products/discord-generator.png',
    imageAlt: 'Discord Server Generator repository preview',
    githubUrl: 'https://github.com/aftab-ahmad-khan-dev/discord-generator',
    detailsUrl: PORTFOLIO_PROJECTS,
  },
  {
    id: 'ai-guardrails',
    name: 'AI Dev Guardrails',
    tagline: 'Reusable AI coding rules & skills for Cursor, Claude, Copilot & more.',
    description:
      'Installable Agent Skills pack with SRS task board, Rules.md standards, and ~25 lifecycle skills from spec through TDD, review, and ship. One command: npx skills add aftab-ahmad-khan-dev/ai-dev-guardrails.',
    tags: ['Open Source', 'AI', 'Cursor Skills'],
    image: '/products/ai-guardrails.jpg',
    imageAlt: 'AI Dev Guardrails skills banner',
    githubUrl: 'https://github.com/aftab-ahmad-khan-dev/ai-dev-guardrails',
    detailsUrl: PORTFOLIO_PROJECTS,
  },
  {
    id: 'api-boilerplate',
    name: 'API Boilerplates',
    tagline: 'Server-side starters — Rust, Nest + Fastify, Express + Redis.',
    description:
      'Three aligned API implementations of the same surface: Express (reference), NestJS with Fastify adapter, and Rust (Axum + MongoDB). Shared routes for auth, email, payments, files, and more.',
    tags: ['Open Source', 'Boilerplate', 'Backend'],
    image: '/products/api-boilerplate.png',
    imageAlt: 'API Boilerplate monorepo preview',
    githubUrl: 'https://github.com/aftab-ahmad-khan-dev/api.boilerplate.com',
    detailsUrl: PORTFOLIO_PROJECTS,
  },
]

function ExternalIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5M15 3h6m0 0v6m0-6L10.5 13.5" />
    </svg>
  )
}

function ProductCard({ product }) {
  const primaryHref = product.liveUrl || product.githubUrl
  const primaryLabel = product.primaryLabel || (product.liveUrl ? 'Open live' : 'View on GitHub')
  const showGithubSecondary = Boolean(product.githubUrl && product.liveUrl)
  const showDetails = product.detailsUrl && product.detailsUrl !== product.liveUrl

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border transition duration-300 hover:-translate-y-1 ${
        product.featured
          ? 'border-indigo-500/40 bg-gradient-to-b from-indigo-600/10 to-transparent hover:border-indigo-400/50'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-indigo-500/30'
      }`}
    >
      <a
        href={primaryHref}
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05060a]/80 via-transparent to-transparent" />
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Featured
          </span>
        )}
      </a>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex flex-wrap gap-1.5">
          {product.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-semibold text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <h2 className="font-display mt-3 text-xl font-bold tracking-tight text-white">{product.name}</h2>
        <p className="mt-1.5 text-sm font-medium text-slate-300">{product.tagline}</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{product.description}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {primaryHref && (
            <a
              href={primaryHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 font-display text-xs font-bold text-white transition hover:opacity-90"
            >
              {primaryLabel}
              <ExternalIcon />
            </a>
          )}
          {showGithubSecondary && (
            <a
              href={product.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/5"
            >
              GitHub
              <ExternalIcon />
            </a>
          )}
          {showDetails && (
            <a
              href={product.detailsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              More details
              <ExternalIcon />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function ProductsPage() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-600/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-400">Products</p>
          <h1 className="font-display mx-auto mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Built products, open source & portfolio work.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
            SaaS platforms, developer tools, and side projects from the same builder behind Publisher
            Suite. Open a live demo, browse the repo, or jump to the portfolio for deeper case notes.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-400">
                Want the full story?
              </p>
              <h2 className="font-display mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                Case studies live on the portfolio.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Problem, solution, stack, and outcomes for these builds — plus 97+ other shipped
                projects — are on aftabahmadkhan.online.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <a
                href={PORTFOLIO_PROJECTS}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 font-display text-sm font-bold text-white hover:opacity-90"
              >
                Browse projects
                <ExternalIcon className="h-4 w-4" />
              </a>
              <a
                href={PORTFOLIO}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                About Aftab
                <ExternalIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
