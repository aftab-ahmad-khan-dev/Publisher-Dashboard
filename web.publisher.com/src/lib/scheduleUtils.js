export const DEFAULT_SCHEDULE_HOUR = 12
export const DEFAULT_SCHEDULE_MINUTE = 0

function pad(n) {
  return String(n).padStart(2, '0')
}

export function dateOnlyKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getOccupiedDateKeys(queue = []) {
  return new Set(queue.map((item) => dateOnlyKey(new Date(item.scheduledAt))))
}

/** Next open calendar day at 12:00 PM (skips dates that already have a scheduled post). */
export function getNextScheduleSlot(queue = []) {
  const occupied = getOccupiedDateKeys(queue)
  const candidate = new Date()
  candidate.setHours(DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE, 0, 0)

  const now = new Date()
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE, 0, 0)
  }

  while (occupied.has(dateOnlyKey(candidate))) {
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE, 0, 0)
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
