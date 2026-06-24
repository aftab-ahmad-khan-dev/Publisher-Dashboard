import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePostState } from '../hooks/usePostState'
import { useAppData } from '../contexts/AppDataContext'
import { getNextScheduleSlot } from '../lib/scheduleUtils'
import ComposerPanel from '../components/ComposerPanel'
import PreviewPanel from '../components/PreviewPanel'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody, PageScroll } from '../components/PageShell'

export default function ComposePage() {
  const post = usePostState()
  const app = useAppData()
  const location = useLocation()
  const [draftSaving, setDraftSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    app.requestNotificationPermission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const draftId = location.state?.draftId
    if (!draftId) return
    const draft = app.getDraftById(draftId)
    if (draft) post.loadDraft(draft)
    window.history.replaceState({}, document.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.draftId])

  const handlePublishNow = async (state) => {
    const result = await app.publishNow(state)
    if (result?.ok && !result?.partial) post.resetComposer()
  }

  const handleScheduleSuccess = (updatedQueue) => {
    post.setScheduledAt(getNextScheduleSlot(updatedQueue, app.apiConfig?.defaults?.scheduleTime))
  }

  const handleSaveDraft = async () => {
    setDraftSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    const result = app.saveDraft(post.state, post.editingDraftId)
    setDraftSaving(false)
    if (result?.ok && !post.editingDraftId) {
      post.setEditingDraftId(result.draft.id)
    }
  }

  const editingTitle = post.editingDraftId
    ? app.getDraftById(post.editingDraftId)?.title
    : null

  return (
    <PageShell>
      <PageHeader
        title={post.editingDraftId ? 'Edit Draft' : 'New Post'}
        subtitle="Compose · preview · publish"
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPreview((s) => !s)}
              className="btn-secondary px-2 py-1 text-[10px] lg:hidden"
            >
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            {post.editingDraftId && (
              <button type="button" onClick={() => post.resetComposer()} className="btn-secondary px-2 py-1 text-[10px]">
                New
              </button>
            )}
            <StatPill label="Drafts" value={String(app.drafts.length)} accent={app.drafts.length > 0} />
            <StatPill label="Queue" value={String(app.queue.length)} accent />
          </div>
        }
      />

      {post.editingDraftId && (
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs">
          <span className="draft-badge">Editing</span>
          <span className="truncate text-slate-400">{editingTitle}</span>
          <Link to="/drafts" className="shrink-0 text-amber-400/90 hover:text-amber-300">
            Drafts →
          </Link>
        </div>
      )}

      <PageBody className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
        <PageScroll className="min-w-0 lg:w-[58%]">
          <div className="compose-panel">
            <ComposerPanel
              state={post.state}
              setBody={post.setBody}
              addMediaFiles={post.addMediaFiles}
              removeMedia={post.removeMedia}
              setActiveMedia={post.setActiveMedia}
              clearMedia={post.clearMedia}
              setCropHint={post.setCropHint}
              toggleImageVisibility={post.toggleImageVisibility}
              togglePlatform={post.togglePlatform}
              addHashtag={post.addHashtag}
              removeHashtag={post.removeHashtag}
              toggleHashtagPlatform={post.toggleHashtagPlatform}
              setPublishMode={post.setPublishMode}
              setScheduledAt={post.setScheduledAt}
              setTimezone={post.setTimezone}
              setScheduleByDay={post.setScheduleByDay}
              setScheduleStartDate={post.setScheduleStartDate}
              setScheduleDayNum={post.setScheduleDayNum}
              setPoll={post.setPoll}
              hashtagCounts={post.hashtagCounts}
              getFullLength={post.getFullLength}
              publishStatus={app.publishStatus}
              publishNow={handlePublishNow}
              schedulePost={app.schedulePost}
              onScheduleSuccess={handleScheduleSuccess}
              onSaveDraft={handleSaveDraft}
              editingDraftId={post.editingDraftId}
              draftSaving={draftSaving}
              queue={app.queue}
              showQueue={false}
            />
          </div>
        </PageScroll>

        <PageScroll className={`min-w-0 ${showPreview ? 'block' : 'hidden'} lg:block lg:w-[42%]`}>
          <div className="compose-preview-panel">
            <PreviewPanel state={post.state} compact />
          </div>
        </PageScroll>
      </PageBody>
    </PageShell>
  )
}

function StatPill({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-center">
      <p className={`font-display text-sm font-bold leading-none ${accent ? 'text-gradient' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}
