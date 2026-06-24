/** Premium iOS-style toggle — use instead of raw checkboxes in feature cards. */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
  accent = 'violet',
  size = 'md',
}) {
  const sizes = {
    sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', on: 'translate-x-4' },
    md: { track: 'h-6 w-11', thumb: 'h-5 w-5', on: 'translate-x-5' },
  }
  const s = sizes[size] || sizes.md

  const accentOn =
    accent === 'fuchsia'
      ? 'bg-gradient-to-r from-fuchsia-500 to-violet-600 shadow-fuchsia-500/30'
      : accent === 'emerald'
        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30'
        : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-violet-500/30'

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-all duration-300 ${s.track} ${
        checked ? `${accentOn} shadow-lg` : 'bg-slate-700/80 ring-1 ring-white/10'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-md transition-transform duration-300 ${s.thumb} ${
          checked ? s.on : 'translate-x-0'
        }`}
      />
    </button>
  )
}
