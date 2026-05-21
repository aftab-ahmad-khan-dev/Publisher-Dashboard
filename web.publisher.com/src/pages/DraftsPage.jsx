import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { PlatformIconGroup } from '../components/PlatformIcon'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll } from '../components/PageShell'
import ViewToggle from '../components/ViewToggle'
import { formatDraftDate } from '../lib/draftUtils'

const VIEW_KEY = 'pulse_drafts_view'

function loadView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export default function DraftsPage() {
  const { drafts, deleteDraft } = useAppData()
  const navigate = useNavigate()
  const [view, setView] = useState(loadView)

  const setViewAndPersist = (v) => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  const openDraft = (id) => {
    navigate('/compose', { state: { draftId: id } })
  }

  return (
    <PageShell>
      <PageHeader
        title="Drafts"
        subtitle={`${drafts.length} saved`}
        action={
          <div className="flex items-center gap-2">
            {drafts.length > 0 && <ViewToggle view={view} onChange={setViewAndPersist} />}
            <Link to="/compose" className="btn-primary px-3 py-1.5 text-xs">
              + New Post
            </Link>
          </div>
        }
      />

      <PageScroll>
        {drafts.length === 0 ? (
          <div className="surface-panel flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl py-12 text-center">
            <p className="font-medium text-slate-200">No drafts yet</p>
            <Link to="/compose" className="btn-secondary mt-4 text-xs">
              Start composing
            </Link>
          </div>
        ) : view === 'grid' ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {drafts.map((draft, i) => (
              <DraftGridCard
                key={draft.id}
                draft={draft}
                onEdit={() => openDraft(draft.id)}
                onDelete={() => deleteDraft(draft.id)}
                delay={i * 30}
              />
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {drafts.map((draft, i) => (
              <DraftListCard
                key={draft.id}
                draft={draft}
                onEdit={() => openDraft(draft.id)}
                onDelete={() => deleteDraft(draft.id)}
                delay={i * 30}
              />
            ))}
          </ul>
        )}
      </PageScroll>
    </PageShell>
  )
}

function DraftGridCard({ draft, onEdit, onDelete, delay }) {
  const platforms = Object.entries(draft.platforms || {})
    .filter(([, on]) => on)
    .map(([p]) => p)

  return (
    <li className="draft-grid-card group flex flex-col" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <span className="draft-badge shrink-0">Draft</span>
        <PlatformIconGroup platforms={platforms} size="sm" />
      </div>
      <button type="button" onClick={onEdit} className="mt-2 flex-1 text-left">
        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-fuchsia-200">
          {draft.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{draft.body || 'Empty draft'}</p>
      </button>
      <p className="mt-2 text-[10px] text-slate-600">{formatDraftDate(draft.updatedAt)}</p>
      <div className="mt-2 flex gap-2 border-t border-white/[0.06] pt-2">
        <button type="button" onClick={onEdit} className="btn-secondary min-h-0 flex-1 py-1 text-[10px]">
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="min-h-0 flex-1 rounded-lg py-1 text-[10px] font-semibold text-rose-400 ring-1 ring-rose-500/25 hover:bg-rose-500/10"
        >
          Delete
        </button>
      </div>
    </li>
  )
}

function DraftListCard({ draft, onEdit, onDelete, delay }) {
  const platforms = Object.entries(draft.platforms || {})
    .filter(([, on]) => on)
    .map(([p]) => p)

  return (
    <li className="draft-card group" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <PlatformIconGroup platforms={platforms} size="sm" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{draft.title}</h3>
            <p className="truncate text-xs text-slate-500">{formatDraftDate(draft.updatedAt)}</p>
          </div>
        </button>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onEdit} className="btn-secondary px-2 py-1 text-[10px]">
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-400 ring-1 ring-rose-500/25 hover:bg-rose-500/10"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}
