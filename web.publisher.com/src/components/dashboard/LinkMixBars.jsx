export default function LinkMixBars({ links = {} }) {
  const rows = [
    { label: 'Calendar', value: links.calendar || 0, pct: links.calendarPct || 0 },
    { label: 'Portfolio', value: links.portfolio || 0, pct: links.portfolioPct || 0 },
    { label: 'Other', value: links.other || 0, pct: links.otherPct || 0 },
  ]
  const max = Math.max(...rows.map((r) => r.value), 1)
  const empty = !links.total

  return (
    <section className="saas-content-card">
      <h3 className="saas-section-title">Click destinations</h3>
      <p className="saas-section-desc mb-4">Where leads go after open</p>
      {empty ? (
        <p className="py-8 text-center text-xs text-zinc-500">No tracked clicks yet.</p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-zinc-300">{row.label}</span>
                <span className="tabular-nums text-zinc-500">
                  {row.value.toLocaleString()} · {row.pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-zinc-300"
                  style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
