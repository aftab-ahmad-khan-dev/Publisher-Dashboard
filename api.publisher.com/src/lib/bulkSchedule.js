import { DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE } from './scheduleConstants.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

export function parseScheduleTime(time) {
  const [h, m] = String(time || `${DEFAULT_SCHEDULE_HOUR}:${DEFAULT_SCHEDULE_MINUTE}`).split(':').map(Number)
  return [
    Number.isFinite(h) ? h : DEFAULT_SCHEDULE_HOUR,
    Number.isFinite(m) ? m : DEFAULT_SCHEDULE_MINUTE,
  ]
}

export function computeBulkScheduleDate(startDateStr, dayNum, hour, minute) {
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const scheduled = new Date(sy, sm - 1, sd, hour, minute, 0, 0)
  scheduled.setDate(scheduled.getDate() + (Math.max(1, Number(dayNum) || 1) - 1))
  return scheduled
}

/** Bump start date until Day 1 at the default time is in the future. */
export function ensureFutureBulkStartDate(startDateStr, defaultScheduleTime) {
  const [hour, minute] = parseScheduleTime(defaultScheduleTime)
  let candidate = startDateStr || new Date().toISOString().slice(0, 10)
  let guard = 0
  while (computeBulkScheduleDate(candidate, 1, hour, minute) <= new Date() && guard < 366) {
    const [y, m, d] = candidate.split('-').map(Number)
    const next = new Date(y, m - 1, d)
    next.setDate(next.getDate() + 1)
    candidate = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
    guard++
  }
  return candidate
}
