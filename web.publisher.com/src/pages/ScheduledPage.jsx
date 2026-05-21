import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'
import ViewToggle from '../components/ViewToggle'
import { ScheduledPostListCard, ScheduledPostGridCard } from '../components/ScheduledPostCard'

const VIEW_KEY = 'pulse_scheduled_view'

function loadView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export default function ScheduledPage() {
  const { queue, cancelScheduled } = useAppData()
  const [view, setView] = useState(loadView)

  const setViewAndPersist = (v) => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  return (
    <PageShell>
      <PageHeader
        title="Scheduled Posts"
        subtitle={`${queue.length} queued · 12:00 PM default`}
        action={
          <div className="flex items-center gap-2">
            {queue.length > 0 && <ViewToggle view={view} onChange={setViewAndPersist} />}
            <Link to="/compose" className="btn-primary px-3 py-1.5 text-xs">
              + New Post
            </Link>
          </div>
        }
      />

      <PageScroll>
        {queue.length === 0 ? (
          <div className="surface-panel flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl py-12 text-center">
            <p className="font-medium text-slate-200">No scheduled posts yet</p>
            <p className="mt-1 text-xs text-slate-500">Schedule from Compose</p>
            <Link to="/compose" className="btn-secondary mt-4 text-xs">
              Go to Compose
            </Link>
          </div>
        ) : view === 'grid' ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {queue.map((item, i) => (
              <ScheduledPostGridCard
                key={item.id}
                item={item}
                onCancel={cancelScheduled}
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {queue.map((item, i) => (
              <ScheduledPostListCard
                key={item.id}
                item={item}
                onCancel={cancelScheduled}
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </ul>
        )}
      </PageScroll>
    </PageShell>
  )
}
