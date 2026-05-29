import { PLATFORM_META, PLATFORM_ORDER } from '../lib/constants'
import { PLATFORM_LIMITS } from '../hooks/usePostState'
import PlatformIcon from './PlatformIcon'

function getStatus(length, limit) {
  const ratio = length / limit
  if (length > limit) return 'exceeded'
  if (ratio >= 0.9) return 'warning'
  if (ratio >= 0.75) return 'approaching'
  return 'ok'
}

const STATUS_STYLES = {
  ok: 'text-slate-300',
  approaching: 'text-amber-400/90',
  warning: 'text-amber-300',
  exceeded: 'text-red-400',
}

function barColor(key, status) {
  if (status === 'exceeded') return 'bg-red-500'
  if (status === 'warning' || status === 'approaching') return 'bg-amber-400'
  const meta = PLATFORM_META[key]
  if (meta.gradient) return 'instagram-gradient'
  return meta.color || 'bg-violet-500'
}

export default function CharacterCounter({ getFullLength }) {
  return (
    <div className="space-y-2.5">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Character limits
      </span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {PLATFORM_ORDER.map((key) => {
          const meta = PLATFORM_META[key]
          const limit = PLATFORM_LIMITS[key]
          const length = getFullLength(key)
          const status = getStatus(length, limit)
          const pct = Math.min((length / limit) * 100, 100)
          return (
            <div
              key={key}
              className={`rounded-xl border bg-white/[0.02] px-2.5 py-2 transition-colors ${
                status === 'exceeded' ? 'border-red-500/40' : 'border-white/[0.07]'
              }`}
              title={`${meta.label}: ${length.toLocaleString()} / ${limit.toLocaleString()}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <PlatformIcon platform={key} size="xs" shape="squircle" />
                <span className={`font-mono text-[10px] font-semibold tabular-nums sm:text-[11px] ${STATUS_STYLES[status]}`}>
                  {length.toLocaleString()}
                  <span className="text-slate-600">/{limit >= 1000 ? `${limit / 1000}k` : limit}</span>
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor(key, status)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
