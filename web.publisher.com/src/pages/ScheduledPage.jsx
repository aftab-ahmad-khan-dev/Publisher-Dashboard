import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { rescheduleMissedRemote } from '../lib/backendApi'
import { showToast } from '../lib/toast'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll, EmptyState, PageStatsRow, PageStat } from '../components/PageShell'
import ViewToggle from '../components/ViewToggle'
import { ScheduledPostListCard, ScheduledPostGridCard } from '../components/ScheduledPostCard'
import EditScheduledModal from '../components/EditScheduledModal'
import ConfirmDialog from '../components/ConfirmDialog'
import PostPreviewModal from '../components/PostPreviewModal'

const VIEW_KEY = 'pulse_scheduled_view'

function loadView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export default function ScheduledPage() {
  const { queue, cancelScheduled, cancelAllScheduled, editScheduled, refreshFromServer } = useAppData()
  const [view, setView] = useState(loadView)
  const [previewing, setPreviewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  const missingImages = queue.filter((item) => item.imageMissing).length

  const handleRescheduleMissed = async () => {
    setRescheduling(true)
    try {
      const result = await rescheduleMissedRemote({ fromToday: true })
      await refreshFromServer?.()
      showToast(`Rescheduled ${result.rescheduled} post(s) from today onward`, 'success')
    } catch (err) {
      showToast(err.message || 'Could not reschedule posts', 'error')
    } finally {
      setRescheduling(false)
    }
  }

  const setViewAndPersist = (v) => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  return (
    <PageShell>
      <PageHeader
        title="Scheduled Posts"
        subtitle="Automatic publishing at your chosen times"
        action={
          <div className="flex items-center gap-2">
            {queue.length > 0 && <ViewToggle view={view} onChange={setViewAndPersist} />}
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => setDeletingAll(true)}
                className="btn-danger px-3 py-1.5 text-xs"
              >
                Delete all
              </button>
            )}
            <Link to="/compose" className="btn-primary px-3 py-1.5 text-xs">
              + New Post
            </Link>
          </div>
        }
      />

      <PageStatsRow>
        <PageStat label="Queued" value={queue.length} tone="violet" hint="12:00 PM default" />
        <PageStat label="View" value={view === 'grid' ? 'Grid' : 'List'} />
        <PageStat label="Status" value="Auto-publish" tone="emerald" hint="Scheduler runs every 30s" />
        <PageStat label="Timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()} />
      </PageStatsRow>

      {missingImages > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          <strong className="font-semibold">{missingImages} post(s)</strong> are missing images.
          Re-upload via{' '}
          <Link to="/bulk" className="text-amber-200 underline underline-offset-2 hover:text-white">
            Bulk Upload
          </Link>{' '}
          to restore them, then use Reschedule from today.
        </div>
      )}

      {queue.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRescheduleMissed}
            disabled={rescheduling}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            {rescheduling ? 'Rescheduling…' : 'Reschedule from today'}
          </button>
        </div>
      )}

      <PageScroll>
        {queue.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="No scheduled posts yet"
            description="Schedule from Compose or bulk upload. Posts publish automatically at your chosen time."
            action={
              <Link to="/compose" className="btn-primary px-4 py-2 text-xs">
                Go to Compose
              </Link>
            }
          />
        ) : view === 'grid' ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {queue.map((item, i) => (
              <ScheduledPostGridCard
                key={item.id}
                item={item}
                onPreview={setPreviewing}
                onEdit={setEditing}
                onDelete={setDeleting}
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
                onPreview={setPreviewing}
                onEdit={setEditing}
                onDelete={setDeleting}
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </ul>
        )}
      </PageScroll>

      <PostPreviewModal
        open={!!previewing}
        item={previewing}
        onClose={() => setPreviewing(null)}
      />

      <EditScheduledModal
        open={!!editing}
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(updates) => editScheduled(editing.id, updates)}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => cancelScheduled(deleting.id)}
        title="Delete scheduled post?"
        message="This post will be removed from your queue and won't be published. This can't be undone."
        confirmLabel="Delete post"
        destructive
      />

      <ConfirmDialog
        open={deletingAll}
        onClose={() => setDeletingAll(false)}
        onConfirm={() => cancelAllScheduled()}
        title="Delete all scheduled posts?"
        message={`This will remove all ${queue.length} posts from your queue. They won't be published. This can't be undone.`}
        confirmLabel="Delete all"
        destructive
      />
    </PageShell>
  )
}
