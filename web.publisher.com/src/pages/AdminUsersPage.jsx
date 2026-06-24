import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isPlatformAdmin } from '../lib/admin'
import { fetchAdminUsers } from '../lib/backendApi'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll, PageStatsRow, PageStat, EmptyState } from '../components/PageShell'
import PlatformIcon from '../components/PlatformIcon'

const PLATFORM_LABELS = {
  meta: 'Meta',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  pinterest: 'Pinterest',
  threads: 'Threads',
  gmail: 'Gmail',
}

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function StatPill({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-2 ring-1 ring-white/[0.06]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function UserCard({ user, index }) {
  const connected = Object.entries(user.connections || {}).filter(([, on]) => on)
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <li className="saas-user-card" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="border-b border-white/[0.06] bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/5 px-4 py-4">
        <div className="flex items-start gap-3">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 font-display text-sm font-bold text-violet-200 ring-2 ring-white/10">
              {initials || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email || 'No email'}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-slate-600">{user.workspaceId}</p>
          </div>
          {user.hasApiConfig ? (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
              Active
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-white/10">
              New
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Drafts" value={user.stats.drafts} accent="text-slate-200" />
          <StatPill label="Scheduled" value={user.stats.scheduled} accent="text-amber-300" />
          <StatPill label="Published" value={user.stats.published} accent="text-emerald-300" />
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Connections</p>
          {connected.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">No platforms configured yet</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {connected.map(([key]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-300 ring-1 ring-white/[0.06]"
                >
                  {key !== 'gmail' && key !== 'meta' ? (
                    <PlatformIcon platform={key} size="xs" />
                  ) : null}
                  {PLATFORM_LABELS[key] || key}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto space-y-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-slate-500">
          <div className="flex justify-between gap-2">
            <span>Joined</span>
            <span className="text-slate-400">{formatWhen(user.createdAt)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Last sign-in</span>
            <span className="text-slate-400">{formatWhen(user.lastSignInAt)}</span>
          </div>
          {user.configUpdatedAt && (
            <div className="flex justify-between gap-2">
              <span>Config updated</span>
              <span className="text-slate-400">{formatWhen(user.configUpdatedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export default function AdminUsersPage() {
  const { user, ready } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceNote, setSourceNote] = useState('')

  const isAdmin = isPlatformAdmin(user?.email)

  useEffect(() => {
    if (!ready || !isAdmin) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetchAdminUsers()
      .then((data) => {
        if (!cancelled) {
          setUsers(data.users || [])
          setSourceNote(data.source === 'database' ? data.note || '' : '')
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load users')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ready, isAdmin])

  if (ready && !isAdmin) {
    return <Navigate to="/compose" replace />
  }

  const activeCount = users.filter((u) => u.hasApiConfig).length
  const connectedCount = users.filter((u) =>
    Object.values(u.connections || {}).some(Boolean),
  ).length

  return (
    <PageShell>
      <PageHeader
        title="Platform Users"
        subtitle="Registered accounts, activity, and integration health"
      />

      <PageStatsRow>
        <PageStat label="Registered" value={loading ? '…' : users.length} tone="violet" />
        <PageStat label="Active" value={loading ? '…' : activeCount} tone="emerald" hint="With API config" />
        <PageStat label="Connected" value={loading ? '…' : connectedCount} hint="Platforms linked" />
        <PageStat label="Source" value={sourceNote ? 'DB' : 'Clerk'} />
      </PageStatsRow>

      <PageScroll>
        {sourceNote && !error && !loading && (
          <div className="saas-info-banner saas-info-banner--amber mb-3 text-xs">{sourceNote}</div>
        )}
        {error ? (
          <div className="saas-content-card border border-rose-500/20 bg-rose-500/5 p-6 text-center">
            <p className="font-medium text-rose-200">Could not load users</p>
            <p className="mt-1 text-xs text-rose-300/80">{error}</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="saas-content-card h-64 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Registered Clerk users will appear here with stats and connection status."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {users.map((u, i) => (
              <UserCard key={u.id} user={u} index={i} />
            ))}
          </ul>
        )}
      </PageScroll>
    </PageShell>
  )
}
