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
import PageShell, { PageBody, PageScroll, PageSection, PageStatsRow, PageStat } from '../components/PageShell'
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

      <PageStatsRow>
        <PageStat label="Parsed posts" value={parsed.length} tone="violet" />
        <PageStat label="Images" value={imageFiles.length} hint={`${imageMapSummary.length} matched`} />
        <PageStat label="Platforms" value={enabledPlatforms.length} tone="emerald" />
        <PageStat label="Day 1" value={startDate} tone="amber" />
      </PageStatsRow>

      <PageBody className="saas-page-grid min-h-0 flex-1">
        <PageScroll className="space-y-3">
          <PageSection
            title="Content"
            description={
              <>
                One block per post. Headers: <code className="text-slate-400">Post 1 (Day 1)</code>,{' '}
                <code className="text-slate-400">Post 2 (Day 2)</code>
              </>
            }
            action={
              <button
                type="button"
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                onClick={() => setRaw(SAMPLE)}
              >
                Load sample
              </button>
            }
          >
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={SAMPLE}
              rows={14}
              className="input-premium mt-1 w-full resize-y font-mono text-xs"
            />
          </PageSection>

          <PageSection title="Images" description="Matched to post/day number from filename (1.jpg, 2.png, …)">
            <BulkImageDropzone files={imageFiles} onChange={setImageFiles} />
            {imageMapSummary.length > 0 && (
              <p className="mt-2 text-[11px] text-emerald-400/90">
                Linked: {imageMapSummary.map(([n, f]) => `Day ${n} ← ${f.name}`).join(' · ')}
              </p>
            )}
            {imageFiles.length > 0 && imageMapSummary.length < imageFiles.length && (
              <p className="mt-1 text-[11px] text-amber-500/80">
                {imageFiles.filter((f) => imageIndexFromFilename(f.name) == null).length} file(s) need numeric names.
              </p>
            )}
          </PageSection>

          <PageSection title="Schedule & platforms" description={`Each post publishes at 12:00 PM (${TZ})`}>
            <label className="field-label mt-1">Day 1 starts on</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-premium" />

            <CommunityContentGuide body={raw} platforms={platforms} />

            <p className="mt-4 field-label">Platforms</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition ${
                    platforms[key]
                      ? 'bg-indigo-500/15 text-white ring-indigo-500/40'
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
          </PageSection>
        </PageScroll>

        <PageScroll>
          <PageSection
            title="Preview"
            description={`${parsed.length} post${parsed.length === 1 ? '' : 's'} ready to schedule`}
            className="min-h-[200px]"
          >
            {parsed.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-500">Parsed posts appear here</p>
            ) : (
              <ul className="space-y-3">
                {parsed.map((post) => {
                  const when = computeScheduleDate(startDate, post.dayNum)
                  return (
                    <li key={post.id} className="saas-list-item">
                      <div className="flex gap-3">
                        <PostThumb file={post.imageFile} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-indigo-300">{post.title}</p>
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
          </PageSection>
        </PageScroll>
      </PageBody>
    </PageShell>
  )
}
