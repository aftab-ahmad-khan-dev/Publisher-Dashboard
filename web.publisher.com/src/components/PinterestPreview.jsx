import { useState } from 'react'

export default function PinterestPreview({ enabled, body, imagePreviewUrl, defaultCollapsed = true }) {
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
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
              Pins need an image
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <p className="text-sm font-bold leading-snug">{title}</p>
          {text && <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{text}</p>}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-zinc-500">Pin · image required · title from first line</p>
    </PreviewShell>
  )
}

function PreviewShell({ collapsed, onToggle, disabled, children }) {
  return (
    <div className={`rounded-xl border bg-[#F7F4EA] transition ${disabled ? 'border-[#757D6F]/20 opacity-55' : 'border-[#757D6F]/30'}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="text-xs font-semibold text-[#2D0000]">Pinterest</span>
        <span className="text-[10px] font-medium text-[#5a6258]">{collapsed ? 'Show' : 'Hide'}</span>
      </button>
      {!collapsed && !disabled && <div className="border-t border-[#757D6F]/20 px-3 pb-3 pt-2">{children}</div>}
    </div>
  )
}
