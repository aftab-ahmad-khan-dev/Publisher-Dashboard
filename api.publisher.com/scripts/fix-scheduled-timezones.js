/**
 * One-time migration: correct scheduled posts whose `scheduledAt` was stored
 * with the timezone bug.
 *
 * The old code did `new Date("2026-06-01T12:00")`, which JS parses as 12:00 UTC
 * instead of 12:00 in the user's timezone. So a noon post got stored 5h early
 * (for Asia/Karachi, UTC+5) and displayed as 5:00 PM.
 *
 * This script reinterprets each stored instant's wall-clock time in the post's
 * own timezone and rewrites it as the correct UTC instant. A post stored as
 * 2026-06-01T12:00Z with timezone "Asia/Karachi" becomes 2026-06-01T07:00Z,
 * which then displays as 12:00 PM again. Posts with timezone "UTC" are
 * unchanged (their stored value was already correct).
 *
 * USAGE (run from api.publisher.com/):
 *   node scripts/fix-scheduled-timezones.js          # DRY RUN — prints changes, writes nothing
 *   node scripts/fix-scheduled-timezones.js --apply  # actually writes the corrections
 *
 * IMPORTANT: this is NOT idempotent — running --apply twice double-shifts the
 * times. Run it exactly once, after deploying the code fix.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { ScheduledPost } from '../src/models/ScheduledPost.js'

const APPLY = process.argv.includes('--apply')

/** Offset (ms) of `timeZone` at the given UTC instant. Positive = east of UTC. */
function tzOffsetMs(utcMs, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]),
  )
  let hour = Number(parts.hour)
  if (hour === 24) hour = 0 // some engines emit "24" for midnight
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUTC - utcMs
}

/**
 * Given an instant whose UTC wall-clock is the intended *local* wall-clock,
 * return the real UTC instant for that wall-clock in `timeZone`.
 */
function reinterpretWallClockInZone(date, timeZone) {
  const wallMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  )
  const offset = tzOffsetMs(wallMs, timeZone)
  return new Date(wallMs - offset)
}

function fmt(date, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

async function main() {
  const uri = process.env.DATABASE?.trim()
  if (!uri) throw new Error('DATABASE is not set in api.publisher.com/.env')

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20_000, family: 4 })
  console.log(`Connected to ${mongoose.connection.name}`)
  console.log(APPLY ? '\n*** APPLY MODE — writing changes ***\n' : '\n--- DRY RUN — no changes will be written ---\n')

  const docs = await ScheduledPost.find({ status: 'scheduled' }).lean()
  console.log(`Found ${docs.length} post(s) with status "scheduled".\n`)

  let changed = 0
  let skipped = 0

  for (const doc of docs) {
    const tz = doc.timezone || 'UTC'
    const oldDate = new Date(doc.scheduledAt)
    const newDate = reinterpretWallClockInZone(oldDate, tz)
    const deltaHours = Math.round((oldDate.getTime() - newDate.getTime()) / 3.6e6 * 100) / 100

    if (newDate.getTime() === oldDate.getTime()) {
      skipped += 1
      continue
    }

    changed += 1
    console.log(`• ${doc._id}  [${tz}]`)
    console.log(`    before: ${oldDate.toISOString()}  →  shows as ${fmt(oldDate, tz)}`)
    console.log(`    after : ${newDate.toISOString()}  →  shows as ${fmt(newDate, tz)}  (shifted ${deltaHours}h)`)

    if (APPLY) {
      await ScheduledPost.updateOne({ _id: doc._id }, { $set: { scheduledAt: newDate } })
    }
  }

  console.log(`\nSummary: ${changed} to correct, ${skipped} already correct (UTC / no shift).`)
  if (!APPLY && changed > 0) {
    console.log('\nReview the changes above, then re-run with --apply to write them.')
  }
  if (APPLY) {
    console.log('\nDone. Corrections written.')
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
