import {
  DEFAULT_POLL,
  POLL_DURATION_OPTIONS,
  POLL_PLATFORMS,
  POLL_MIN_OPTIONS,
  maxPollOptionsForPlatforms,
} from '../lib/pollUtils'
import { PLATFORM_META } from '../lib/constants'

export default function PollEditor({ poll, platforms, setPoll, disabled = false }) {
  const maxOptions = maxPollOptionsForPlatforms(platforms)
  const pollPlatformLabels = POLL_PLATFORMS.map((p) => PLATFORM_META[p]?.label || p).join(' & ')
  const enabledPollPlatforms = POLL_PLATFORMS.filter((p) => platforms[p])

  const update = (patch) => setPoll({ ...poll, ...patch })

  const setOption = (index, value) => {
    const next = [...(poll.options || DEFAULT_POLL.options)]
    next[index] = value
    update({ options: next })
  }

  const addOption = () => {
    if ((poll.options?.length || 0) >= maxOptions) return
    update({ options: [...(poll.options || []), ''] })
  }

  const removeOption = (index) => {
    if ((poll.options?.length || 0) <= POLL_MIN_OPTIONS) return
    update({ options: poll.options.filter((_, i) => i !== index) })
  }

  return (
    <section
      className={`composer-section overflow-hidden ${poll.enabled ? 'composer-section-active' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">Poll</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {pollPlatformLabels} · schedule supported
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={poll.enabled}
            disabled={disabled}
            onChange={(e) =>
              update({
                enabled: e.target.checked,
                options: poll.options?.length >= POLL_MIN_OPTIONS ? poll.options : ['', ''],
              })
            }
            className="rounded border-white/20 bg-white/5"
          />
          Enable poll
        </label>
      </div>

      {poll.enabled && (
        <div className="space-y-3 p-3">
          {enabledPollPlatforms.length === 0 && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2 text-[11px] text-amber-300/95">
              Turn on LinkedIn and/or Reddit to publish this poll.
            </p>
          )}

          <div className="min-w-0">
            <label className="field-label">Poll question</label>
            <input
              type="text"
              value={poll.question}
              onChange={(e) => update({ question: e.target.value })}
              placeholder="What should we build next?"
              maxLength={140}
              disabled={disabled}
              className="input-premium w-full"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Leave blank to use the post body as the question.
            </p>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="field-label mb-0">Options</label>
              <span className="shrink-0 text-[10px] text-slate-500">Max {maxOptions}</span>
            </div>
            {(poll.options || []).map((opt, i) => (
              <div key={i} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  disabled={disabled}
                  className="input-premium w-full min-w-0"
                />
                {(poll.options?.length || 0) > POLL_MIN_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={disabled}
                    className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-slate-300 hover:bg-white/[0.06]"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {(poll.options?.length || 0) < maxOptions && (
              <button
                type="button"
                onClick={addOption}
                disabled={disabled}
                className="btn-secondary w-full py-1.5 text-xs"
              >
                Add option
              </button>
            )}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="field-label">Duration</label>
              <select
                value={poll.durationDays}
                onChange={(e) => update({ durationDays: Number(e.target.value) })}
                disabled={disabled}
                className="input-premium w-full"
              >
                {POLL_DURATION_OPTIONS.map((d) => (
                  <option key={d.days} value={d.days} className="bg-[#12151f]">
                    {d.label}
                    {platforms.reddit && d.days > 7 ? ' (LinkedIn only)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-0 items-end">
              <label className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={poll.allowMultiple}
                  disabled={disabled || platforms.reddit}
                  onChange={(e) => update({ allowMultiple: e.target.checked })}
                  className="shrink-0 rounded border-white/20 bg-white/5"
                />
                <span className="min-w-0">
                  Allow multiple choices
                  {platforms.reddit && (
                    <span className="block text-[10px] text-slate-500">LinkedIn only</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-500">
            Images are disabled for polls. Facebook, Instagram, Pinterest, Threads, and Quora are
            skipped automatically.
          </p>
        </div>
      )}
    </section>
  )
}
