import { Link } from 'react-router-dom'
import PlatformIcon from '../PlatformIcon'

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'threads', label: 'Threads' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'quora', label: 'Quora' },
  { id: 'gmail', label: 'Gmail' },
]

function countPlatforms(items = []) {
  const map = Object.fromEntries(PLATFORMS.map((p) => [p.id, 0]))
  for (const item of items) {
    const list = Array.isArray(item?.platforms) ? item.platforms : []
    for (const raw of list) {
      const key = String(raw || '')
        .toLowerCase()
        .replace(/^meta_?/, '')
      if (key in map) map[key] += 1
      if (key === 'meta') {
        map.facebook += 1
        map.instagram += 1
      }
    }
  }
  return map
}

/**
 * Per-platform publish pulse from queue / published / drafts.
 */
export default function PlatformPulse({
  queue = [],
  published = [],
  drafts = [],
  mailSent = 0,
  connections = {},
}) {
  const queued = countPlatforms(queue)
  const done = countPlatforms(published)
  const drafting = countPlatforms(drafts)
  queued.gmail = 0
  drafting.gmail = 0
  done.gmail = Number(mailSent) || 0

  const rows = PLATFORMS.map((p) => {
    const q = queued[p.id] || 0
    const d = done[p.id] || 0
    const dr = drafting[p.id] || 0
    const connected =
      p.id === 'gmail'
        ? Boolean(connections.gmail)
        : p.id === 'facebook' || p.id === 'instagram'
          ? Boolean(connections.meta || connections.facebook || connections.instagram)
          : Boolean(connections[p.id])
    return { ...p, queued: q, published: d, drafts: dr, total: q + d + dr, connected }
  })

  const max = Math.max(...rows.map((r) => r.total), 1)
  const active = rows.filter((r) => r.total > 0 || r.connected)

  return (
    <section className="orbit-panel h-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="orbit-panel__title">Platform pulse</h3>
          <p className="orbit-panel__desc">Queue, drafts & published by network</p>
        </div>
        <Link to="/compose" className="orbit-ghost-btn">
          Compose
        </Link>
      </div>

      <ul className="space-y-3">
        {(active.length ? active : rows.slice(0, 5)).map((row) => (
          <li key={row.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2.5">
                <PlatformIcon platform={row.id} size="sm" className="!ring-1 !ring-black/10" />
                <span className="truncate font-semibold text-[#2D0000]">{row.label}</span>
                <span
                  className={`orbit-conn ${row.connected ? 'orbit-conn--on' : 'orbit-conn--off'}`}
                  title={row.connected ? 'Connected' : 'Not connected'}
                />
              </div>
              <span className="shrink-0 tabular-nums font-medium text-[#5a6258]">
                {row.id === 'gmail'
                  ? `${row.published.toLocaleString()} sent`
                  : `${row.published} live · ${row.queued} q · ${row.drafts} d`}
              </span>
            </div>
            <div className="orbit-platform-track">
              <div
                className="orbit-platform-fill"
                style={{ width: `${Math.max(row.total ? 6 : 0, (row.total / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      {!active.length ? (
        <p className="mt-4 text-center text-xs font-medium text-[#5a6258]">
          Connect platforms in Integrations, then publish to fill this board.
        </p>
      ) : null}
    </section>
  )
}
