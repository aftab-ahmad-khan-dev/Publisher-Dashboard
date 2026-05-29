import { useState } from 'react'

export default function ThreadsPreview({ enabled, body }) {
  const [collapsed, setCollapsed] = useState(true)
  const text = body?.trim() || ''

  if (!enabled) {
    return <PreviewShell collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} disabled />
  }

  return (
    <PreviewShell collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}>
      <div className="rounded-2xl border border-[#2a2a2a] bg-black px-3.5 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700" />
          <div className="text-[13px] font-semibold">publisher.suite</div>
          <div className="ml-auto text-[10px] text-slate-500">now</div>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#f5f5f5]">
          {text || 'Your Threads post…'}
        </p>
        <div className="mt-3 flex gap-5 text-slate-500">
          <span className="text-sm">♡</span>
          <span className="text-sm">💬</span>
          <span className="text-sm">↻</span>
          <span className="text-sm">➤</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">Text post · up to 500 characters</p>
    </PreviewShell>
  )
}

function PreviewShell({ collapsed, onToggle, disabled, children }) {
  return (
    <div className={`rounded-xl border transition ${disabled ? 'border-white/[0.04] opacity-40' : 'border-white/[0.08]'}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="text-xs font-semibold text-white">Threads</span>
        <span className="text-[10px] text-slate-500">{collapsed ? 'Show' : 'Hide'}</span>
      </button>
      {!collapsed && !disabled && <div className="border-t border-white/[0.06] px-3 pb-3 pt-2">{children}</div>}
    </div>
  )
}
