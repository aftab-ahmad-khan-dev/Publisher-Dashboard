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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
          >
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2 h-6 w-12" />
            <Skeleton className="mt-2 h-2 w-24" />
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
            >
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="mt-2 h-6 w-16" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-xl" />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-2.5 w-56" />
          </div>
          <Skeleton className="h-3 w-28" />
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
              <Skeleton className="hidden h-3 w-10 sm:block" />
              <Skeleton className="hidden h-3 w-10 sm:block" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
