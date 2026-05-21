import { PlatformIconGroup } from './PlatformIcon'
import { formatScheduledISO } from '../lib/scheduleUtils'

export function ScheduledPostListCard({ item, onCancel, style }) {
  const timeLabel =
    formatScheduledISO(item.scheduledAt, item.timezone).split(',').pop()?.trim() || '12:00 PM'

  return (
    <li className="scheduled-card" style={style}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="scheduled-time-badge">
              <ClockIcon />
              {timeLabel}
            </span>
            <PlatformIconGroup platforms={item.platforms} size="md" />
          </div>
          <p className="mt-3 text-base leading-relaxed text-slate-100 line-clamp-3">{item.body}</p>
          <p className="mt-3 text-sm font-medium text-white">
            {formatScheduledISO(item.scheduledAt, item.timezone)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{item.timezone}</p>
        </div>
        <button
          type="button"
          onClick={() => onCancel(item.id)}
          className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/25 transition-colors hover:bg-rose-500/10"
        >
          Cancel
        </button>
      </div>
    </li>
  )
}

export function ScheduledPostGridCard({ item, onCancel, style }) {
  return (
    <li className="scheduled-grid-card group flex flex-col" style={style}>
      <div className="flex items-start justify-between gap-2">
        <span className="scheduled-time-badge shrink-0">
          <ClockIcon />
          {formatScheduledISO(item.scheduledAt, item.timezone)
            .split(',')
            .slice(-1)[0]
            ?.trim() || '12:00 PM'}
        </span>
        <PlatformIconGroup platforms={item.platforms} size="sm" />
      </div>

      <p className="mt-3 flex-1 line-clamp-4 text-sm leading-relaxed text-slate-200">{item.body}</p>

      <p className="mt-3 text-xs font-medium text-white line-clamp-2">
        {formatScheduledISO(item.scheduledAt, item.timezone)}
      </p>
      <p className="mt-1 text-[10px] text-slate-600">{item.timezone}</p>

      <button
        type="button"
        onClick={() => onCancel(item.id)}
        className="mt-4 w-full rounded-xl py-2 text-xs font-semibold text-rose-400 ring-1 ring-rose-500/25 transition-colors hover:bg-rose-500/10"
      >
        Cancel
      </button>
    </li>
  )
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
