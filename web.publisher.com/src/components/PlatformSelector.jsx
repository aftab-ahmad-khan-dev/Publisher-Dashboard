import { PLATFORM_META, PLATFORM_ORDER } from '../lib/constants'
import PlatformIcon from './PlatformIcon'

function Toggle({ enabled, onChange, accent }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        enabled ? accent : 'bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function accentClass(key, meta) {
  if (meta.gradient) return 'instagram-gradient'
  return meta.color || 'bg-violet-600'
}

export default function PlatformSelector({ platforms, togglePlatform }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {PLATFORM_ORDER.map((key) => {
        const meta = PLATFORM_META[key]
        const enabled = platforms[key]
        const accent = accentClass(key, meta)
        const isCommunity = meta.community

        return (
          <div
            key={key}
            className={`platform-card-press flex items-center gap-2 rounded-lg border p-2.5 transition-all duration-200 ${
              enabled
                ? isCommunity
                  ? 'border-amber-500/25 bg-amber-500/[0.04] ring-1 ring-amber-500/15'
                  : 'border-violet-500/20 bg-white/[0.04] shadow-lg shadow-violet-500/5 ring-1 ring-white/[0.06]'
                : 'border-white/[0.04] bg-transparent opacity-50'
            }`}
          >
            <PlatformIcon platform={key} size="md" className="!ring-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{meta.label}</p>
              <p className="truncate text-xs text-slate-500">
                {meta.suite}
                {meta.supportsPoll ? ' · Polls' : ''}
              </p>
            </div>
            <Toggle enabled={enabled} onChange={() => togglePlatform(key)} accent={accent} />
          </div>
        )
      })}
    </div>
  )
}
