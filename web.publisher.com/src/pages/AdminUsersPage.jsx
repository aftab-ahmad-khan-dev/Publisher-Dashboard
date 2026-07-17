import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isPlatformAdmin } from '../lib/admin'
import {
  fetchAdminUsers,
  fetchAdminSignups,
  fetchAdminPayments,
  activateAdminPayment,
  rejectAdminPayment,
} from '../lib/backendApi'
import PageHeader from '../components/PageHeader'
import PageShell, { PageScroll, PageStatsRow, PageStat, EmptyState } from '../components/PageShell'
import PlatformIcon from '../components/PlatformIcon'
import { PLAN_META } from '../lib/plans'
import { showToast } from '../lib/toast'

const PLATFORM_LABELS = {
  meta: 'Meta',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  pinterest: 'Pinterest',
  threads: 'Threads',
  gmail: 'Gmail',
}

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'signups', label: 'Signups' },
  { id: 'payments', label: 'Payments' },
]

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

function planBadge(plan, status) {
  const name = PLAN_META[plan]?.name || plan || 'None'
  const tone =
    status === 'active'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'pending'
        ? 'bg-amber-500/15 text-amber-300'
        : status === 'rejected'
          ? 'bg-rose-500/15 text-rose-300'
          : 'bg-slate-500/15 text-slate-400'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>
      {name}
      {status && status !== 'active' ? ` · ${status}` : ''}
    </span>
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
  const sub = user.subscription || {}

  return (
    <li className="saas-user-card" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="border-b border-white/[0.06] bg-gradient-to-br from-indigo-500/10 via-transparent to-sky-500/5 px-4 py-4">
        <div className="flex items-start gap-3">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 font-display text-sm font-bold text-indigo-200 ring-2 ring-white/10">
              {initials || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email || 'No email'}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-slate-600">{user.workspaceId}</p>
          </div>
          {planBadge(sub.plan, sub.status)}
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
        </div>
      </div>
    </li>
  )
}

export default function AdminUsersPage() {
  const { user, ready } = useAuth()
  const [tab, setTab] = useState('payments')
  const [users, setUsers] = useState([])
  const [signups, setSignups] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [busyId, setBusyId] = useState('')

  const isAdmin = isPlatformAdmin(user?.email)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usersRes, signupsRes, paymentsRes] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminSignups(),
        fetchAdminPayments(),
      ])
      setUsers(usersRes.users || [])
      setSourceNote(usersRes.source === 'database' ? usersRes.note || '' : '')
      setSignups(signupsRes.signups || [])
      setPayments(paymentsRes.payments || [])
    } catch (err) {
      setError(err.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !isAdmin) return
    load()
  }, [ready, isAdmin, load])

  if (ready && !isAdmin) {
    return <Navigate to="/compose" replace />
  }

  const activeCount = users.filter((u) => u.hasApiConfig).length
  const pendingPayments = payments.filter((p) => p.status === 'pending').length

  const onActivate = async (id) => {
    setBusyId(id)
    try {
      await activateAdminPayment(id)
      showToast('Plan activated — welcome email sent')
      await load()
    } catch (err) {
      showToast(err.message || 'Activate failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  const onReject = async (id) => {
    const reason = window.prompt('Optional reject reason') || ''
    setBusyId(id)
    try {
      await rejectAdminPayment(id, reason)
      showToast('Payment rejected')
      await load()
    } catch (err) {
      showToast(err.message || 'Reject failed', 'error')
    } finally {
      setBusyId('')
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Platform Admin"
        subtitle="Signups, payment receipts, and plan activation"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === t.id
                ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
            {t.id === 'payments' && pendingPayments > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">
                {pendingPayments}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <PageStatsRow>
        <PageStat label="Registered" value={loading ? '…' : users.length} tone="violet" />
        <PageStat label="Active" value={loading ? '…' : activeCount} tone="emerald" hint="With API config" />
        <PageStat label="Pending payments" value={loading ? '…' : pendingPayments} hint="Need review" />
        <PageStat label="Source" value={sourceNote ? 'DB' : 'Clerk'} />
      </PageStatsRow>

      <PageScroll>
        {error ? (
          <div className="saas-content-card border border-rose-500/20 bg-rose-500/5 p-6 text-center">
            <p className="font-medium text-rose-200">Could not load admin data</p>
            <p className="mt-1 text-xs text-rose-300/80">{error}</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="saas-content-card h-64 animate-pulse" />
            ))}
          </div>
        ) : tab === 'users' ? (
          users.length === 0 ? (
            <EmptyState title="No users found" description="Registered Clerk users will appear here." />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {users.map((u, i) => (
                <UserCard key={u.id} user={u} index={i} />
              ))}
            </ul>
          )
        ) : tab === 'signups' ? (
          signups.length === 0 ? (
            <EmptyState title="No signups yet" description="New accounts will show here with plan status." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <div className="mobile-data-cards !border-0 !bg-transparent !p-3">
                {signups.map((s) => (
                  <div key={s.id} className="mobile-data-card">
                    <p className="mobile-data-card__title">{s.name}</p>
                    <p className="mobile-data-card__meta">{s.email || s.workspaceId}</p>
                    <div className="mobile-data-card__row">
                      <span className="mobile-data-card__label">Joined</span>
                      <span className="mobile-data-card__value">{formatWhen(s.createdAt)}</span>
                    </div>
                    <div className="mobile-data-card__row">
                      <span className="mobile-data-card__label">Plan</span>
                      <span className="mobile-data-card__value">
                        {PLAN_META[s.plan]?.name || s.plan || 'None'}
                      </span>
                    </div>
                    <div className="mt-2">{planBadge(s.plan, s.status)}</div>
                  </div>
                ))}
              </div>
              <table className="saas-table saas-table--desktop-only w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5">Joined</th>
                    <th className="px-3 py-2.5">Plan</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-white">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email || s.workspaceId}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{formatWhen(s.createdAt)}</td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {PLAN_META[s.plan]?.name || s.plan || 'None'}
                      </td>
                      <td className="px-3 py-2.5">{planBadge(s.plan, s.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : payments.length === 0 ? (
          <EmptyState title="No payments" description="Receipt submissions will appear here for activation." />
        ) : (
          <ul className="space-y-3">
            {payments.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {p.userEmail || p.workspaceId} · {PLAN_META[p.planRequested]?.name || p.planRequested}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.bankMethod} · {formatWhen(p.createdAt)}
                    </p>
                    {p.note ? <p className="mt-2 text-xs text-slate-400">{p.note}</p> : null}
                  </div>
                  {planBadge(p.planRequested, p.status)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.receiptUrl ? (
                    <button
                      type="button"
                      onClick={() => setReceiptPreview(p.receiptUrl)}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                    >
                      View receipt
                    </button>
                  ) : null}
                  {p.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => onActivate(p.id)}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Activate plan
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => onReject(p.id)}
                        className="rounded-full border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageScroll>

      {receiptPreview && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setReceiptPreview(null)}
          onKeyDown={(e) => e.key === 'Escape' && setReceiptPreview(null)}
          role="dialog"
        >
          <div className="max-h-[90vh] max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-[#0c1220] p-4">
            <img src={receiptPreview} alt="Payment receipt" className="max-h-[80vh] w-full object-contain" />
            <a
              href={receiptPreview}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-indigo-300"
              onClick={(e) => e.stopPropagation()}
            >
              Open original
            </a>
          </div>
        </div>
      )}
    </PageShell>
  )
}
