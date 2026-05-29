import { Link } from 'react-router-dom'

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'Everything you need to publish across your channels.',
    features: ['1 workspace', 'All 5 social platforms', 'Email campaigns', 'Scheduling & auto-publish', 'Per-platform previews'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    cadence: 'per month',
    blurb: 'For creators who publish at volume across every network.',
    features: ['Everything in Free', 'Bulk upload & calendar', 'Unlimited scheduled posts', 'Open tracking for email', 'Priority support'],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$49',
    cadence: 'per month',
    blurb: 'Multiple brands and teammates in isolated workspaces.',
    features: ['Everything in Pro', 'Unlimited workspaces', 'Team members & roles', 'Per-tenant data isolation', 'Dedicated support'],
    cta: 'Start free trial',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-400">Pricing</p>
        <h1 className="font-display mx-auto mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Simple pricing. Start free.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
          No credit card to begin. Upgrade when you need more volume, brands, or teammates.
        </p>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col rounded-3xl border p-8 ${
              t.highlight ? 'border-violet-500/40 bg-gradient-to-b from-violet-600/10 to-transparent' : 'border-white/[0.08] bg-white/[0.02]'
            }`}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                Most popular
              </span>
            )}
            <h2 className="font-display text-lg font-bold text-white">{t.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{t.blurb}</p>
            <div className="mt-5 flex items-end gap-1.5">
              <span className="font-display text-4xl font-extrabold text-white">{t.price}</span>
              <span className="pb-1 text-xs text-slate-500">/ {t.cadence}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/sign-up"
              className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 font-display text-sm font-bold transition ${
                t.highlight ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:opacity-90' : 'border border-white/15 text-white hover:bg-white/5'
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-[11px] text-slate-600">Prices shown are illustrative for this demo.</p>
    </section>
  )
}
