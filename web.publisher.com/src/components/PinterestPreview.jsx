import { useState } from 'react'

export default function PinterestPreview({ enabled, body, imagePreviewUrl, imageCount = 0, defaultCollapsed = true }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const text = body?.trim() || ''
  const title = (text.split('\n')[0] || 'New Pin').slice(0, 100)

  if (!enabled) {
    return <PreviewShell collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} disabled />
  }

  return (
    <PreviewShell collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}>
      <div className="overflow-hidden rounded-2xl bg-white text-[#111]">
        <div className="aspect-[3/4] w-full bg-slate-200">
          {imagePreviewUrl ? (
            <img src={imagePreviewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              Pins need an image
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="text-sm font-bold leading-snug">{title}</p>
          {text && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{text}</p>}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Pin · image required · title from first line
        {imageCount > 1 && ' · uses the first image only'}
      </p>
    </PreviewShell>
  )
}

function PreviewShell({ collapsed, onToggle, disabled, children }) {
  return (
    <div className={`rounded-xl border transition ${disabled ? 'border-white/[0.04] opacity-40' : 'border-white/[0.08]'}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="text-xs font-semibold text-white">Pinterest</span>
        <span className="text-[10px] text-slate-500">{collapsed ? 'Show' : 'Hide'}</span>
      </button>
      {!collapsed && !disabled && <div className="border-t border-white/[0.06] px-3 pb-3 pt-2">{children}</div>}
    </div>
  )
}
