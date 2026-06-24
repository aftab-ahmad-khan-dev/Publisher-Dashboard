import { PLATFORM_META, PLATFORM_ORDER } from '../lib/constants'
import PlatformIcon from './PlatformIcon'
import ToggleSwitch from './ToggleSwitch'

export default function PlatformSelector({ platforms, togglePlatform }) {
  return (
    <div className="composer-section">
      <p className="composer-section-title">Platforms</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_ORDER.map((key) => {
          const meta = PLATFORM_META[key]
          const enabled = platforms[key]
          const isCommunity = meta.community

          return (
            <div
              key={key}
              className={`platform-card platform-card-press ${
                enabled
                  ? isCommunity
                    ? 'platform-card--on-community'
                    : 'platform-card--on'
                  : 'platform-card--off'
              }`}
            >
              <PlatformIcon platform={key} size="md" className="!ring-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{meta.label}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {meta.suite}
                  {meta.supportsPoll ? (
                    <span className="text-violet-400/80"> · Polls</span>
                  ) : (
                    ''
                  )}
                </p>
              </div>
              <ToggleSwitch
                checked={enabled}
                onChange={() => togglePlatform(key)}
                accent={isCommunity ? 'emerald' : 'violet'}
                size="sm"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
