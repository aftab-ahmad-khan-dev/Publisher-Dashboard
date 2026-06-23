import { useState } from 'react'
import { CROP_HINTS } from '../hooks/usePostState'

export default function FacebookPreview({
  enabled,
  body,
  hashtags,
  imagePreviewUrl,
  imageType,
  imageCount = 0,
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
        title="Facebook"
        color="#1877F2"
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        disabled
      />
    )
  }

  return (
    <PreviewShell
      title="Facebook"
      color="#1877F2"
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
    >
      <div className="rounded-xl bg-[#242526] text-[#E4E6EB] shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold text-white">
            YB
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Your Brand Page</p>
            <p className="flex items-center gap-1 text-xs text-[#B0B3B8]">
              Just now · <GlobeIcon />
            </p>
          </div>
        </div>
        {fullText && (
          <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-snug">{fullText}</p>
        )}
        {showImage && imagePreviewUrl && (
          <div className="relative bg-black/30" style={{ aspectRatio: ratio }}>
            {imageType === 'video' ? (
              <video src={imagePreviewUrl} className="h-full w-full object-cover" muted />
            ) : (
              <img src={imagePreviewUrl} alt="" className="h-full w-full object-cover" />
            )}
            {imageCount > 1 && (
              <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                1/{imageCount}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-[#3E4042] px-4 py-2 text-xs text-[#B0B3B8]">
          <span>👍❤️ 12</span>
          <span>3 comments · 1 share</span>
        </div>
        <div className="grid grid-cols-3 border-t border-[#3E4042] px-2 py-1 text-xs font-semibold text-[#B0B3B8]">
          <button type="button" className="rounded py-2 hover:bg-[#3A3B3C]">Like</button>
          <button type="button" className="rounded py-2 hover:bg-[#3A3B3C]">Comment</button>
          <button type="button" className="rounded py-2 hover:bg-[#3A3B3C]">Share</button>
        </div>
      </div>
    </PreviewShell>
  )
}

function PreviewShell({ title, color, collapsed, onToggle, disabled, children }) {
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
        <span className="font-display text-sm font-semibold" style={{ color }}>
          {title}
        </span>
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

function GlobeIcon() {
  return (
    <svg className="h-3 w-3 inline" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 0112.9-2.2H9.5v2.2H1.5zm0 1h8v2.2H3.4A6.5 6.5 0 011.5 9zm6.5 5.5V12h2.9A6.5 6.5 0 018 14.5zM9.5 7h5.9A6.5 6.5 0 0014.5 8H9.5V7z" />
    </svg>
  )
}
