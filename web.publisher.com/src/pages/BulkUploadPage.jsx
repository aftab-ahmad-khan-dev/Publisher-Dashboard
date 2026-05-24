import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { PLATFORM_META, DEFAULT_PLATFORMS } from '../lib/constants'
import CommunityContentGuide from '../components/CommunityContentGuide'
import {
  parseBulkContent,
  buildImageMap,
  assignImagesToPosts,
  computeScheduleDate,
} from '../lib/bulkParse'
import PageHeader from '../components/PageHeader'
import PageShell, { PageBody, PageScroll } from '../components/PageShell'
import PlatformIcon from '../components/PlatformIcon'
import BulkImageDropzone from '../components/BulkImageDropzone'
import { imageIndexFromFilename } from '../lib/bulkParse'

const SAMPLE = `Post 1 (Day 1)
Your caption for day one goes here.

Post 2 (Day 2)
Second post body, hashtags and links welcome.

Post 3 (Day 3)
Third post content.`

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

function tomorrowIso() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

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
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] text-[10px] text-slate-600">
        No img
      </div>
    )
  }
  return (
    <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
  )
}

export default function BulkUploadPage() {
  const app = useAppData()
  const [raw, setRaw] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [startDate, setStartDate] = useState(tomorrowIso)
  const [platforms, setPlatforms] = useState({ ...DEFAULT_PLATFORMS })
  const [scheduling, setScheduling] = useState(false)

  const parsed = useMemo(() => {
    if (!raw.trim()) return []
    const posts = parseBulkContent(raw)
    const map = buildImageMap(imageFiles)
    return assignImagesToPosts(posts, map)
  }, [raw, imageFiles])

  const enabledPlatforms = useMemo(
    () => Object.entries(platforms).filter(([, on]) => on).map(([k]) => k),
    [platforms],
  )

  const imageMapSummary = useMemo(() => {
    const map = buildImageMap(imageFiles)
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [imageFiles])

  const togglePlatform = (key) => {
    setPlatforms((p) => ({ ...p, [key]: !p[key] }))
  }

  const handleSchedule = useCallback(async () => {
    setScheduling(true)
    const result = await app.scheduleBulkPosts({
      posts: parsed,
      platforms: enabledPlatforms,
      startDate,
      timezone: TZ,
    })
    setScheduling(false)
    if (result?.ok) {
      setRaw('')
      setImageFiles([])
    }
  }, [parsed, enabledPlatforms, startDate, app])

  return (
    <PageShell>
      <PageHeader
        title="Bulk Upload"
        subtitle="Paste a content calendar · match images by number · schedule at noon"
        action={
          <Link to="/scheduled" className="btn-secondary px-3 py-1.5 text-xs">
            View queue
          </Link>
        }
      />

      <PageBody className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <PageScroll className="space-y-3 lg:col-span-1">
          <section className="surface-panel rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Content</h2>
              <button
                type="button"
                className="text-[11px] text-violet-400 hover:text-violet-300"
                onClick={() => setRaw(SAMPLE)}
              >
                Load sample
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              One block per post. Headers: <code className="text-slate-400">Post 1 (Day 1)</code>,{' '}
              <code className="text-slate-400">Post 2 (Day 2)</code>, etc.
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={SAMPLE}
              rows={14}
              className="mt-3 w-full resize-y rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
          </section>

          <section className="surface-panel rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white">Images</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Matched to post/day number from filename.
            </p>
            <div className="mt-3">
              <BulkImageDropzone files={imageFiles} onChange={setImageFiles} />
            </div>
            {imageMapSummary.length > 0 && (
              <p className="mt-2 text-[11px] text-emerald-400/90">
                Linked to posts: {imageMapSummary.map(([n, f]) => `Day ${n} ← ${f.name}`).join(' · ')}
              </p>
            )}
            {imageFiles.length > 0 && imageMapSummary.length < imageFiles.length && (
              <p className="mt-1 text-[11px] text-amber-500/80">
                {imageFiles.filter((f) => imageIndexFromFilename(f.name) == null).length} file(s) have no numeric name — rename to 1.jpg, 2.png, etc.
              </p>
            )}
          </section>

          <section className="surface-panel rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white">Schedule</h2>
            <label className="mt-3 block text-[11px] text-slate-500">Day 1 starts on</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Each post publishes at 12:00 PM local ({TZ}). Day N = start date + (N − 1) days.
            </p>

            <CommunityContentGuide body={raw} platforms={platforms} />

            <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-slate-500">Platforms</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                    platforms[key]
                      ? 'bg-violet-500/15 text-white ring-violet-500/40'
                      : 'bg-white/[0.02] text-slate-500 ring-white/[0.06]'
                  }`}
                >
                  <PlatformIcon platform={key} size="sm" />
                  {meta.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={scheduling || parsed.length === 0}
              onClick={handleSchedule}
              className="btn-primary mt-4 w-full py-2.5 text-sm disabled:opacity-50"
            >
              {scheduling ? 'Scheduling…' : `Schedule ${parsed.length || 0} post${parsed.length === 1 ? '' : 's'}`}
            </button>

            {!app.isLivePublishing() && (
              <p className="mt-2 text-center text-[11px] text-amber-500/90">
                Set VITE_API_BASE_URL for MongoDB-backed scheduling.
              </p>
            )}
          </section>
        </PageScroll>

        <PageScroll className="lg:col-span-1">
          <section className="surface-panel min-h-[200px] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white">
              Preview <span className="text-slate-500">({parsed.length})</span>
            </h2>
            {parsed.length === 0 ? (
              <p className="mt-8 text-center text-xs text-slate-500">Parsed posts appear here</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {parsed.map((post) => {
                  const when = computeScheduleDate(startDate, post.dayNum)
                  return (
                    <li
                      key={post.id}
                      className="rounded-lg border border-white/[0.06] bg-black/20 p-3"
                    >
                      <div className="flex gap-3">
                        <PostThumb file={post.imageFile} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-violet-300">{post.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {when.toLocaleString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                            {!post.imageFile && (
                              <span className="ml-2 text-amber-500/80">· no image matched</span>
                            )}
                          </p>
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-slate-400">
                            {post.body || '(empty body)'}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </PageScroll>
      </PageBody>
    </PageShell>
  )
}
