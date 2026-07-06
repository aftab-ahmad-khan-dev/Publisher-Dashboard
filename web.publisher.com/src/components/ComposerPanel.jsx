import PlatformSelector from './PlatformSelector'
import CommunityContentGuide from './CommunityContentGuide'
import CharacterCounter from './CharacterCounter'
import ImageUploader from './ImageUploader'
import HashtagManager from './HashtagManager'
import PublishControls from './PublishControls'
import ScheduleQueue from './ScheduleQueue'
import PostBodyEditor from './PostBodyEditor'
import { containsForbiddenDash, forbiddenDashMessage } from '../lib/contentSanitize'
import { PLATFORM_META } from '../lib/constants'
import PollEditor from './PollEditor'
import MultiPostPreview from './MultiPostPreview'
import { isPollEnabled } from '../lib/pollUtils'
import { isMultiPostComposer } from '../lib/composerPosts'

/** Platforms that cannot publish without an attached image or video. */
const MEDIA_REQUIRED_PLATFORMS = ['instagram']

export default function ComposerPanel({
  state,
  setBody,
  addMediaFiles,
  removeMedia,
  setActiveMedia,
  clearMedia,
  setCropHint,
  toggleImageVisibility,
  togglePlatform,
  addHashtag,
  removeHashtag,
  toggleHashtagPlatform,
  setPublishMode,
  setScheduledAt,
  setTimezone,
  setScheduleByDay,
  setScheduleStartDate,
  setScheduleDayNum,
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
  const mediaRequiredWithoutImage = state.mediaItems?.length
    ? []
    : MEDIA_REQUIRED_PLATFORMS.filter((p) => state.platforms[p]).map(
        (p) => PLATFORM_META[p]?.label || p,
      )

  return (
    <div className="space-y-4">
      <PlatformSelector platforms={state.platforms} togglePlatform={togglePlatform} />

      {mediaRequiredWithoutImage.length > 0 && (
        <div className="notice-banner notice-banner--amber">
          {mediaRequiredWithoutImage.join(' and ')}{' '}
          {mediaRequiredWithoutImage.length > 1 ? 'require' : 'requires'} an image or video.
          Without one, this post will only reach your other platforms.
        </div>
      )}

      <CommunityContentGuide body={state.body} platforms={state.platforms} />

      <div className="composer-section">
        <label htmlFor="post-body" className="composer-section-title">
          Post body
        </label>
        <PostBodyEditor
          id="post-body"
          value={state.body}
          onChange={setBody}
          placeholder={`Write once, publish everywhere — or use numbered blocks:\n\nDay 1\nCaption for day one…\n\nDay 2\nSecond caption…\n\n(Also works: Post 1 (Day 1), including Unicode bold 𝗗𝗮𝘆 𝟭 headers)`}
          rows={5}
        />
        <CharacterCounter getFullLength={getFullLength} />
        {containsForbiddenDash(state.body) && (
          <div className="notice-banner border-rose-500/30 bg-rose-500/[0.08] text-rose-200/95">
            {forbiddenDashMessage()}
          </div>
        )}
      </div>

      {!isPollEnabled(state) && (
        <ImageUploader
          mediaItems={state.mediaItems}
          activeMediaId={state.activeMediaId}
          image={state.image}
          imagePreviewUrl={state.imagePreviewUrl}
          imageType={state.imageType}
          cropHint={state.cropHint}
          imageVisibility={state.imageVisibility}
          platforms={state.platforms}
          addMediaFiles={addMediaFiles}
          removeMedia={removeMedia}
          setActiveMedia={setActiveMedia}
          clearMedia={clearMedia}
          setCropHint={setCropHint}
          toggleImageVisibility={toggleImageVisibility}
        />
      )}

      {!isPollEnabled(state) && isMultiPostComposer(state) && (
        <MultiPostPreview state={state} />
      )}

      <PollEditor
        poll={state.poll}
        platforms={state.platforms}
        setPoll={setPoll}
        scheduleContext={state}
      />

      {isPollEnabled(state) && isMultiPostComposer(state) && (
        <MultiPostPreview state={state} />
      )}

      {isPollEnabled(state) && !isMultiPostComposer(state) && (
        <div className="notice-banner notice-banner--violet">
          Image upload is disabled while a poll is active.
        </div>
      )}

      {isPollEnabled(state) && isMultiPostComposer(state) && (
        <div className="notice-banner notice-banner--violet">
          Multi-day poll series — each post publishes on its Day N with the poll attached.
        </div>
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
        setScheduleByDay={setScheduleByDay}
        setScheduleStartDate={setScheduleStartDate}
        setScheduleDayNum={setScheduleDayNum}
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
