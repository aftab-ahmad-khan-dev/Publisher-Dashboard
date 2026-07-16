import { useMemo, useState } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { PlatformIconGroup } from '../components/PlatformIcon'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody, PageStatsRow, PageStat, ContentCard } from '../components/PageShell'
import PostPreviewModal from '../components/PostPreviewModal'
import { formatScheduledISO } from '../lib/scheduleUtils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  const { queue } = useAppData()
  const [cursor, setCursor] = useState(() => new Date())
  const [previewing, setPreviewing] = useState(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const postsByDay = useMemo(() => {
    const map = {}
    queue.forEach((item) => {
      const d = new Date(item.scheduledAt)
      const key = dateKey(d)
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return map
  }, [queue])

  const days = useMemo(() => {
    const first = new Date(year, month, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d))
    }
    return cells
  }, [year, month])

  const selectedKey = dateKey(cursor)
  const selectedPosts = postsByDay[selectedKey] || []
  const daysWithPosts = Object.keys(postsByDay).filter((k) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length

  const prevMonth = () => setCursor(new Date(year, month - 1, 1))
  const nextMonth = () => setCursor(new Date(year, month + 1, 1))

  return (
    <PageShell>
      <PageHeader title="Calendar" subtitle="Visual timeline of your publishing schedule" />

      <PageStatsRow>
        <PageStat label="Scheduled" value={queue.length} tone="violet" />
        <PageStat label="This month" value={daysWithPosts} hint="Days with posts" tone="amber" />
        <PageStat label="Selected day" value={selectedPosts.length} hint="Posts on this date" />
        <PageStat label="Default time" value="12:00 PM" tone="emerald" />
      </PageStatsRow>

      <PageBody className="saas-calendar-shell min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <ContentCard className="flex min-h-[320px] flex-col lg:min-h-0 lg:overflow-hidden">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white">
              {MONTHS[month]} <span className="text-slate-500">{year}</span>
            </h3>
            <div className="flex gap-1">
              <button type="button" onClick={prevMonth} className="btn-icon" aria-label="Previous month">
                ‹
              </button>
              <button type="button" onClick={() => setCursor(new Date())} className="btn-secondary px-2.5 py-1 text-[10px]">
                Today
              </button>
              <button type="button" onClick={nextMonth} className="btn-icon" aria-label="Next month">
                ›
              </button>
            </div>
          </div>

          <div className="mb-2 grid shrink-0 grid-cols-7 gap-1 text-center text-[8px] font-bold uppercase tracking-wider text-slate-500 sm:text-[9px]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="truncate px-0.5">
                <span className="sm:hidden">{d.slice(0, 1)}</span>
                <span className="hidden sm:inline">{d}</span>
              </div>
            ))}
          </div>

          <div className="saas-calendar-grid">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />

              const key = dateKey(day)
              const posts = postsByDay[key] || []
              const isToday = dateKey(new Date()) === key
              const isSelected = dateKey(cursor) === key
              const platforms = [...new Set(posts.flatMap((p) => p.platforms))]

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCursor(day)}
                  className={`saas-calendar-day ${
                    isSelected ? 'saas-calendar-day--selected' : posts.length ? 'calendar-day-has-post' : ''
                  } ${isToday ? 'saas-calendar-day--today' : ''}`}
                >
                  <span className={`text-xs font-bold ${isToday ? 'text-sky-400' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </span>
                  {platforms.length > 0 && (
                    <div className="saas-calendar-day__platforms mt-auto min-w-0 overflow-hidden pt-0.5">
                      <PlatformIconGroup
                        platforms={platforms}
                        size="2xs"
                        maxVisible={2}
                        className="lg:hidden"
                      />
                      <PlatformIconGroup
                        platforms={platforms}
                        size="xs"
                        maxVisible={4}
                        className="hidden lg:flex"
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </ContentCard>

        <ContentCard className="flex flex-col lg:min-h-0 lg:overflow-hidden">
          <h3 className="shrink-0 font-display text-base font-bold text-white">
            {cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>
          <p className="shrink-0 text-[11px] text-slate-500">{selectedPosts.length} post(s) scheduled</p>

          <ul className="scrollbar-none mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {selectedPosts.length === 0 ? (
              <li className="rounded-xl border border-dashed border-white/10 py-10 text-center text-xs text-slate-500">
                No posts on this day
              </li>
            ) : (
              selectedPosts.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setPreviewing(item)} className="saas-list-item">
                    <PlatformIconGroup platforms={item.platforms} size="xs" maxVisible={5} />
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-300">{item.body}</p>
                    <p className="mt-1 text-[10px] font-medium text-indigo-300">
                      {formatScheduledISO(item.scheduledAt, item.timezone)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </ContentCard>
      </PageBody>

      <PostPreviewModal open={!!previewing} item={previewing} onClose={() => setPreviewing(null)} />
    </PageShell>
  )
}
