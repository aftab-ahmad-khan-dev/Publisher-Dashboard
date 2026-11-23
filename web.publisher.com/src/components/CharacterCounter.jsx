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
  ok: 'text-[#2D0000]',
  approaching: 'text-[#8a5a00]',
  warning: 'text-[#9a3412]',
  exceeded: 'text-[#b91c1c]',
}

function barColor(key, status) {
  if (status === 'exceeded') return 'bg-[#b91c1c]'
  if (status === 'warning' || status === 'approaching') return 'bg-[#b45309]'
  const meta = PLATFORM_META[key]
  if (meta.gradient) return 'instagram-gradient'
  return meta.color || 'bg-[#6D0808]'
}

export default function CharacterCounter({ getFullLength }) {
  return (
    <div className="space-y-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6258]">
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
              className={`rounded-xl border bg-[#F7F4EA] px-2.5 py-2 transition-colors ${
                status === 'exceeded' ? 'border-[#b91c1c]/45' : 'border-[#757D6F]/30'
              }`}
              title={`${meta.label}: ${length.toLocaleString()} / ${limit.toLocaleString()}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <PlatformIcon platform={key} size="xs" shape="squircle" />
                <span className={`font-mono text-[10px] font-semibold tabular-nums sm:text-[11px] ${STATUS_STYLES[status]}`}>
                  {length.toLocaleString()}
                  <span className="text-[#5a6258]">/{limit >= 1000 ? `${limit / 1000}k` : limit}</span>
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#d9d3bc]">
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
