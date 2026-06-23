import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { PLATFORM_META } from '../lib/constants'
import {
  POLL_PLATFORMS,
  POLL_MIN_OPTIONS,
  POLL_DURATION_OPTIONS,
  maxPollOptionsForPlatforms,
} from '../lib/pollUtils'
import { parseBulkPolls } from '../lib/bulkPollParse'
import { computeScheduleDate } from '../lib/bulkParse'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody, PageScroll } from '../components/PageShell'
import PlatformIcon from '../components/PlatformIcon'

const SAMPLE = `Poll 1 (Day 1)
What should we build next?
- Dark mode
- Mobile app
- Public API

Poll 2 (Day 2)
Which day works best for a live webinar?
- Tuesday
- Wednesday
- Thursday`

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function formatWhen(date) {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function BulkPollsPage() {
  const app = useAppData()
  const [raw, setRaw] = useState('')
  const [startDate, setStartDate] = useState(todayIso)
  const [platforms, setPlatforms] = useState({ linkedin: true, reddit: false })
  const [durationDays, setDurationDays] = useState(3)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  const parsed = useMemo(() => (raw.trim() ? parseBulkPolls(raw) : []), [raw])

  const enabledPlatforms = useMemo(
    () => POLL_PLATFORMS.filter((p) => platforms[p]),
    [platforms],
  )

  const redditOn = platforms.reddit
  const multipleEffective = allowMultiple && !redditOn
  const optionCap = maxPollOptionsForPlatforms(platforms)
  const durationOptions = redditOn
    ? POLL_DURATION_OPTIONS.filter((d) => d.days <= 7)
    : POLL_DURATION_OPTIONS

  const pollIssue = useCallback(
    (poll) => {
      const question = (poll.question || '').trim()
      const options = (poll.options || []).map((o) => o.trim()).filter(Boolean)
      if (!question) return 'Add a question'
      if (question.length > 140) return 'Question must be ≤ 140 characters'
      if (options.length < POLL_MIN_OPTIONS) return `Add at least ${POLL_MIN_OPTIONS} options`
      if (options.length > optionCap) return `Max ${optionCap} options for selected platforms`
      return null
    },
    [optionCap],
  )

  const invalidCount = useMemo(
    () => parsed.filter((p) => pollIssue(p)).length,
    [parsed, pollIssue],
  )

  // Auto per-day scheduling: each poll's day number is its slot from the start date.
  const dateRange = useMemo(() => {
    if (!parsed.length) return null
    const days = parsed.map((p) => p.dayNum)
    const first = computeScheduleDate(startDate, Math.min(...days))
    const last = computeScheduleDate(startDate, Math.max(...days))
    return { first, last }
  }, [parsed, startDate])

  const canSchedule =
    parsed.length > 0 && invalidCount === 0 && enabledPlatforms.length > 0 && !scheduling

  const togglePlatform = (key) => {
    setPlatforms((p) => {
      const next = { ...p, [key]: !p[key] }
      if (key === 'reddit' && next.reddit) setAllowMultiple(false)
      return next
    })
  }

  const handleSchedule = useCallback(async () => {
    setScheduling(true)
    const result = await app.scheduleBulkPolls({
      polls: parsed,
      platforms: enabledPlatforms,
      startDate,
      timezone: TZ,
      durationDays: redditOn ? Math.min(7, durationDays) : durationDays,
      allowMultiple,
    })
    setScheduling(false)
    if (result?.ok) setRaw('')
  }, [app, parsed, enabledPlatforms, startDate, durationDays, allowMultiple, redditOn])

  return (
    <PageShell>
      <PageHeader
        title="Bulk Polls"
        subtitle="Paste a series of polls · auto-scheduled one per day · LinkedIn & Reddit"
        action={
          <Link to="/scheduled" className="btn-secondary px-3 py-1.5 text-xs">
            View queue
          </Link>
        }
      />

      <PageBody className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <PageScroll className="space-y-3 lg:col-span-1">
          <section className="surface-panel rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Polls</h2>
              <button
                type="button"
                className="text-[11px] text-violet-400 hover:text-violet-300"
                onClick={() => setRaw(SAMPLE)}
              >
                Load sample
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              One block per poll, separated by a blank line. Optional header{' '}
              <code className="text-slate-400">Poll 1 (Day 1)</code> sets the day; otherwise polls
              auto-number one per day in order. Then the question, then{' '}
              <code className="text-slate-400">- option</code> lines.
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={SAMPLE}
              rows={16}
              className="mt-3 w-full resize-y rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
          </section>

          <section className="surface-panel rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white">Schedule</h2>
            <label className="mt-3 block text-[11px] text-slate-500">Day 1 starts on</label>
            <input
              type="date"
              value={startDate}
              min={todayIso()}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              One poll per day at 12:00 PM local ({TZ}). Day N = start date + (N − 1) days.
              {dateRange && (
                <span className="mt-1 block text-emerald-400/90">
                  {parsed.length} poll{parsed.length === 1 ? '' : 's'} · {formatWhen(dateRange.first)}
                  {parsed.length > 1 ? ` → ${formatWhen(dateRange.last)}` : ''}
                </span>
              )}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="block text-[11px] text-slate-500">Duration</label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
                >
                  {durationOptions.map((d) => (
                    <option key={d.days} value={d.days} className="bg-[#12151f]">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={multipleEffective}
                    disabled={redditOn}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="shrink-0 rounded border-white/20 bg-white/5"
                  />
                  <span className="min-w-0">
                    Allow multiple choices
                    {redditOn && (
                      <span className="block text-[10px] text-slate-500">LinkedIn only</span>
                    )}
                  </span>
                </label>
              </div>
            </div>

            <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Platforms
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {POLL_PLATFORMS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                    platforms[key]
                      ? 'bg-violet-500/15 text-white ring-violet-500/40'
                      : 'bg-white/[0.02] text-slate-500 ring-white/[0.06]'
                  }`}
                >
                  <PlatformIcon platform={key} size="sm" />
                  {PLATFORM_META[key]?.label || key}
                </button>
              ))}
            </div>
            {enabledPlatforms.length === 0 && (
              <p className="mt-2 text-[11px] text-amber-500/90">
                Enable LinkedIn and/or Reddit to schedule polls.
              </p>
            )}

            <button
              type="button"
              disabled={!canSchedule}
              onClick={handleSchedule}
              className="btn-primary mt-4 w-full py-2.5 text-sm disabled:opacity-50"
            >
              {scheduling
                ? 'Scheduling…'
                : `Schedule ${parsed.length || 0} poll${parsed.length === 1 ? '' : 's'}`}
            </button>
            {parsed.length > 0 && invalidCount > 0 && (
              <p className="mt-2 text-center text-[11px] text-amber-500/90">
                {invalidCount} poll{invalidCount === 1 ? '' : 's'} need fixing before scheduling.
              </p>
            )}

            {!app.isLivePublishing() && (
              <p className="mt-2 text-center text-[11px] text-amber-500/90">
                Set VITE_API_BASE_URL for MongoDB-backed scheduling.
              </p>
            )}
          </section>
        </PageScroll>

        <PageScroll className="lg:col-span-1">
          <section className="surface-panel min-h-[200px] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white">
              Preview <span className="text-slate-500">({parsed.length})</span>
            </h2>
            {parsed.length === 0 ? (
              <p className="mt-8 text-center text-xs text-slate-500">Parsed polls appear here</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {parsed.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    when={computeScheduleDate(startDate, poll.dayNum)}
                    issue={pollIssue(poll)}
                    multiple={multipleEffective}
                    durationDays={redditOn ? Math.min(7, durationDays) : durationDays}
                    platforms={enabledPlatforms}
                  />
                ))}
              </ul>
            )}
          </section>
        </PageScroll>
      </PageBody>
    </PageShell>
  )
}

function PollCard({ poll, when, issue, multiple, durationDays, platforms }) {
  const options = (poll.options || []).map((o) => o.trim()).filter(Boolean)
  const durationLabel =
    POLL_DURATION_OPTIONS.find((d) => d.days === durationDays)?.label || `${durationDays} days`

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-gradient-to-b from-white/[0.04] to-transparent ${
        issue ? 'border-amber-500/40' : 'border-white/[0.08]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300 ring-1 ring-violet-500/30">
          Day {poll.dayNum}
        </span>
        <span className="text-[10px] text-slate-400">{formatWhen(when)}</span>
      </div>

      <div className="p-3">
        <p className="text-sm font-semibold leading-snug text-white">
          {poll.question || '(no question)'}
        </p>

        <div className="mt-3 space-y-1.5">
          {options.length === 0 ? (
            <p className="text-[11px] text-amber-500/90">No options yet</p>
          ) : (
            options.map((opt, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border border-violet-400/60 ${
                    multiple ? 'rounded-[4px]' : 'rounded-full'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 bg-violet-400/70 ${multiple ? 'rounded-[1px]' : 'rounded-full'}`}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{opt}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span className="rounded-md bg-white/[0.05] px-2 py-0.5">{durationLabel}</span>
          <span className="rounded-md bg-white/[0.05] px-2 py-0.5">
            {multiple ? 'Multiple choice' : 'Single choice'}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            {platforms.map((p) => (
              <PlatformIcon key={p} platform={p} size="sm" />
            ))}
          </span>
        </div>

        {issue && <p className="mt-2 text-[11px] text-amber-500/90">⚠ {issue}</p>}
      </div>
    </li>
  )
}
