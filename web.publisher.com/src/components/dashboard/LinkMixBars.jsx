export default function LinkMixBars({ links = {} }) {
  const rows = [
    { label: 'Calendar', value: links.calendar || 0, pct: links.calendarPct || 0 },
    { label: 'Portfolio', value: links.portfolio || 0, pct: links.portfolioPct || 0 },
    { label: 'Other', value: links.other || 0, pct: links.otherPct || 0 },
  ]
  const max = Math.max(...rows.map((r) => r.value), 1)
  const empty = !links.total

  return (
    <section className="orbit-panel h-full">
      <h3 className="orbit-panel__title">Click destinations</h3>
      <p className="orbit-panel__desc mb-4">Where leads go after they open</p>
      {empty ? (
        <p className="py-8 text-center text-xs text-[#5a6258]">No tracked clicks yet.</p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#2D0000]">{row.label}</span>
                <span className="tabular-nums text-[#5a6258]">
                  {row.value.toLocaleString()} · {row.pct}%
                </span>
              </div>
              <div className="orbit-platform-track">
                <div
                  className="orbit-platform-fill"
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
