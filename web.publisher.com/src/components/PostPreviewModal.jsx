import { useState } from 'react'
import Modal from './Modal'
import PlatformIcon from './PlatformIcon'
import { PLATFORM_META } from '../lib/constants'
import { useScheduledImageUrl, ScheduledImagePlaceholder } from '../lib/scheduledImage.jsx'
import InstagramPreview from './InstagramPreview'
import FacebookPreview from './FacebookPreview'
import LinkedInPreview from './LinkedInPreview'
import RedditPreview from './RedditPreview'
import PinterestPreview from './PinterestPreview'
import ThreadsPreview from './ThreadsPreview'
import QuoraPreview from './QuoraPreview'

/** Hashtags enabled for a platform, joined into the string the previews expect. */
function hashtagString(hashtags, platform) {
  if (!Array.isArray(hashtags)) return ''
  return hashtags
    .filter((h) => h?.platforms?.[platform])
    .map((h) => h.tag)
    .join(' ')
}

function renderPreview(platform, item, imagePreviewUrl, imageMissing) {
  const body = item.body || ''
  const imageType = item.imageType || 'image'
  const cropHint = item.cropHint || 'square'
  const common = { enabled: true, body, defaultCollapsed: false }

  if (imageMissing && !imagePreviewUrl) {
    return <ScheduledImagePlaceholder />
  }

  const withImage = {
    ...common,
    imagePreviewUrl,
    imageType,
    showImage: !!imagePreviewUrl,
    cropHint,
  }

  switch (platform) {
    case 'instagram':
      return <InstagramPreview {...withImage} hashtags={hashtagString(item.hashtags, 'instagram')} />
    case 'facebook':
      return <FacebookPreview {...withImage} hashtags={hashtagString(item.hashtags, 'facebook')} />
    case 'linkedin':
      return <LinkedInPreview {...withImage} hashtags={hashtagString(item.hashtags, 'linkedin')} />
    case 'reddit':
      return <RedditPreview {...common} />
    case 'pinterest':
      return <PinterestPreview {...common} imagePreviewUrl={imagePreviewUrl} />
    case 'threads':
      return <ThreadsPreview {...common} />
    case 'quora':
      return <QuoraPreview {...common} />
    default:
      return null
  }
}

/**
 * Read-only preview of a scheduled post, with a dropdown to switch between the
 * platforms the post targets and see how it renders on each one.
 */
export default function PostPreviewModal({ open, item, onClose }) {
  const platforms = Array.isArray(item?.platforms) ? item.platforms : []
  const [selected, setSelected] = useState(platforms[0] || 'instagram')
  const [menuOpen, setMenuOpen] = useState(false)
  const { url: imagePreviewUrl, missing: imageMissing } = useScheduledImageUrl(open ? item : null)
  // Re-seed the selected platform whenever a different post is opened.
  const [seededId, setSeededId] = useState(null)

  if (open && item && seededId !== item.id) {
    setSeededId(item.id)
    setSelected(platforms[0] || 'instagram')
    setMenuOpen(false)
  }

  const active = PLATFORM_META[selected]

  return (
    <Modal open={open} onClose={onClose} title="Post preview">
      {platforms.length === 0 ? (
        <p className="text-sm text-slate-400">This post has no platforms selected.</p>
      ) : (
        <div className="space-y-4">
          {/* Platform dropdown */}
          <div className="relative">
            <label className="field-label">Platform</label>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors hover:border-white/20"
            >
              <span className="flex items-center gap-2">
                <PlatformIcon platform={selected} size="sm" />
                {active?.label || selected}
              </span>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-hidden
                  onClick={() => setMenuOpen(false)}
                  tabIndex={-1}
                />
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#12151f] shadow-2xl">
                  {platforms.map((p) => (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(p)
                          setMenuOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${
                          p === selected ? 'bg-white/[0.04] text-white' : 'text-slate-300'
                        }`}
                      >
                        <PlatformIcon platform={p} size="sm" />
                        {PLATFORM_META[p]?.label || p}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Selected platform preview */}
          <div key={selected}>
            {item && renderPreview(selected, item, imagePreviewUrl, imageMissing)}
          </div>
        </div>
      )}
    </Modal>
  )
}
