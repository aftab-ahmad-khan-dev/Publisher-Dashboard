import { DEFAULT_SCHEDULE_HOUR, DEFAULT_SCHEDULE_MINUTE } from './scheduleConstants.js'
import { computeBulkScheduleDate, parseScheduleTime } from './bulkSchedule.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayDateStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Re-queue failed or pending scheduled posts, one per day.
 * `fromToday`: first post goes out soon (or today at schedule time if still ahead),
 * then each following day at the default hour.
 */
export function planMissedPostReschedule(docs, { startDate, scheduleTime, fromToday = true } = {}) {
  const [hour, minute] = parseScheduleTime(
    scheduleTime || `${DEFAULT_SCHEDULE_HOUR}:${DEFAULT_SCHEDULE_MINUTE}`,
  )
  const now = new Date()

  const sorted = [...docs].sort((a, b) => {
    const aNum = Number(a.postState?.bulkPostNum)
    const bNum = Number(b.postState?.bulkPostNum)
    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
      return aNum - bNum
    }
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  })

  if (!sorted.length) return []

  if (!fromToday) {
    const resolvedStart = startDate || todayDateStr(now)
    return sorted.map((doc, index) => ({
      doc,
      scheduledAt: computeBulkScheduleDate(resolvedStart, index + 1, hour, minute),
    }))
  }

  const todayStr = startDate || todayDateStr(now)
  const todayAtDefault = computeBulkScheduleDate(todayStr, 1, hour, minute)
  const firstAt =
    todayAtDefault > now ? todayAtDefault : new Date(now.getTime() + 20 * 60 * 1000)

  return sorted.map((doc, index) => {
    if (index === 0) {
      return { doc, scheduledAt: firstAt }
    }
    const d = new Date(firstAt)
    d.setDate(d.getDate() + index)
    d.setHours(hour, minute, 0, 0)
    return { doc, scheduledAt: d }
  })
}
