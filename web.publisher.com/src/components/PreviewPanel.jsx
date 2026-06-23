import InstagramPreview from './InstagramPreview'
import FacebookPreview from './FacebookPreview'
import LinkedInPreview from './LinkedInPreview'
import RedditPreview from './RedditPreview'
import PinterestPreview from './PinterestPreview'
import ThreadsPreview from './ThreadsPreview'

function getHashtagString(hashtags, platform) {
  return hashtags
    .filter((h) => h.platforms[platform])
    .map((h) => h.tag)
    .join(' ')
}

export default function PreviewPanel({ state, compact = false }) {
  const previewKey = [
    state.body,
    state.hashtags.map((h) => `${h.tag}-${Object.entries(h.platforms).map(([k, v]) => `${k}:${v}`).join('-')}`).join(','),
    state.imagePreviewUrl,
    state.cropHint,
    JSON.stringify(state.imageVisibility),
    JSON.stringify(state.platforms),
  ].join('|')

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'} key={previewKey}>
      <div className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <h2 className="font-display text-sm font-bold text-white">Live Preview</h2>
        <p className="text-[10px] text-slate-500">Tap platform to expand</p>
      </div>

      <InstagramPreview
        enabled={state.platforms.instagram}
        body={state.body}
        hashtags={getHashtagString(state.hashtags, 'instagram')}
        imagePreviewUrl={state.imagePreviewUrl}
        imageType={state.imageType}
        showImage={state.imageVisibility.instagram}
        cropHint={state.cropHint}
        compact={compact}
      />

      <FacebookPreview
        enabled={state.platforms.facebook}
        body={state.body}
        hashtags={getHashtagString(state.hashtags, 'facebook')}
        imagePreviewUrl={state.imagePreviewUrl}
        imageType={state.imageType}
        showImage={state.imageVisibility.facebook}
        cropHint={state.cropHint}
        compact={compact}
      />

      <LinkedInPreview
        enabled={state.platforms.linkedin}
        body={state.body}
        hashtags={getHashtagString(state.hashtags, 'linkedin')}
        imagePreviewUrl={state.imagePreviewUrl}
        imageType={state.imageType}
        showImage={state.imageVisibility.linkedin}
        cropHint={state.cropHint}
        poll={state.poll}
        compact={compact}
      />

      <RedditPreview enabled={state.platforms.reddit} body={state.body} poll={state.poll} />

      <PinterestPreview
        enabled={state.platforms.pinterest}
        body={state.body}
        imagePreviewUrl={state.imagePreviewUrl}
      />

      <ThreadsPreview enabled={state.platforms.threads} body={state.body} />
    </div>
  )
}
