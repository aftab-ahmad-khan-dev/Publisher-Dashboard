import { PLATFORM_LIMITS } from '../hooks/usePostState'

const PLATFORMS = [
  { key: 'instagram', label: 'IG', color: 'text-[#E1306C]' },
  { key: 'facebook', label: 'FB', color: 'text-[#1877F2]' },
  { key: 'linkedin', label: 'LI', color: 'text-[#0A66C2]' },
]

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

export default function CharacterCounter({ getFullLength }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Character limits
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {PLATFORMS.map(({ key, label, color }) => {
          const limit = PLATFORM_LIMITS[key]
          const length = getFullLength(key)
          const status = getStatus(length, limit)
          return (
            <div
              key={key}
              className={`font-mono text-xs tabular-nums ${STATUS_STYLES[status]}`}
              title={`${label}: ${length} / ${limit.toLocaleString()}`}
            >
              <span className={`font-semibold ${color}`}>{label}</span>{' '}
              <span>
                {length.toLocaleString()}/{limit.toLocaleString()}
              </span>
              {status === 'exceeded' && (
                <span className="ml-1 text-red-400">!</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {PLATFORMS.map(({ key, label }) => {
          const limit = PLATFORM_LIMITS[key]
          const length = getFullLength(key)
          const pct = Math.min((length / limit) * 100, 100)
          const status = getStatus(length, limit)
          const barColor =
            status === 'exceeded'
              ? 'bg-red-500'
              : status === 'warning' || status === 'approaching'
                ? 'bg-amber-400'
                : key === 'instagram'
                  ? 'bg-gradient-to-r from-[#E1306C] to-[#F77737]'
                  : key === 'facebook'
                    ? 'bg-[#1877F2]'
                    : 'bg-[#0A66C2]'
          return (
            <div
              key={key}
              className="h-1.5 overflow-hidden rounded-full bg-slate-800"
              title={`${label}: ${length}/${limit}`}
            >
              <div
                className={`h-full transition-all duration-300 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
