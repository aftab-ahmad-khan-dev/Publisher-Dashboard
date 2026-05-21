export default function SplashScreen({ visible }) {
  if (!visible) return null

  return (
    <div className="splash-root fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#06080f]">
      <div className="splash-glow absolute h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="splash-glow-delay absolute h-[280px] w-[280px] rounded-full bg-rose-500/15 blur-[90px]" />

      <div className="relative flex flex-col items-center">
        <div className="splash-logo mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 shadow-2xl shadow-fuchsia-500/30">
          <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="splash-title font-display text-3xl font-bold tracking-tight text-white">
          Pulse Publisher
        </h1>
        <p className="mt-2 text-sm text-slate-400">Unified social publishing</p>
        <div className="splash-bar mt-10 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="splash-bar-fill h-full rounded-full bg-gradient-to-r from-violet-500 to-rose-500" />
        </div>
      </div>
    </div>
  )
}
