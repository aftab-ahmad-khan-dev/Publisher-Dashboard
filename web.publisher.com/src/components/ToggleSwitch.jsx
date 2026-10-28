/** Compact switch — optional ON/OFF labels beside the control. */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
  accent = 'zinc',
  size = 'md',
  showLabels = false,
  onLabel = 'ON',
  offLabel = 'OFF',
}) {
  const sizes = {
    sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', on: 'translate-x-4' },
    md: { track: 'h-6 w-11', thumb: 'h-5 w-5', on: 'translate-x-5' },
  }
  const s = sizes[size] || sizes.md

  const accentOn =
    accent === 'emerald'
      ? 'bg-emerald-500/90'
      : 'bg-zinc-100'

  const switchBtn = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors duration-150 ${s.track} ${
        checked ? accentOn : 'bg-white/[0.12] ring-1 ring-white/10'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full shadow-sm transition-transform duration-150 ${s.thumb} ${
          checked ? `${s.on} ${accent === 'emerald' ? 'bg-white' : 'bg-zinc-950'}` : 'translate-x-0 bg-zinc-300'
        }`}
      />
    </button>
  )

  if (!showLabels) return switchBtn

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${checked ? 'text-zinc-500' : 'text-zinc-300'}`}>
        {offLabel}
      </span>
      {switchBtn}
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${checked ? 'text-zinc-200' : 'text-zinc-500'}`}>
        {onLabel}
      </span>
    </div>
  )
}
