import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BANK_ACCOUNTS,
  WHATSAPP_DISPLAY,
  whatsappUrlForPlan,
} from '../../data/billing'

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
    cta: 'WhatsApp Starter',
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
    cta: 'WhatsApp Growth',
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
    cta: 'WhatsApp Pro',
    highlight: false,
  },
]

function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function PricingPage() {
  const [copied, setCopied] = useState('')

  function copyText(id, value) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(id)
      window.setTimeout(() => setCopied(''), 1600)
    })
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-400">Pricing</p>
        <h1 className="font-display mx-auto mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Plans that scale with how you ship.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
          Starter $19.99 · Growth $39.99 · Pro $49.99. Pay by JazzCash, UBL, NayaPay, or Meezan —
          send your receipt on WhatsApp {WHATSAPP_DISPLAY} and we activate your plan.
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
            <a
              href={whatsappUrlForPlan(t.name)}
              target="_blank"
              rel="noreferrer"
              className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-sm font-bold transition ${
                t.highlight
                  ? 'bg-[#25D366] text-white hover:brightness-105'
                  : 'border border-white/15 text-white hover:bg-white/5'
              }`}
            >
              <WhatsAppIcon /> {t.cta}
            </a>
            <Link
              to={`/sign-up?plan=${t.id}`}
              className="mt-3 text-center text-xs font-medium text-slate-500 hover:text-slate-300"
            >
              Or create an account first
            </Link>
          </div>
        ))}
      </div>

      <div id="pay" className="mt-16">
        <div className="text-center">
          <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            Pay by bank transfer
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            Transfer, then send your receipt on WhatsApp {WHATSAPP_DISPLAY}. We activate your plan —
            no card required.
          </p>
          <a
            href={whatsappUrlForPlan('Growth')}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(37,211,102,0.35)] transition hover:brightness-105"
          >
            <WhatsAppIcon /> WhatsApp {WHATSAPP_DISPLAY}
          </a>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">
          {BANK_ACCOUNTS.map((acct) => (
            <div
              key={acct.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <p className="text-sm font-semibold text-white">{acct.label}</p>
              <p className="mt-1 text-xs text-slate-500">Name: {acct.name}</p>
              <p className="text-xs text-slate-500">
                {acct.iban ? 'Account' : 'Number'}: {acct.number}
              </p>
              {acct.iban && (
                <p className="break-all text-[11px] text-slate-500">IBAN: {acct.iban}</p>
              )}
              {acct.branch && (
                <p className="text-[11px] text-slate-500">Branch: {acct.branch}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyText(acct.id, acct.number)}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/5"
                >
                  {copied === acct.id ? 'Copied' : 'Copy number'}
                </button>
                {acct.iban && (
                  <button
                    type="button"
                    onClick={() => copyText(`${acct.id}-iban`, acct.iban)}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/5"
                  >
                    {copied === `${acct.id}-iban` ? 'Copied' : 'Copy IBAN'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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
              not just Publisher Suite seats? We design and ship custom software scoped to your niche.
            </p>
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
        Manual bank transfer · no card required · plans activate after WhatsApp receipt review
      </p>
    </section>
  )
}
