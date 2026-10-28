import { useState } from 'react'
import { redditTitleFromBody } from '../lib/contentPolicy'

export default function RedditPreview({ enabled, body, poll, defaultCollapsed = true }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const pollEnabled = Boolean(poll?.enabled)
  const pollQuestion = (poll?.question || body || '').trim()
  const pollOptions = (poll?.options || []).map((o) => o.trim()).filter(Boolean)
  const title = pollEnabled ? pollQuestion : redditTitleFromBody(body)
  const text = pollEnabled ? body?.trim() || '' : body?.trim() || ''

  if (!enabled) {
    return (
      <PreviewShell title="Reddit" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} disabled />
    )
  }

  return (
    <PreviewShell title="Reddit" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}>
      <div className="rounded-lg border border-[#343536] bg-[#1A1A1B] text-[#D7DADC]">
        <div className="flex gap-2 border-b border-[#343536] px-3 py-2 text-[10px] text-[#818384]">
          <span className="font-bold text-[#FF4500]">r/yoursubreddit</span>
          <span>·</span>
          <span>u/publisher</span>
          <span>· just now</span>
        </div>
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white">{title || 'Post title'}</p>
          {text && (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#D7DADC]">{text}</p>
          )}
          {pollEnabled && pollOptions.length > 0 && (
            <div className="mt-3 space-y-2">
              {pollOptions.map((option) => (
                <div
                  key={option}
                  className="rounded-md border border-[#343536] bg-[#272729] px-3 py-2 text-xs text-[#D7DADC]"
                >
                  {option}
                </div>
              ))}
              <p className="text-[10px] text-[#818384]">
                Poll · {poll.durationDays || 3} day{(poll.durationDays || 3) === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-4 border-t border-[#343536] px-3 py-2 text-[10px] font-bold text-[#818384]">
          <span>↑ Vote</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        {pollEnabled ? 'Poll post · single choice via Reddit API' : 'Self-post · title from first line · no hashtag block'}
      </p>
    </PreviewShell>
  )
}

function PreviewShell({ title, collapsed, onToggle, disabled, children }) {
  return (
    <div className={`rounded-xl border transition ${disabled ? 'border-white/[0.04] opacity-40' : 'border-white/[0.08]'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-white">{title}</span>
        <span className="text-[10px] text-slate-500">{collapsed ? 'Show' : 'Hide'}</span>
      </button>
      {!collapsed && !disabled && <div className="border-t border-white/[0.06] px-3 pb-3 pt-2">{children}</div>}
    </div>
  )
}
