import { useEffect, useMemo } from 'react'
import DateTimePicker from './DateTimePicker'
import {
  getNextScheduleSlot,
  formatScheduleDisplay,
  toDatetimeLocalValue,
  parseDatetimeLocal,
} from '../lib/scheduleUtils'

const TIMEZONES = [
  'Asia/Karachi',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
]

function PublishButton({ status, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === 'loading'}
      className="btn-primary relative w-full py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-70"
    >
      {status === 'loading' && (
        <span className="h-5 w-5 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
      )}
      {status === 'success' && (
        <span className="animate-check-pop flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      {status === 'idle' && children}
      {status === 'loading' && <span>Publishing…</span>}
      {status === 'success' && <span>Published!</span>}
    </button>
  )
}

export default function PublishControls({
  state,
  status,
  queue = [],
  setPublishMode,
  setScheduledAt,
  setTimezone,
  publishNow,
  schedulePost,
  onScheduleSuccess,
  onSaveDraft,
  editingDraftId,
  draftSaving,
}) {
  const minDatetime = useMemo(() => {
    const d = new Date(Date.now() + 60000)
    return toDatetimeLocalValue(d)
  }, [])

  const nextSlotHint = useMemo(() => {
    const next = getNextScheduleSlot(queue)
    return `Next open slot: ${formatScheduleDisplay(next, { showRelative: true })}`
  }, [queue])

  useEffect(() => {
    if (state.publishMode === 'scheduled' && !state.scheduledAt) {
      setScheduledAt(getNextScheduleSlot(queue))
    }
  }, [state.publishMode, state.scheduledAt, queue, setScheduledAt])

  const handleScheduleMode = () => {
    setPublishMode('scheduled')
    if (!state.scheduledAt) {
      setScheduledAt(getNextScheduleSlot(queue))
    }
  }

  const handleSchedule = async () => {
    const scheduled = parseDatetimeLocal(state.scheduledAt)
    if (!scheduled) return
    const result = await schedulePost(state)
    if (result?.ok && onScheduleSuccess) {
      onScheduleSuccess(result.queue)
    }
  }

  return (
    <div className="publish-panel space-y-4">
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={draftSaving}
        className="btn-draft w-full"
      >
        <DraftIcon />
        {draftSaving ? 'Saving…' : editingDraftId ? 'Update Draft' : 'Save Draft'}
      </button>

      <div className="segmented-control">
        <button
          type="button"
          onClick={() => setPublishMode('now')}
          className={`segmented-item ${state.publishMode === 'now' ? 'segmented-item-active' : ''}`}
        >
          Publish Now
        </button>
        <button
          type="button"
          onClick={handleScheduleMode}
          className={`segmented-item ${state.publishMode === 'scheduled' ? 'segmented-item-active' : ''}`}
        >
          Schedule
        </button>
      </div>

      {state.publishMode === 'now' ? (
        <PublishButton status={status} onClick={() => publishNow(state)}>
          Publish Now
        </PublishButton>
      ) : (
        <div className="animate-preview-update space-y-4">
          <DateTimePicker
            value={state.scheduledAt}
            onChange={setScheduledAt}
            minDate={minDatetime}
            hint={nextSlotHint}
            timezone={state.timezone}
          />

          <div>
            <label className="field-label">Timezone</label>
            <select
              value={state.timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input-premium w-full"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-[#12151f]">
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {state.scheduledAt && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-400/90">
                Goes live
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {formatScheduleDisplay(state.scheduledAt, { timezone: state.timezone })}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSchedule}
            disabled={status === 'loading'}
            className="btn-schedule w-full"
          >
            {status === 'loading' ? (
              <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
            Schedule Post
          </button>
        </div>
      )}
    </div>
  )
}

function DraftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
