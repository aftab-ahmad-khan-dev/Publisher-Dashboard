import { useState, useRef } from 'react'

const PLATFORM_TOGGLES = [
  { key: 'instagram', label: 'IG', active: 'bg-gradient-to-r from-[#E1306C] to-[#F77737] text-white' },
  { key: 'facebook', label: 'FB', active: 'bg-[#1877F2] text-white' },
  { key: 'linkedin', label: 'LI', active: 'bg-[#0A66C2] text-white' },
]

export default function HashtagManager({
  hashtags,
  hashtagCounts,
  addHashtag,
  removeHashtag,
  toggleHashtagPlatform,
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const submit = () => {
    const parts = input.split(/[\s,]+/).filter(Boolean)
    parts.forEach((p) => addHashtag(p))
    setInput('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      submit()
    }
  }

  const summary = [
    hashtagCounts.instagram > 0 && `${hashtagCounts.instagram} on Instagram`,
    hashtagCounts.facebook > 0 && `${hashtagCounts.facebook} on Facebook`,
    hashtagCounts.linkedin > 0 && `${hashtagCounts.linkedin} on LinkedIn`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Hashtags
      </label>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="#TechStartup #AI #BuildInPublic"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#1877F2]/50"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-600 transition-colors"
        >
          Add
        </button>
      </div>

      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hashtags.map((h) => (
            <div
              key={h.id}
              className="animate-chip-in flex items-center gap-1 rounded-full border border-white/10 bg-slate-800/80 py-1 pl-3 pr-1"
            >
              <span className="text-sm font-medium text-slate-200">{h.tag}</span>
              <div className="flex gap-0.5 px-1">
                {PLATFORM_TOGGLES.map(({ key, label, active }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleHashtagPlatform(h.id, key)}
                    title={`Toggle ${label}`}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                      h.platforms[key]
                        ? active
                        : 'bg-slate-700/80 text-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeHashtag(h.id)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-700 hover:text-white"
                aria-label={`Remove ${h.tag}`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {summary || 'No hashtags added yet — tags can be toggled per platform'}
      </p>
    </div>
  )
}
