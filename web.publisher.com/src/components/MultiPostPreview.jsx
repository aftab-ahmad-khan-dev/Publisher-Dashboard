import { useEffect, useMemo, useState } from 'react'
import { getComposerPosts } from '../lib/composerPosts'
import { computeScheduleDate } from '../lib/bulkParse'
import { isPollEnabled } from '../lib/pollUtils'
import { addDaysToDate } from '../lib/scheduleUtils'
import { formatScheduleDisplay, toDatetimeLocalValue } from '../lib/scheduleUtils'

function PostThumb({ file }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!file) return undefined
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  if (!url) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-[10px] font-medium text-slate-600 ring-1 ring-white/[0.06]">
        —
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
    />
  )
}

export default function MultiPostPreview({ state }) {
  const posts = useMemo(() => getComposerPosts(state), [state.body, state.mediaItems, state.scheduleDayNum])
  const startDate = state.scheduleStartDate

  if (posts.length <= 1) return null

  const pollEnabled = isPollEnabled(state)
  const durationDays = state.poll?.durationDays || 3

  return (
    <div className="feature-card">
      <div className="feature-card__header">
        <p className="feature-card__title">
          {posts.length} posts · image # → post #
        </p>
        {pollEnabled && <span className="feature-card__badge">Poll each day</span>}
      </div>
      <p className="relative mt-2 text-[10px] leading-relaxed text-slate-500">
        Each image is matched to its post/day number. Use headers like{' '}
        <code className="rounded bg-white/[0.06] px-1 py-0.5 text-indigo-300/90">Day 1</code>,{' '}
        <code className="rounded bg-white/[0.06] px-1 py-0.5 text-indigo-300/90">
          Post 1 (Day 1)
        </code>
        , or Unicode bold{' '}
        <code className="rounded bg-white/[0.06] px-1 py-0.5 text-indigo-300/90">𝗗𝗮𝘆 𝟭</code>
        , or rely on upload order (1.jpg, 2.png, …).
      </p>
      <ul className="relative mt-3 max-h-52 space-y-2 overflow-y-auto pr-1 scrollbar-gradient">
        {posts.map((post) => {
          const when = computeScheduleDate(startDate, post.dayNum)
          const pollEnd = pollEnabled ? addDaysToDate(when, durationDays) : null
          return (
            <li key={post.id} className="feature-card__item">
              <PostThumb file={post.imageFile} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-indigo-300">{post.title}</p>
                <p className="text-[10px] text-slate-500">
                  Image #{post.postNum}
                  {post.imageName ? ` · ${post.imageName}` : ''}
                  {!post.imageFile && (
                    <span className="ml-1 text-amber-500/80">· no image</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500">
                  {when.toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {pollEnabled && pollEnd && (
                    <span className="text-indigo-400/80">
                      {' '}
                      · poll →{' '}
                      {formatScheduleDisplay(toDatetimeLocalValue(pollEnd), {
                        timezone: state.timezone,
                      })}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] text-slate-400">
                  {post.body || '(empty body)'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
