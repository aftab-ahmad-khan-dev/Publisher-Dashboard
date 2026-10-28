const PLATFORM_COLORS = {
  instagram: 'instagram-gradient',
  facebook: 'bg-[#1877F2]',
  linkedin: 'bg-[#0A66C2]',
}

const PLATFORM_LABELS = {
  instagram: 'IG',
  facebook: 'FB',
  linkedin: 'LI',
}

function formatScheduled(iso, timezone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString()
  }
}

export default function ScheduleQueue({ queue }) {
  if (queue.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold text-slate-300">
        Upcoming Queue
      </h3>
      <ul className="space-y-2">
        {queue.slice(0, 3).map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-white/5 bg-slate-900/50 px-4 py-3 transition-colors hover:border-white/10"
          >
            <p className="line-clamp-2 text-sm text-slate-300">{item.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {item.platforms.map((p) => (
                  <span
                    key={p}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${PLATFORM_COLORS[p]}`}
                  >
                    {PLATFORM_LABELS[p]}
                  </span>
                ))}
              </div>
              <span className="text-xs text-slate-500">
                {formatScheduled(item.scheduledAt, item.timezone)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
