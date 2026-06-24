import { useEffect, useMemo } from 'react'
import DateTimePicker from './DateTimePicker'
import { useAppData } from '../contexts/AppDataContext'
import { isPollEnabled, getPollWindow } from '../lib/pollUtils'
import { isMultiPostComposer, composerPostCount } from '../lib/composerPosts'
import {
  getNextScheduleSlot,
  formatScheduleDisplay,
  toDatetimeLocalValue,
  parseDatetimeLocal,
  computeScheduleFromDayN,
  todayDateInputValue,
  getDefaultBulkStartDate,
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
  setScheduleByDay,
  setScheduleStartDate,
  setScheduleDayNum,
  publishNow,
  schedulePost,
  onScheduleSuccess,
  onSaveDraft,
  editingDraftId,
  draftSaving,
}) {
  const { apiConfig } = useAppData()
  const defaultScheduleTime = apiConfig?.defaults?.scheduleTime || '12:00'

  const multiCount = useMemo(() => composerPostCount(state), [state])
  const isMulti = multiCount > 1

  const minDatetime = useMemo(() => {
    const d = new Date(Date.now() + 60000)
    return toDatetimeLocalValue(d)
  }, [])

  const nextSlotHint = useMemo(() => {
    const next = getNextScheduleSlot(queue, defaultScheduleTime)
    return `Next open slot: ${formatScheduleDisplay(next, { showRelative: true })}`
  }, [queue, defaultScheduleTime])

  const dayNStartPreview = useMemo(() => {
    const inDayMode = state.scheduleByDay || isMulti
    if (!inDayMode || !state.scheduleStartDate) return ''
    const firstDay = isMulti ? 1 : state.scheduleDayNum || 1
    return formatScheduleDisplay(
      computeScheduleFromDayN(state.scheduleStartDate, firstDay, defaultScheduleTime),
      { timezone: state.timezone, showRelative: true },
    )
  }, [
    state.scheduleByDay,
    isMulti,
    state.scheduleStartDate,
    state.scheduleDayNum,
    state.timezone,
    defaultScheduleTime,
  ])

  const dayNEndPreview = useMemo(() => {
    const inDayMode = state.scheduleByDay || isMulti
    if (!inDayMode || !state.scheduleStartDate) return ''
    const lastDay = isMulti ? multiCount : state.scheduleDayNum || 1
    return formatScheduleDisplay(
      computeScheduleFromDayN(state.scheduleStartDate, lastDay, defaultScheduleTime),
      { timezone: state.timezone, showRelative: true },
    )
  }, [
    state.scheduleByDay,
    isMulti,
    multiCount,
    state.scheduleStartDate,
    state.scheduleDayNum,
    state.timezone,
    defaultScheduleTime,
  ])

  const pollWindow = useMemo(() => {
    if (!isPollEnabled(state)) return null
    return getPollWindow(state)
  }, [state])

  useEffect(() => {
    if (isMulti && state.publishMode === 'scheduled' && !state.scheduleByDay) {
      setScheduleByDay(true)
    }
  }, [isMulti, state.publishMode, state.scheduleByDay, setScheduleByDay])

  useEffect(() => {
    if (state.publishMode === 'scheduled' && !state.scheduledAt && !state.scheduleByDay && !isMulti) {
      setScheduledAt(getNextScheduleSlot(queue, defaultScheduleTime))
    }
  }, [
    state.publishMode,
    state.scheduledAt,
    state.scheduleByDay,
    isMulti,
    queue,
    setScheduledAt,
    defaultScheduleTime,
  ])

  useEffect(() => {
    if (state.publishMode !== 'scheduled' || !state.scheduleByDay) return
    if (!state.scheduleStartDate) {
      setScheduleStartDate(getDefaultBulkStartDate(defaultScheduleTime))
      return
    }
    const next = computeScheduleFromDayN(
      state.scheduleStartDate,
      state.scheduleDayNum || 1,
      defaultScheduleTime,
    )
    if (next !== state.scheduledAt) setScheduledAt(next)
  }, [
    state.publishMode,
    state.scheduleByDay,
    state.scheduleStartDate,
    state.scheduleDayNum,
    state.scheduledAt,
    defaultScheduleTime,
    setScheduledAt,
    setScheduleStartDate,
  ])

  const handleScheduleMode = () => {
    setPublishMode('scheduled')
    if (!state.scheduledAt) {
      if (state.scheduleByDay && state.scheduleStartDate) {
        setScheduledAt(
          computeScheduleFromDayN(
            state.scheduleStartDate,
            state.scheduleDayNum || 1,
            defaultScheduleTime,
          ),
        )
      } else {
        setScheduledAt(getNextScheduleSlot(queue, defaultScheduleTime))
      }
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
        <>
          {pollWindow && (
            <div className="poll-timeline">
              <div className="poll-timeline__dot poll-timeline__dot--start" />
              <div className="poll-timeline__line" />
              <div className="poll-timeline__dot poll-timeline__dot--end" />
              <div className="poll-timeline__content">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-300/90">
                  Poll window
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {pollWindow.startLabel}
                  <span className="mx-2 text-slate-600">→</span>
                  {pollWindow.endLabel}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Poll runs for {pollWindow.durationDays} day
                  {pollWindow.durationDays === 1 ? '' : 's'} from publish time.
                </p>
              </div>
            </div>
          )}
          <PublishButton status={status} onClick={() => publishNow(state)}>
            {isMulti ? `Publish ${multiCount} posts now` : 'Publish Now'}
          </PublishButton>
        </>
      ) : (
        <div className="animate-preview-update space-y-4">
          {isMulti && (
            <div className="notice-banner notice-banner--violet">
              <p className="text-sm font-medium text-white">Scheduling {multiCount} posts</p>
              <p className="mt-1 text-[11px] opacity-90">
                Each post goes live on its Day N from the start date below, with its matching image
                {isPollEnabled(state) ? ' and poll' : ''}.
              </p>
            </div>
          )}

          {!isMulti && (
            <div className="segmented-control">
              <button
                type="button"
                onClick={() => setScheduleByDay(false)}
                className={`segmented-item text-xs ${!state.scheduleByDay ? 'segmented-item-active' : ''}`}
              >
                Date & time
              </button>
              <button
                type="button"
                onClick={() => setScheduleByDay(true)}
                className={`segmented-item text-xs ${state.scheduleByDay ? 'segmented-item-active' : ''}`}
              >
                Day N
              </button>
            </div>
          )}

          {state.scheduleByDay || isMulti ? (
            <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div>
                <label className="field-label">Day 1 starts on</label>
                <input
                  type="date"
                  value={state.scheduleStartDate || getDefaultBulkStartDate(defaultScheduleTime)}
                  min={getDefaultBulkStartDate(defaultScheduleTime)}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              {!isMulti && (
                <div>
                  <label className="field-label">Publish on Day</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={state.scheduleDayNum || 1}
                    onChange={(e) => setScheduleDayNum(e.target.value)}
                    className="input-premium w-full"
                  />
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                {isMulti
                  ? `Posts publish on Day 1 … Day ${multiCount} from the start date at ${defaultScheduleTime} local.`
                  : `Day N = start date + (N − 1) days at ${defaultScheduleTime} local.`}
              </p>
              {(dayNStartPreview || dayNEndPreview) && (
                <div className="poll-timeline">
                  <div className="poll-timeline__dot poll-timeline__dot--start" />
                  <div className="poll-timeline__line" />
                  <div className="poll-timeline__dot poll-timeline__dot--end" />
                  <div className="poll-timeline__content space-y-2.5">
                    {isMulti ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-300/90">
                            Starts · Day 1
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-white">{dayNStartPreview}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-300/90">
                            Ends · Day {multiCount}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-white">{dayNEndPreview}</p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-300/90">
                          Goes live · Day {state.scheduleDayNum || 1}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-white">{dayNEndPreview}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <DateTimePicker
              value={state.scheduledAt}
              onChange={setScheduledAt}
              minDate={minDatetime}
              hint={nextSlotHint}
              timezone={state.timezone}
              defaultScheduleTime={defaultScheduleTime}
            />
          )}

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

          {state.scheduledAt && !state.scheduleByDay && (
            <div className="poll-timeline">
              <div className="poll-timeline__dot poll-timeline__dot--start" />
              <div className="poll-timeline__content">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-300/90">
                  Goes live
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {formatScheduleDisplay(state.scheduledAt, { timezone: state.timezone })}
                </p>
              </div>
            </div>
          )}

          {pollWindow && (
            <div className="poll-timeline">
              <div className="poll-timeline__dot poll-timeline__dot--start" />
              <div className="poll-timeline__line" />
              <div className="poll-timeline__dot poll-timeline__dot--end" />
              <div className="poll-timeline__content">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-300/90">
                  Poll window
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {pollWindow.startLabel}
                  <span className="mx-2 text-slate-600">→</span>
                  {pollWindow.endLabel}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Poll opens when the post goes live and closes after {pollWindow.durationDays} day
                  {pollWindow.durationDays === 1 ? '' : 's'}.
                </p>
              </div>
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
            Schedule {isMulti ? `${multiCount} posts` : 'Post'}
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
