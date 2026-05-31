import { useMemo, useState } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { PlatformIconGroup } from '../components/PlatformIcon'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody } from '../components/PageShell'
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

  const prevMonth = () => setCursor(new Date(year, month - 1, 1))
  const nextMonth = () => setCursor(new Date(year, month + 1, 1))

  return (
    <PageShell>
      <PageHeader title="Calendar" subtitle={`${queue.length} scheduled · 12:00 PM`} />

      <PageBody className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto lg:grid-cols-3 lg:gap-3 lg:overflow-hidden">
        <div className="surface-panel flex flex-col rounded-xl p-3 lg:col-span-2 lg:min-h-0 lg:overflow-hidden lg:p-4">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              {MONTHS[month]} <span className="text-slate-500">{year}</span>
            </h3>
            <div className="flex gap-1">
              <button type="button" onClick={prevMonth} className="btn-icon" aria-label="Previous month">
                ‹
              </button>
              <button type="button" onClick={() => setCursor(new Date())} className="btn-secondary px-2 py-1 text-[10px]">
                Today
              </button>
              <button type="button" onClick={nextMonth} className="btn-icon" aria-label="Next month">
                ›
              </button>
            </div>
          </div>

          <div className="mb-1 grid shrink-0 grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-slate-500">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-7 gap-1">
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
                  className={`calendar-day flex min-h-[2.75rem] flex-col rounded-lg p-1 text-left transition-all lg:min-h-0 ${
                    isSelected
                      ? 'bg-violet-600/25 ring-1 ring-fuchsia-500/50'
                      : posts.length
                        ? 'calendar-day-has-post'
                        : 'hover:bg-white/[0.04]'
                  } ${isToday ? 'ring-1 ring-fuchsia-400/40' : ''}`}
                >
                  <span className={`text-xs font-bold ${isToday ? 'text-fuchsia-400' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </span>
                  {platforms.length > 0 && (
                    <div className="mt-auto pt-0.5">
                      <PlatformIconGroup platforms={platforms} size="xs" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="surface-panel flex flex-col rounded-xl p-3 lg:min-h-0 lg:overflow-hidden lg:p-4">
          <h3 className="shrink-0 font-display text-sm font-bold text-white">
            {cursor.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </h3>
          <p className="shrink-0 text-[10px] text-slate-500">{selectedPosts.length} post(s)</p>

          <ul className="scrollbar-none mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {selectedPosts.length === 0 ? (
              <li className="rounded-lg border border-dashed border-white/10 py-8 text-center text-xs text-slate-500">
                No posts this day
              </li>
            ) : (
              selectedPosts.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setPreviewing(item)}
                    className="w-full rounded-lg border border-white/[0.07] bg-black/20 p-2.5 text-left transition-colors hover:border-violet-500/30 hover:bg-white/[0.04]"
                  >
                    <PlatformIconGroup platforms={item.platforms} size="xs" />
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-300">{item.body}</p>
                    <p className="mt-1 text-[10px] text-violet-300">
                      {formatScheduledISO(item.scheduledAt, item.timezone)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </PageBody>

      <PostPreviewModal
        open={!!previewing}
        item={previewing}
        onClose={() => setPreviewing(null)}
      />
    </PageShell>
  )
}
