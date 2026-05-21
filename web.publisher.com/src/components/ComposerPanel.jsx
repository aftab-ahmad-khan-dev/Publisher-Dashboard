import PlatformSelector from './PlatformSelector'
import CharacterCounter from './CharacterCounter'
import ImageUploader from './ImageUploader'
import HashtagManager from './HashtagManager'
import PublishControls from './PublishControls'
import ScheduleQueue from './ScheduleQueue'

export default function ComposerPanel({
  state,
  setBody,
  setImage,
  setCropHint,
  toggleImageVisibility,
  togglePlatform,
  addHashtag,
  removeHashtag,
  toggleHashtagPlatform,
  setPublishMode,
  setScheduledAt,
  setTimezone,
  hashtagCounts,
  getFullLength,
  publishStatus,
  publishNow,
  schedulePost,
  onScheduleSuccess,
  onSaveDraft,
  editingDraftId,
  draftSaving,
  showQueue = true,
  queue = [],
}) {
  return (
    <div className="space-y-3">
      <PlatformSelector platforms={state.platforms} togglePlatform={togglePlatform} />

      <div className="space-y-2">
        <label
          htmlFor="post-body"
          className="text-xs font-medium uppercase tracking-wider text-slate-500"
        >
          Post body
        </label>
        <textarea
          id="post-body"
          value={state.body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write once — publish everywhere. What's on your mind?"
          rows={3}
          className="input-premium w-full resize-none py-2 text-sm leading-relaxed"
        />
        <CharacterCounter getFullLength={getFullLength} />
      </div>

      <ImageUploader
        image={state.image}
        imagePreviewUrl={state.imagePreviewUrl}
        imageType={state.imageType}
        cropHint={state.cropHint}
        imageVisibility={state.imageVisibility}
        setImage={setImage}
        setCropHint={setCropHint}
        toggleImageVisibility={toggleImageVisibility}
      />

      <HashtagManager
        hashtags={state.hashtags}
        hashtagCounts={hashtagCounts}
        addHashtag={addHashtag}
        removeHashtag={removeHashtag}
        toggleHashtagPlatform={toggleHashtagPlatform}
      />

      <PublishControls
        state={state}
        status={publishStatus}
        queue={queue}
        setPublishMode={setPublishMode}
        setScheduledAt={setScheduledAt}
        setTimezone={setTimezone}
        publishNow={publishNow}
        schedulePost={schedulePost}
        onScheduleSuccess={onScheduleSuccess}
        onSaveDraft={onSaveDraft}
        editingDraftId={editingDraftId}
        draftSaving={draftSaving}
      />

      {showQueue && queue.length > 0 && <ScheduleQueue queue={queue} />}
    </div>
  )
}
