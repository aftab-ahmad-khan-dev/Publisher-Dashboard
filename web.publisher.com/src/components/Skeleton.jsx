/** Shared shimmer block for dashboard loading states. */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`rounded-md bg-white/[0.05] ${className}`}
      aria-hidden
    />
  )
}

/** Overview page placeholder. */
export function OverviewSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading overview">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card kpi-card--plain">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-14" />
            <Skeleton className="mt-2 h-2.5 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className="saas-content-card xl:col-span-8">
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className="h-[220px] w-full rounded-md" />
        </section>
        <div className="flex flex-col gap-3 xl:col-span-4">
          <section className="saas-content-card space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-3/4" />
          </section>
          <section className="saas-content-card space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </section>
        </div>
      </div>
    </div>
  )
}
