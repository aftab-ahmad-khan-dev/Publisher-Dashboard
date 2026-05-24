import { PLATFORM_META, PLATFORM_ORDER } from '../lib/constants'
import { PLATFORM_LIMITS } from '../hooks/usePostState'

function getStatus(length, limit) {
  const ratio = length / limit
  if (length > limit) return 'exceeded'
  if (ratio >= 0.9) return 'warning'
  if (ratio >= 0.75) return 'approaching'
  return 'ok'
}

const STATUS_STYLES = {
  ok: 'text-slate-400',
  approaching: 'text-amber-400/90',
  warning: 'text-amber-300',
  exceeded: 'text-red-400',
}

function barColor(key, status) {
  if (status === 'exceeded') return 'bg-red-500'
  if (status === 'warning' || status === 'approaching') return 'bg-amber-400'
  const meta = PLATFORM_META[key]
  if (meta.gradient) return 'bg-gradient-to-r from-[#E1306C] to-[#F77737]'
  return meta.color || 'bg-violet-500'
}

function labelColor(key) {
  const meta = PLATFORM_META[key]
  if (key === 'instagram') return 'text-[#E1306C]'
  if (key === 'facebook') return 'text-[#1877F2]'
  if (key === 'linkedin') return 'text-[#0A66C2]'
  if (key === 'reddit') return 'text-[#FF4500]'
  if (key === 'quora') return 'text-[#B92B27]'
  return 'text-slate-400'
}

export default function CharacterCounter({ getFullLength }) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Character limits
      </span>
      <div className="flex flex-wrap gap-2">
        {PLATFORM_ORDER.map((key) => {
          const meta = PLATFORM_META[key]
          const limit = PLATFORM_LIMITS[key]
          const length = getFullLength(key)
          const status = getStatus(length, limit)
          return (
            <div
              key={key}
              className={`font-mono text-[10px] tabular-nums sm:text-xs ${STATUS_STYLES[status]}`}
              title={`${meta.label}: ${length} / ${limit.toLocaleString()}`}
            >
              <span className={`font-semibold ${labelColor(key)}`}>{meta.short}</span>{' '}
              {length.toLocaleString()}/{limit.toLocaleString()}
              {status === 'exceeded' && <span className="ml-0.5 text-red-400">!</span>}
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {PLATFORM_ORDER.map((key) => {
          const limit = PLATFORM_LIMITS[key]
          const length = getFullLength(key)
          const pct = Math.min((length / limit) * 100, 100)
          const status = getStatus(length, limit)
          return (
            <div
              key={key}
              className="h-1.5 overflow-hidden rounded-full bg-slate-800"
              title={`${PLATFORM_META[key].label}: ${length}/${limit}`}
            >
              <div
                className={`h-full transition-all duration-300 ${barColor(key, status)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
