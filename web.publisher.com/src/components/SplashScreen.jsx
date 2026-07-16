import BrandLogo from './BrandLogo'

/**
 * Aesthetic branded splash / full-screen loader.
 * @param {boolean} visible
 * @param {string} [message] - status line under the tagline
 * @param {string} [subtitle]
 * @param {number|null} [progress] - 0–100 for determinate bar; null = indeterminate
 * @param {boolean} [exit] - fade-out class when hiding
 */
export default function SplashScreen({
  visible,
  message,
  subtitle = 'Unified social publishing',
  progress = null,
  exit = false,
}) {
  if (!visible) return null

  const hasProgress = typeof progress === 'number' && !Number.isNaN(progress)
  const clamped = hasProgress ? Math.min(100, Math.max(0, Math.round(progress))) : null

  return (
    <div
      className={`splash-root fixed inset-0 z-[220] flex flex-col items-center justify-center overflow-hidden ${
        exit ? 'splash-root--exit' : 'splash-root--enter'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message || 'Loading Publisher Suite'}
    >
      <div className="splash-mesh absolute inset-0" aria-hidden />
      <div className="splash-grid absolute inset-0" aria-hidden />

      <div className="splash-orb splash-orb--a absolute rounded-full" aria-hidden />
      <div className="splash-orb splash-orb--b absolute rounded-full" aria-hidden />
      <div className="splash-orb splash-orb--c absolute rounded-full" aria-hidden />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="splash-logo-wrap relative mb-8">
          <div className="splash-ring splash-ring--outer" aria-hidden />
          <div className="splash-ring splash-ring--inner" aria-hidden />
          <div className="splash-logo relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.35rem] bg-[#0b0e18]/80 shadow-2xl shadow-indigo-500/30 ring-1 ring-white/10 backdrop-blur-sm">
            <BrandLogo className="h-14 w-14" />
          </div>
        </div>

        <p className="splash-eyebrow mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300/80">
          Publisher Suite
        </p>
        <h1 className="splash-title font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Publish once.
          <span className="splash-title-accent mt-1 block bg-gradient-to-r from-indigo-300 via-sky-300 to-indigo-200 bg-clip-text text-transparent">
            Reach everywhere.
          </span>
        </h1>
        <p className="splash-subtitle mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
          {subtitle}
        </p>

        {message && (
          <p className="splash-message mt-5 max-w-sm text-xs font-medium text-slate-300">
            {message}
          </p>
        )}

        <div className="splash-bar mt-9 h-1 w-52 overflow-hidden rounded-full bg-white/[0.08] sm:w-56">
          <div
            className={`splash-bar-fill h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-400 ${
              hasProgress ? 'splash-bar-fill--determinate' : 'splash-bar-fill--indeterminate'
            }`}
            style={hasProgress ? { width: `${clamped}%` } : undefined}
          />
        </div>
        {hasProgress && (
          <p className="mt-2 font-display text-xs font-semibold tabular-nums text-indigo-200/90">
            {clamped}%
          </p>
        )}
      </div>
    </div>
  )
}
