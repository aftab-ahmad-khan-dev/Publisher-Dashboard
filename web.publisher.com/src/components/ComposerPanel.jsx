import PlatformSelector from './PlatformSelector'
import CommunityContentGuide from './CommunityContentGuide'
import CharacterCounter from './CharacterCounter'
import ImageUploader from './ImageUploader'
import HashtagManager from './HashtagManager'
import PublishControls from './PublishControls'
import ScheduleQueue from './ScheduleQueue'
import { containsForbiddenDash } from '../lib/contentSanitize'
import { PLATFORM_META } from '../lib/constants'
import PollEditor from './PollEditor'
import { isPollEnabled } from '../lib/pollUtils'

/** Platforms that cannot publish without an attached image or video. */
const MEDIA_REQUIRED_PLATFORMS = ['instagram', 'pinterest']

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
  setPoll,
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
  const mediaRequiredWithoutImage = state.image
    ? []
    : MEDIA_REQUIRED_PLATFORMS.filter((p) => state.platforms[p]).map(
        (p) => PLATFORM_META[p]?.label || p,
      )

  return (
    <div className="space-y-3">
      <PlatformSelector platforms={state.platforms} togglePlatform={togglePlatform} />

      {mediaRequiredWithoutImage.length > 0 && (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-300/95">
          {mediaRequiredWithoutImage.join(' and ')}{' '}
          {mediaRequiredWithoutImage.length > 1 ? 'require' : 'requires'} an image or video.
          Without one, this post will only reach your other platforms.
        </p>
      )}

      <CommunityContentGuide body={state.body} platforms={state.platforms} />

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
          placeholder="Write once, publish everywhere. For Reddit, lead with helpful insight, not a sales pitch."
          rows={3}
          className="input-premium w-full resize-none py-2 text-sm leading-relaxed"
        />
        <CharacterCounter getFullLength={getFullLength} />
        {containsForbiddenDash(state.body) && (
          <p className="text-[11px] text-rose-400/95">
            Em dashes (—) are not allowed in post copy. Use a comma or period instead.
          </p>
        )}
      </div>

      <PollEditor poll={state.poll} platforms={state.platforms} setPoll={setPoll} />

      {!isPollEnabled(state) && (
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
      )}

      {isPollEnabled(state) && (
        <p className="rounded-lg border border-violet-500/20 bg-violet-500/[0.05] px-3 py-2 text-[11px] text-violet-200/90">
          Image upload is disabled while a poll is active.
        </p>
      )}

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
