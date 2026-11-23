/** Compact switch — optional ON/OFF labels beside the control. */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
  accent = 'maroon',
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
    accent === 'emerald' || accent === 'sage'
      ? 'bg-[#757D6F]'
      : 'bg-[#6D0808]'

  const switchBtn = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors duration-150 ${s.track} ${
        checked
          ? accentOn
          : 'bg-[#d9d3bc] ring-1 ring-[#757D6F]/35'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full shadow-sm transition-transform duration-150 ${s.thumb} ${
          checked ? `${s.on} bg-[#EEEAD7]` : 'translate-x-0 bg-[#F7F4EA]'
        }`}
      />
    </button>
  )

  if (!showLabels) return switchBtn

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide ${
          checked ? 'text-[#5a6258]' : 'text-[#2D0000]'
        }`}
      >
        {offLabel}
      </span>
      {switchBtn}
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide ${
          checked ? 'text-[#2D0000]' : 'text-[#5a6258]'
        }`}
      >
        {onLabel}
      </span>
    </div>
  )
}
