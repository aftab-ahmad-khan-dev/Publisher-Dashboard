import { useState } from 'react'
import { CROP_HINTS } from '../hooks/usePostState'

export default function LinkedInPreview({
  enabled,
  body,
  hashtags,
  imagePreviewUrl,
  imageType,
  showImage,
  cropHint,
  defaultCollapsed = true,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const ratio = CROP_HINTS.find((c) => c.id === cropHint)?.ratio ?? '1.91 / 1'
  const fullText = [body, hashtags].filter(Boolean).join('\n\n')

  if (!enabled) {
    return (
      <PreviewShell
        title="LinkedIn"
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        disabled
      />
    )
  }

  return (
    <PreviewShell
      title="LinkedIn"
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
    >
      <div className="rounded-lg border border-[#38434F] bg-white text-[#000000E6] shadow-md">
        <div className="flex gap-3 p-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-sm">
            AK
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Alex Khan</p>
            <p className="text-xs text-[#666666]">Founder @ Your Brand · 1st</p>
            <p className="text-xs text-[#666666]">3h · 🌐</p>
          </div>
        </div>
        {fullText && (
          <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-relaxed">{fullText}</p>
        )}
        {showImage && imagePreviewUrl && (
          <div className="bg-[#F3F2EF]" style={{ aspectRatio: ratio }}>
            {imageType === 'video' ? (
              <video src={imagePreviewUrl} className="h-full w-full object-cover" muted />
            ) : (
              <img src={imagePreviewUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        )}
        <div className="flex justify-between border-t border-[#E8E8E8] px-4 py-2 text-xs text-[#666666]">
          <span>24 reactions · 5 comments</span>
        </div>
        <div className="grid grid-cols-4 border-t border-[#E8E8E8] px-2 py-1 text-xs font-semibold text-[#666666]">
          {['Like', 'Comment', 'Repost', 'Send'].map((action) => (
            <button key={action} type="button" className="rounded py-2.5 hover:bg-[#F3F2EF]">
              {action}
            </button>
          ))}
        </div>
      </div>
    </PreviewShell>
  )
}

function PreviewShell({ title, collapsed, onToggle, disabled, children }) {
  return (
    <div
      className={`glass-panel overflow-hidden rounded-2xl transition-opacity ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-display text-sm font-semibold text-[#0A66C2]">{title}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!collapsed && !disabled && (
        <div className="animate-preview-update border-t border-white/5 px-4 pb-4 pt-2">
          {children}
        </div>
      )}
      {disabled && (
        <p className="px-4 pb-3 text-xs text-slate-500">Platform disabled</p>
      )}
    </div>
  )
}
