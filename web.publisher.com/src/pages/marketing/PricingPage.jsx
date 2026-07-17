import { Link } from 'react-router-dom'

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$19.99',
    cadence: 'per month',
    blurb: 'Publish once and bulk-schedule across your social channels.',
    features: [
      'Compose for LinkedIn, Meta, Reddit & more',
      'Bulk upload & multi-day schedule',
      'Image-ready posts',
      'Bank-transfer activation',
    ],
    cta: 'Get Starter',
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$39.99',
    cadence: 'per month',
    blurb: 'Add Mail Box outreach, leads, and meeting CTAs on top of publishing.',
    features: [
      'Everything in Starter',
      'Mail Box campaigns & templates',
      'Lead import (Excel / Sheets)',
      'Open, click & meeting tracking',
      'Google Calendar booking CTAs',
    ],
    cta: 'Get Growth',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49.99',
    cadence: 'per month',
    blurb: 'Full Publisher Suite — drafts, calendar, integrations, and priority support.',
    features: [
      'Everything in Growth',
      'Drafts & Scheduled queue',
      'Content Calendar',
      'Integrations hub & Setup Guide',
      'Priority activation support',
    ],
    cta: 'Get Pro',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-400">Pricing</p>
        <h1 className="font-display mx-auto mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Plans that scale with how you ship.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
          Starter $19.99 · Growth $39.99 · Pro $49.99. Pay by JazzCash, UBL, NayaPay, or Meezan —
          upload your receipt and we activate your plan.
        </p>
      </div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col rounded-3xl border p-8 ${
              t.highlight
                ? 'border-indigo-500/40 bg-gradient-to-b from-indigo-600/10 to-transparent'
                : 'border-white/[0.08] bg-white/[0.02]'
            }`}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
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
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to={`/sign-up?plan=${t.id}`}
              className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 font-display text-sm font-bold transition ${
                t.highlight
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:opacity-90'
                  : 'border border-white/15 text-white hover:bg-white/5'
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-300/90">
              Beyond SaaS plans
            </p>
            <h2 className="font-display mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              Custom · Enterprise · CRM · SaaS builds
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Need a tailored product, internal CRM, multi-tenant SaaS, or enterprise delivery —
              not just Publisher Suite seats? We design and ship custom software: web platforms,
              mobile apps, desktop tools, AI workflows, and operator CRMs scoped to your niche.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-300">
              {[
                'Custom solutions',
                'Enterprise delivery',
                'CRM & admin panels',
                'SaaS / multi-tenant',
                'Web · Mobile · Desktop · AI',
              ].map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-3 font-display text-sm font-bold text-white hover:opacity-90"
            >
              Talk enterprise / custom
            </Link>
            <a
              href="https://aftabahmadkhan.online"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              View portfolio
            </a>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] text-slate-600">
        Manual bank transfer · no card required · plans activate after receipt review
      </p>
    </section>
  )
}
