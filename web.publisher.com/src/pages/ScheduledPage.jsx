import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'
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
  const { queue, cancelScheduled, cancelAllScheduled, editScheduled } = useAppData()
  const [view, setView] = useState(loadView)
  const [previewing, setPreviewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingAll, setDeletingAll] = useState(false)

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
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => setDeletingAll(true)}
                className="inline-flex items-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
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
