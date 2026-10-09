/** Shared shimmer block for dashboard loading states. */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`}
      aria-hidden
    />
  )
}

/** Overview page placeholder — shown after auth splash while stats load. */
export function OverviewSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-label="Loading overview">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card kpi-card--plain">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-2 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className="saas-content-card xl:col-span-8">
          <Skeleton className="mb-3 h-4 w-32" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </section>
        <div className="flex flex-col gap-3 xl:col-span-4">
          <section className="saas-content-card">
            <Skeleton className="mb-3 h-4 w-36" />
            <Skeleton className="mx-auto h-[180px] w-[180px] rounded-full" />
          </section>
          <section className="saas-content-card space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="mt-3 h-5 w-32" />
            <Skeleton className="mt-4 h-7 w-16" />
          </div>
        ))}
      </div>

      <section className="saas-content-card">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-2.5 w-56" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-48 max-w-full" />
              </div>
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
