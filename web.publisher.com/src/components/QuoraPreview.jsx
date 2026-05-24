import { useState } from 'react'

export default function QuoraPreview({ enabled, body }) {
  const [collapsed, setCollapsed] = useState(true)
  const text = body?.trim() || ''

  if (!enabled) {
    return (
      <PreviewShell title="Quora" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} disabled />
    )
  }

  return (
    <PreviewShell title="Quora" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}>
      <div className="rounded-lg border border-[#dee0e1] bg-white text-[#333] shadow-sm">
        <p className="border-b border-[#dee0e1] px-3 py-2 text-xs font-medium text-[#939598]">
          Answer · guided post (copy to Quora)
        </p>
        <div className="flex gap-3 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B92B27] text-xs font-bold text-white">
            AK
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Alex Khan</p>
            <p className="text-[11px] text-[#939598]">Publisher · expertise answer</p>
            {text ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
            ) : (
              <p className="mt-2 text-sm italic text-[#939598]">Your answer appears here…</p>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">Quora has no public write API — we format for manual paste</p>
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
