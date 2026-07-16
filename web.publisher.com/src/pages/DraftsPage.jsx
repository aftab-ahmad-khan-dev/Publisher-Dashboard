import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { PlatformIconGroup } from '../components/PlatformIcon'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll, PageStatsRow, PageStat, EmptyState } from '../components/PageShell'
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

  const withPlatforms = drafts.filter((d) =>
    Object.values(d.platforms || {}).some(Boolean),
  ).length

  return (
    <PageShell>
      <PageHeader
        title="Drafts"
        subtitle="Saved compositions ready to finish and publish"
        action={
          <div className="flex items-center gap-2">
            {drafts.length > 0 && <ViewToggle view={view} onChange={setViewAndPersist} />}
            <Link to="/compose" className="btn-primary px-3 py-1.5 text-xs">
              + New Post
            </Link>
          </div>
        }
      />

      <PageStatsRow>
        <PageStat label="Total drafts" value={drafts.length} tone="amber" />
        <PageStat label="With platforms" value={withPlatforms} hint="Ready to publish" />
        <PageStat
          label="Latest"
          value={drafts[0] ? formatDraftDate(drafts[0].updatedAt).split(',')[0] : '—'}
          tone="violet"
        />
        <PageStat label="View" value={view === 'grid' ? 'Grid' : 'List'} hint="Toggle in toolbar" />
      </PageStatsRow>

      <PageScroll>
        {drafts.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="No drafts yet"
            description="Save work from Compose to pick up later without losing your caption, platforms, or images."
            action={
              <Link to="/compose" className="btn-primary px-4 py-2 text-xs">
                Start composing
              </Link>
            }
          />
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
        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-sky-200">
          {draft.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{draft.body || 'Empty draft'}</p>
      </button>
      <p className="mt-2 text-[10px] text-slate-600">{formatDraftDate(draft.updatedAt)}</p>
      <div className="mt-2 flex gap-2 border-t border-white/[0.06] pt-2">
        <button type="button" onClick={onEdit} className="btn-secondary min-h-0 flex-1 py-1 text-[10px]">
          Edit
        </button>
        <button type="button" onClick={onDelete} className="btn-danger min-h-0 flex-1 py-1 text-[10px]">
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
          <button type="button" onClick={onDelete} className="btn-danger px-2 py-1 text-[10px]">
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}
