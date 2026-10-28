import { useMemo } from 'react'
import { COMMUNITY_PLATFORMS, PLATFORM_META } from '../lib/constants'
import { analyzeCommunityContent } from '../lib/contentPolicy'

export default function CommunityContentGuide({ body, platforms }) {
  const enabledCommunity = COMMUNITY_PLATFORMS.filter((p) => platforms[p])

  const analysis = useMemo(
    () => analyzeCommunityContent(body, { platforms: enabledCommunity }),
    [body, enabledCommunity],
  )

  if (enabledCommunity.length === 0) return null

  const toneColor =
    analysis.tone === 'informational'
      ? 'text-emerald-400'
      : analysis.tone === 'promotional'
        ? 'text-rose-400'
        : 'text-amber-400/90'

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 ring-1 ring-amber-500/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-amber-200/95">Community platforms — informational tone</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {enabledCommunity.map((p) => PLATFORM_META[p].label).join(' & ')} favor helpful depth over promotion.
            Lead with insight, context, or a genuine question — avoid CTAs, discounts, and pitch language.
          </p>
        </div>
        {analysis.needsCommunity && (
          <span className={`shrink-0 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold ${toneColor}`}>
            {analysis.tone === 'informational' ? 'Looks informational' : analysis.tone === 'promotional' ? 'Too promotional' : 'Neutral'} · {analysis.score}%
          </span>
        )}
      </div>

      {analysis.issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {analysis.issues.map((issue, i) => (
            <li
              key={i}
              className={`flex gap-1.5 text-[11px] ${
                issue.severity === 'error' ? 'text-rose-400/95' : 'text-amber-400/80'
              }`}
            >
              <span aria-hidden>{issue.severity === 'error' ? '✕' : '!'}</span>
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {analysis.ok && analysis.needsCommunity && (
        <p className="mt-2 text-[11px] text-emerald-400/90">
          Ready for community posting — keep it useful first, brand second.
        </p>
      )}
    </div>
  )
}
