import {
  DEFAULT_POLL,
  POLL_DURATION_OPTIONS,
  POLL_PLATFORMS,
  POLL_MIN_OPTIONS,
  maxPollOptionsForPlatforms,
  getPollWindow,
} from '../lib/pollUtils'
import { PLATFORM_META } from '../lib/constants'
import ToggleSwitch from './ToggleSwitch'
import PlatformIcon from './PlatformIcon'

function PollIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  )
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function PollEditor({ poll, platforms, setPoll, disabled = false, scheduleContext }) {
  const maxOptions = maxPollOptionsForPlatforms(platforms)
  const enabledPollPlatforms = POLL_PLATFORMS.filter((p) => platforms[p])
  const pollWindow = scheduleContext ? getPollWindow(scheduleContext) : null

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

  const toggleEnabled = (on) => {
    update({
      enabled: on,
      options: poll.options?.length >= POLL_MIN_OPTIONS ? poll.options : ['', ''],
    })
  }

  return (
    <div className={`poll-card ${poll.enabled ? 'poll-card--active' : ''}`}>
      <div className="poll-card__glow" aria-hidden />

      <div className="poll-card__header">
        <div className="poll-card__icon-wrap">
          <PollIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-bold tracking-tight text-white">Poll</h3>
            {POLL_PLATFORMS.map((p) => (
              <span
                key={p}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                  platforms[p]
                    ? 'bg-white/[0.08] text-slate-200 ring-white/15'
                    : 'bg-white/[0.02] text-slate-600 ring-white/[0.06]'
                }`}
              >
                <PlatformIcon platform={p} size="sm" className="!h-3 !w-3 !ring-0" />
                {PLATFORM_META[p]?.label || p}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Engage your audience · schedule &amp; Day N supported
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">
            {poll.enabled ? 'On' : 'Off'}
          </span>
          <ToggleSwitch
            checked={poll.enabled}
            disabled={disabled}
            onChange={toggleEnabled}
            accent="fuchsia"
          />
        </div>
      </div>

      {poll.enabled && (
        <div className="poll-card__body animate-preview-update">
          {enabledPollPlatforms.length === 0 && (
            <div className="notice-banner notice-banner--amber">
              Turn on LinkedIn and/or Reddit to publish this poll.
            </div>
          )}

          <div>
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
            <p className="mt-1.5 text-[10px] text-slate-500">
              Leave blank to use the post body as the question.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="field-label mb-0">Answer options</label>
              <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-white/[0.08]">
                {poll.options?.length || 0} / {maxOptions}
              </span>
            </div>

            {(poll.options || []).map((opt, i) => (
              <div key={i} className="poll-option-row">
                <span className="poll-option-letter">{OPTION_LETTERS[i] || i + 1}</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${OPTION_LETTERS[i] || i + 1}`}
                  disabled={disabled}
                  className="input-premium min-w-0 flex-1 border-0 bg-transparent py-2.5 focus:ring-0"
                />
                {(poll.options?.length || 0) > POLL_MIN_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={disabled}
                    className="poll-option-remove"
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {(poll.options?.length || 0) < maxOptions && (
              <button
                type="button"
                onClick={addOption}
                disabled={disabled}
                className="poll-add-option"
              >
                <span className="text-lg leading-none text-indigo-400">+</span>
                Add option
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
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

            <div className="flex flex-col justify-end">
              <div className="poll-toggle-row">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200">Multiple choices</p>
                  <p className="text-[10px] text-slate-500">
                    {platforms.reddit ? 'LinkedIn only' : 'Let voters pick more than one'}
                  </p>
                </div>
                <ToggleSwitch
                  checked={poll.allowMultiple}
                  disabled={disabled || platforms.reddit}
                  onChange={(v) => update({ allowMultiple: v })}
                  size="sm"
                  accent="violet"
                />
              </div>
            </div>
          </div>

          {pollWindow && (
            <div className="poll-timeline">
              <div className="poll-timeline__dot poll-timeline__dot--start" />
              <div className="poll-timeline__line" />
              <div className="poll-timeline__dot poll-timeline__dot--end" />
              <div className="poll-timeline__content">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-300/90">
                  Active window
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {pollWindow.startLabel}
                  <span className="mx-2 text-slate-600">→</span>
                  {pollWindow.endLabel}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {scheduleContext?.publishMode === 'scheduled'
                    ? 'Opens when the post goes live, then runs for the duration above.'
                    : 'Runs from publish time for the duration above.'}
                </p>
              </div>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-slate-600">
            Polls cannot include images. Facebook, Instagram, Pinterest, Threads, and Quora are
            skipped automatically.
          </p>
        </div>
      )}
    </div>
  )
}
