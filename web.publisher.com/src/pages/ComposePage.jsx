import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePostState } from '../hooks/usePostState'
import { useAppData } from '../contexts/AppDataContext'
import { getNextScheduleSlot } from '../lib/scheduleUtils'
import ComposerPanel from '../components/ComposerPanel'
import PreviewPanel from '../components/PreviewPanel'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody, PageScroll, PageStat, PageStatsRow } from '../components/PageShell'

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
        title={post.editingDraftId ? 'Edit Draft' : 'Compose'}
        subtitle="Write once · preview every platform · publish or schedule"
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
          </div>
        }
      />

      <PageStatsRow>
        <PageStat label="Drafts" value={app.drafts.length} tone="amber" />
        <PageStat label="Queue" value={app.queue.length} tone="violet" />
        <PageStat label="Mode" value={post.state.publishMode === 'schedule' ? 'Schedule' : 'Publish'} />
        <PageStat
          label="Platforms"
          value={Object.values(post.state.platforms || {}).filter(Boolean).length}
          tone="emerald"
        />
      </PageStatsRow>

      {post.editingDraftId && (
        <div className="saas-info-banner saas-info-banner--amber mb-3 flex shrink-0 items-center justify-between gap-2 py-2">
          <span className="draft-badge">Editing draft</span>
          <span className="truncate text-xs text-slate-300">{editingTitle}</span>
          <Link to="/drafts" className="shrink-0 text-xs font-medium text-amber-300 hover:text-amber-200">
            All drafts →
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
