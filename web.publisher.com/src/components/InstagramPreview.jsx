import { useState } from 'react'
import { CROP_HINTS } from '../hooks/usePostState'

const IG_CAPTION_LIMIT = 125

function truncateCaption(text) {
  if (text.length <= IG_CAPTION_LIMIT) return { visible: text, more: false }
  const cut = text.slice(0, IG_CAPTION_LIMIT).trimEnd()
  return { visible: cut, more: true }
}

export default function InstagramPreview({
  enabled,
  body,
  hashtags,
  imagePreviewUrl,
  imageType,
  showImage,
  cropHint,
}) {
  const [collapsed, setCollapsed] = useState(true)
  const ratio = CROP_HINTS.find((c) => c.id === cropHint)?.ratio ?? '1 / 1'
  const fullText = [body, hashtags].filter(Boolean).join('\n\n')
  const { visible, more } = truncateCaption(fullText)

  if (!enabled) {
    return (
      <PreviewShell
        title="Instagram"
        gradient
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        disabled
      />
    )
  }

  return (
    <PreviewShell
      title="Instagram"
      gradient
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
    >
      <div className="mx-auto max-w-[280px]">
        <div className="overflow-hidden rounded-[2rem] border-[3px] border-slate-700 bg-black shadow-2xl">
          <div className="flex items-center justify-between bg-black px-5 pt-3 pb-1 text-[10px] text-white">
            <span>9:41</span>
            <div className="flex gap-1">
              <span className="h-2 w-3 rounded-sm bg-white/80" />
              <span className="h-2 w-3 rounded-sm bg-white/80" />
              <span className="h-2 w-4 rounded-sm bg-white/80" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <div className="h-8 w-8 rounded-full instagram-gradient p-[2px]">
              <div className="h-full w-full rounded-full bg-slate-800" />
            </div>
            <span className="text-xs font-semibold text-white">yourbrand</span>
          </div>
          {showImage && imagePreviewUrl && (
            <div className="bg-black" style={{ aspectRatio: ratio }}>
              {imageType === 'video' ? (
                <video src={imagePreviewUrl} className="h-full w-full object-cover" muted />
              ) : (
                <img src={imagePreviewUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          )}
          <div className="px-3 py-2 text-white">
            <div className="mb-2 flex gap-3">
              <HeartIcon />
              <CommentIcon />
              <ShareIcon />
            </div>
            <p className="text-xs leading-relaxed">
              <span className="font-semibold">yourbrand </span>
              <span className="text-slate-200 whitespace-pre-wrap">{visible}</span>
              {more && <span className="text-slate-500">… more</span>}
            </p>
          </div>
        </div>
      </div>
    </PreviewShell>
  )
}

function PreviewShell({ title, gradient, collapsed, onToggle, disabled, children }) {
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
        <span
          className={`font-display text-sm font-semibold ${
            gradient
              ? 'bg-gradient-to-r from-[#E1306C] to-[#F77737] bg-clip-text text-transparent'
              : 'text-white'
          }`}
        >
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

function HeartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}
