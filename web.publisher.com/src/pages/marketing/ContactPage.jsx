import { useState } from 'react'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const onSubmit = (e) => {
    e.preventDefault()
    // Demo: open the user's mail client with a prefilled message
    const subject = encodeURIComponent(`Publisher Suite enquiry from ${form.name || 'a visitor'}`)
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`)
    window.location.href = `mailto:hello@publisher.com?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-400">Contact</p>
      <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Get in touch</h1>
      <p className="mt-4 text-base text-slate-400">
        Questions, feedback, or partnership ideas? Send us a message and we’ll get back to you.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
            placeholder="How can we help?"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-7 py-3 font-display text-sm font-bold text-white transition hover:opacity-90"
        >
          Send message
        </button>
        {sent && <p className="text-sm text-emerald-400">Opening your email client… or reach us at hello@publisher.com</p>}
      </form>
    </section>
  )
}
