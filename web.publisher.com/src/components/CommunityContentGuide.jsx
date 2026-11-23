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
      ? 'text-[#3f5d52]'
      : analysis.tone === 'promotional'
        ? 'text-[#9a3412]'
        : 'text-[#8a5a00]'

  return (
    <div className="rounded-xl border border-[#757D6F]/35 bg-[#EEEAD7] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#2D0000]">Community platforms — informational tone</p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#5a6258]">
            {enabledCommunity.map((p) => PLATFORM_META[p].label).join(' & ')} favor helpful depth over promotion.
            Lead with insight, context, or a genuine question — avoid CTAs, discounts, and pitch language.
          </p>
        </div>
        {analysis.needsCommunity && (
          <span className={`shrink-0 rounded-full bg-[#F7F4EA] px-2 py-0.5 text-[10px] font-bold ring-1 ring-[#757D6F]/30 ${toneColor}`}>
            {analysis.tone === 'informational' ? 'Looks informational' : analysis.tone === 'promotional' ? 'Too promotional' : 'Neutral'} · {analysis.score}%
          </span>
        )}
      </div>

      {analysis.issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {analysis.issues.map((issue, i) => (
            <li
              key={i}
              className={`flex gap-1.5 text-[11px] font-medium ${
                issue.severity === 'error' ? 'text-[#b91c1c]' : 'text-[#8a5a00]'
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
