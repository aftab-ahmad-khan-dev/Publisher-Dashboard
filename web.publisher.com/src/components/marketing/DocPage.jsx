/** Shared shell for text/marketing pages: eyebrow + title + intro + body sections. */
export default function DocPage({ eyebrow, title, intro, sections = [], children }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-400">{eyebrow}</p>}
      <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h1>
      {intro && <p className="mt-5 text-base leading-relaxed text-slate-400">{intro}</p>}

      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <div key={s.h}>
            <h2 className="font-display text-lg font-bold text-white">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.p}</p>
          </div>
        ))}
        {children}
      </div>
    </section>
  )
}
