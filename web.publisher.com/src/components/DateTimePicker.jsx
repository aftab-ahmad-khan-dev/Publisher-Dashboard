import { useMemo } from 'react'
import {
  parseDatetimeLocal,
  setDateOnDatetimeLocal,
  setTimeOnDatetimeLocal,
  formatScheduleDisplay,
  parseScheduleTime,
  DEFAULT_SCHEDULE_TIME,
} from '../lib/scheduleUtils'

const BASE_TIME_OPTIONS = [
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '10:00 AM', hour: 10, minute: 0 },
  { label: '11:00 AM', hour: 11, minute: 0 },
  { label: '1:00 PM', hour: 13, minute: 0 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '3:00 PM', hour: 15, minute: 0 },
  { label: '4:00 PM', hour: 16, minute: 0 },
  { label: '5:00 PM', hour: 17, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
]

function labelFor(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * Date & time picker.
 * - allowAnyTime (default true): free clock input — any hour/minute
 * - allowAnyTime false: preset dropdown
 * - minDate: optional; omit for any calendar day
 */
export default function DateTimePicker({
  value,
  onChange,
  minDate,
  hint,
  timezone,
  defaultScheduleTime = DEFAULT_SCHEDULE_TIME,
  allowAnyTime = true,
  label = 'Date & time',
  compact = false,
  /** Force date + time stacked (for narrow cards) */
  stack = false,
}) {
  const parsed = parseDatetimeLocal(value)
  const dateValue = value?.split('T')[0] || ''
  const [defHour, defMinute] = parseScheduleTime(defaultScheduleTime)
  const timeKey = parsed
    ? `${parsed.getHours()}:${parsed.getMinutes()}`
    : `${defHour}:${defMinute}`
  const timeInputValue = parsed
    ? `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
    : `${pad2(defHour)}:${pad2(defMinute)}`

  const TIME_OPTIONS = useMemo(() => {
    if (BASE_TIME_OPTIONS.some((t) => t.hour === defHour && t.minute === defMinute)) {
      return BASE_TIME_OPTIONS
    }
    return [{ label: labelFor(defHour, defMinute), hour: defHour, minute: defMinute }, ...BASE_TIME_OPTIONS]
  }, [defHour, defMinute])

  const minDateOnly = minDate?.split('T')[0]

  const displayLabel = useMemo(
    () => (value ? formatScheduleDisplay(value, { timezone, showRelative: true }) : ''),
    [value, timezone],
  )

  const handleDateChange = (e) => {
    const base = value || minDate || `${e.target.value}T${timeInputValue}`
    const next = setDateOnDatetimeLocal(base, e.target.value)
    onChange(next)
  }

  const handleTimeSelect = (e) => {
    const [hour, minute] = e.target.value.split(':').map(Number)
    const base = value || minDate || `${dateValue || new Date().toISOString().slice(0, 10)}T00:00`
    onChange(setTimeOnDatetimeLocal(base, hour, minute))
  }

  const handleTimeInput = (e) => {
    const raw = e.target.value
    if (!raw) return
    const [hour, minute] = raw.split(':').map(Number)
    const day = dateValue || new Date().toISOString().slice(0, 10)
    const base = value || `${day}T${raw}`
    onChange(setTimeOnDatetimeLocal(base, hour, minute || 0))
  }

  const stacked = stack || compact

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {label ? <label className="field-label">{label}</label> : null}
      <div
        className={`datetime-picker group min-w-0 ${stacked ? 'datetime-picker--stack' : ''} ${
          compact ? '!gap-1' : ''
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <input
            type="date"
            value={dateValue}
            min={minDateOnly || undefined}
            onChange={handleDateChange}
            className={`datetime-input peer w-full min-w-0 ${compact ? '!px-2 !py-1.5 !text-[11px]' : ''}`}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 peer-focus:text-indigo-400">
            <CalendarIcon />
          </span>
        </div>
        <div className={`relative min-w-0 ${stacked ? 'w-full' : compact ? 'w-full sm:w-[7rem]' : 'w-28 sm:w-[140px]'} shrink-0`}>
          {allowAnyTime ? (
            <input
              type="time"
              step={60}
              value={timeInputValue}
              onChange={handleTimeInput}
              className={`datetime-input w-full min-w-0 ${compact ? '!px-2 !py-1.5 !text-[11px]' : ''}`}
              aria-label="Time"
            />
          ) : (
            <>
              <select
                value={timeKey}
                onChange={handleTimeSelect}
                className="datetime-input w-full appearance-none pr-8"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t.label} value={`${t.hour}:${t.minute}`} className="bg-[#12151f]">
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <ClockIcon />
              </span>
            </>
          )}
        </div>
      </div>
      {(hint || displayLabel) && (
        <p className={`flex items-center gap-1.5 text-indigo-300/80 ${compact ? 'text-[9px]' : 'text-xs'}`}>
          <span className="inline-block h-1 w-1 rounded-full bg-indigo-400" />
          {hint || displayLabel}
        </p>
      )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
