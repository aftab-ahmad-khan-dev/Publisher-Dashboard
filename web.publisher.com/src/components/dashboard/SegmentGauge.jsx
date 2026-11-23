import { useEffect, useRef, useState } from 'react'

/**
 * Segmented semi-circle gauge — maroon → sage palette, animated realtime.
 */
export default function SegmentGauge({
  value = 0,
  max = 100,
  label = 'Score',
  sublabel = '',
  title = 'Engagement',
  description = '',
  badge = 'Live',
  live = true,
}) {
  const target = Math.min(max, Math.max(0, Number(value) || 0))
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = displayRef.current
    const to = target
    if (from === to) return undefined
    const start = performance.now()
    const duration = 700
    cancelAnimationFrame(rafRef.current)

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      const next = from + (to - from) * eased
      displayRef.current = next
      setDisplay(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        displayRef.current = to
        setDisplay(to)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  const pct = max > 0 ? Math.min(1, Math.max(0, display / max)) : 0
  const segments = 16
  const lit = Math.round(pct * segments)
  const r = 78
  const gapDeg = 2.4
  const span = 180 / segments
  const shown = Math.round(display)

  const arcs = Array.from({ length: segments }, (_, i) => {
    const start = -180 + i * span + gapDeg / 2
    const end = -180 + (i + 1) * span - gapDeg / 2
    const x1 = 100 + Math.cos((start * Math.PI) / 180) * r
    const y1 = 100 + Math.sin((start * Math.PI) / 180) * r
    const x2 = 100 + Math.cos((end * Math.PI) / 180) * r
    const y2 = 100 + Math.sin((end * Math.PI) / 180) * r
    const t = i / (segments - 1)
    return {
      x1,
      y1,
      x2,
      y2,
      color: lerpMaroon(t),
      active: i < lit,
    }
  })

  return (
    <section className="orbit-panel flex h-full min-h-[320px] flex-col">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h3 className="orbit-panel__title">{title}</h3>
          {description ? <p className="orbit-panel__desc">{description}</p> : null}
        </div>
        {live ? (
          <span className="orbit-live-pill" title="Updates automatically">
            <span className="orbit-live-pill__dot" />
            Live
          </span>
        ) : null}
      </div>

      <div className="relative mx-auto flex w-full max-w-[300px] flex-1 flex-col items-center justify-center">
        {badge ? (
          <span className="orbit-gauge-badge mb-1">
            <svg
              className="orbit-gauge-badge__icon h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.9 7.2 17l.9-5.4L4.2 7.7l5.4-.8L12 2z" />
            </svg>
            {badge}
          </span>
        ) : null}

        <div className="relative w-full">
          <svg viewBox="0 0 200 118" className="block w-full" aria-hidden>
            {arcs.map((a, i) => (
              <path
                key={i}
                d={`M ${a.x1} ${a.y1} A ${r} ${r} 0 0 1 ${a.x2} ${a.y2}`}
                fill="none"
                stroke={a.active ? a.color : 'rgba(45,0,0,0.1)'}
                strokeWidth="13"
                strokeLinecap="butt"
                style={{ transition: 'stroke 0.35s ease' }}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-x-0 top-[48%] -translate-y-1/2 px-4 text-center">
            <p className="font-[family-name:var(--font-display)] text-[2.35rem] font-bold leading-none tracking-tight text-[#2D0000]">
              {shown.toLocaleString()}
              <span className="text-2xl font-bold text-[#6D0808]">%</span>
            </p>
            <p className="mt-1.5 text-sm font-semibold text-[#4a3a3a]">{label}</p>
            {sublabel ? (
              <p className="mt-1 text-[11px] font-medium leading-snug text-[#5a6258]">{sublabel}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function lerpMaroon(t) {
  // deep ink → maroon → sage → cream
  const stops = [
    [45, 0, 0],
    [109, 8, 8],
    [138, 58, 50],
    [117, 125, 111],
    [217, 211, 188],
  ]
  const x = t * (stops.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = stops[Math.min(i, stops.length - 1)]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  const r = Math.round(a[0] + (b[0] - a[0]) * f)
  const g = Math.round(a[1] + (b[1] - a[1]) * f)
  const bl = Math.round(a[2] + (b[2] - a[2]) * f)
  return `rgb(${r},${g},${bl})`
}
