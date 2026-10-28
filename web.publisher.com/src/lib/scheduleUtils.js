export const DEFAULT_SCHEDULE_HOUR = 12
export const DEFAULT_SCHEDULE_MINUTE = 0
export const DEFAULT_SCHEDULE_TIME = '12:00'

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Parse a "HH:MM" string into [hour, minute], falling back to the 12:00 default. */
export function parseScheduleTime(time) {
  const [h, m] = String(time || DEFAULT_SCHEDULE_TIME).split(':').map(Number)
  return [
    Number.isFinite(h) ? h : DEFAULT_SCHEDULE_HOUR,
    Number.isFinite(m) ? m : DEFAULT_SCHEDULE_MINUTE,
  ]
}

export function dateOnlyKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getOccupiedDateKeys(queue = []) {
  return new Set(queue.map((item) => dateOnlyKey(new Date(item.scheduledAt))))
}

/** Next open calendar day at the configured default time (skips occupied dates). */
export function getNextScheduleSlot(queue = [], defaultScheduleTime = DEFAULT_SCHEDULE_TIME) {
  const [hour, minute] = parseScheduleTime(defaultScheduleTime)
  const occupied = getOccupiedDateKeys(queue)
  const candidate = new Date()
  candidate.setHours(hour, minute, 0, 0)

  const now = new Date()
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(hour, minute, 0, 0)
  }

  while (occupied.has(dateOnlyKey(candidate))) {
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(hour, minute, 0, 0)
  }

  return toDatetimeLocalValue(candidate)
}

export function toDatetimeLocalValue(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function parseDatetimeLocal(value) {
  if (!value) return null
  const [datePart, timePart] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = (timePart || '12:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

/**
 * Convert a naive datetime-local string ("2026-06-01T12:00") into a real UTC
 * ISO string, interpreting the wall-clock time in the browser's local timezone.
 * Use this before sending to the backend so the instant is unambiguous — the
 * backend's `new Date(isoString)` then parses the exact same moment, instead of
 * mistaking a timezone-less string for UTC (which shifted noon by the TZ offset).
 */
export function datetimeLocalToISO(value) {
  const date = parseDatetimeLocal(value)
  return date ? date.toISOString() : null
}

export function formatScheduleDisplay(value, options = {}) {
  const date = parseDatetimeLocal(value)
  if (!date) return ''
  const { timezone, showRelative = false } = options

  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || undefined,
  })

  let text = fmt.format(date)
  if (showRelative) {
    const today = dateOnlyKey(new Date())
    const target = dateOnlyKey(date)
    if (target === today) text = `Today · ${text.split(', ').pop() || '12:00 PM'}`
    else {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (target === dateOnlyKey(tomorrow)) text = `Tomorrow · ${text.split(', ').slice(-1)[0]}`
    }
  }
  return text
}

export function formatTime12h(value) {
  const date = parseDatetimeLocal(value)
  if (!date) return '12:00 PM'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function setTimeOnDatetimeLocal(value, hour, minute = 0) {
  const date = parseDatetimeLocal(value) || new Date()
  date.setHours(hour, minute, 0, 0)
  return toDatetimeLocalValue(date)
}

export function setDateOnDatetimeLocal(value, dateStr) {
  const timePart = value?.includes('T') ? value.split('T')[1] : '12:00'
  return `${dateStr}T${timePart}`
}

export function formatScheduledISO(iso, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(new Date(iso))
}

/** Day N scheduling: startDate + (dayNum − 1) calendar days at hour:minute. */
export function computeScheduleDate(startDateStr, dayNum, hour = DEFAULT_SCHEDULE_HOUR, minute = DEFAULT_SCHEDULE_MINUTE) {
  const [y, m, d] = startDateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d, hour, minute, 0, 0)
  date.setDate(date.getDate() + (Math.max(1, dayNum) - 1))
  return date
}

export function computeScheduleFromDayN(startDateStr, dayNum, defaultScheduleTime = DEFAULT_SCHEDULE_TIME) {
  const [hour, minute] = parseScheduleTime(defaultScheduleTime)
  return toDatetimeLocalValue(computeScheduleDate(startDateStr, dayNum, hour, minute))
}

export function todayDateInputValue() {
  return dateOnlyKey(new Date())
}

/**
 * First calendar day where Day 1 at the default schedule time is still in the future.
 * If today's slot already passed, returns tomorrow (or later).
 */
export function getDefaultBulkStartDate(defaultScheduleTime = DEFAULT_SCHEDULE_TIME) {
  return ensureFutureBulkStartDate(todayDateInputValue(), defaultScheduleTime)
}

/** Bump start date forward until Day 1 at default time is strictly in the future. */
export function ensureFutureBulkStartDate(startDateStr, defaultScheduleTime = DEFAULT_SCHEDULE_TIME) {
  if (!startDateStr) return getDefaultBulkStartDate(defaultScheduleTime)
  const [hour, minute] = parseScheduleTime(defaultScheduleTime)
  let candidate = startDateStr
  let guard = 0
  while (computeScheduleDate(candidate, 1, hour, minute) <= new Date() && guard < 366) {
    const [y, m, d] = candidate.split('-').map(Number)
    const next = new Date(y, m - 1, d)
    next.setDate(next.getDate() + 1)
    candidate = dateOnlyKey(next)
    guard++
  }
  return candidate
}

/** True when Day 1 for this start date would publish in the past. */
export function isBulkStartDateInPast(startDateStr, defaultScheduleTime = DEFAULT_SCHEDULE_TIME) {
  if (!startDateStr) return true
  const [hour, minute] = parseScheduleTime(defaultScheduleTime)
  return computeScheduleDate(startDateStr, 1, hour, minute) <= new Date()
}

export function addDaysToDate(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function createQueueItemAtNoon(daysFromNow, body, platforms, timezone) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE, 0, 0)
  return {
    id: `q-${daysFromNow}-${d.getTime()}`,
    body,
    platforms,
    scheduledAt: d.toISOString(),
    timezone,
    status: 'scheduled',
  }
}
