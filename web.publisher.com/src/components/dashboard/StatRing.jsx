export default function StatRing({
  value,
  max = 100,
  label,
  sublabel,
  tone = 'indigo',
  size = 88,
}) {
  const pct = max > 0 ? Math.min(100, Math.round((Number(value) / max) * 100)) : 0
  const stroke =
    tone === 'sky' ? '#38bdf8' : tone === 'emerald' ? '#34d399' : '#818cf8'
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="7"
          />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-sm font-bold tabular-nums text-white">{value}</span>
          <span className="text-[9px] font-semibold text-slate-500">{pct}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-200">{label}</p>
        {sublabel ? <p className="mt-0.5 text-[10px] text-slate-500">{sublabel}</p> : null}
      </div>
    </div>
  )
}
