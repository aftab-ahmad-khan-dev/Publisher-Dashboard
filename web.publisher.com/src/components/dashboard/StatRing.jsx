export default function StatRing({
  value,
  max = 100,
  label,
  sublabel,
  tone = 'zinc',
  size = 72,
}) {
  const pct = max > 0 ? Math.min(100, Math.round((Number(value) / max) * 100)) : 0
  const stroke = tone === 'sky' ? '#7dd3fc' : tone === 'emerald' ? '#34d399' : '#d4d4d8'
  const r = 28
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold tabular-nums text-white">{value}</span>
          <span className="text-[9px] font-medium text-zinc-500">{pct}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-200">{label}</p>
        {sublabel ? <p className="mt-0.5 text-[11px] text-zinc-500">{sublabel}</p> : null}
      </div>
    </div>
  )
}
