import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../contexts/AppDataContext'
import { ensureServiceWorkerReady, requestNotificationPermission } from '../lib/notifications'

function toneDot(tone) {
  if (tone === 'success') return 'bg-emerald-400'
  if (tone === 'error') return 'bg-rose-400'
  if (tone === 'warn') return 'bg-amber-400'
  return 'bg-sky-400'
}

function formatWhen(ts) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const diff = Date.now() - d.getTime()
    if (diff < 60_000) return 'Just now'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Glossy notification panel — desktop popover, mobile/PWA native-style bottom sheet.
 */
export default function NotificationPanel() {
  const {
    notifications = [],
    unreadNotificationCount = 0,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useAppData()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    // Lock scroll only on mobile sheet
    const mq = window.matchMedia('(max-width: 639px)')
    if (mq.matches) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const enablePush = async () => {
    await ensureServiceWorkerReady()
    await requestNotificationPermission()
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="notif-bell relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadNotificationCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white shadow-lg shadow-indigo-500/40">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[2px] sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-label="Notifications"
            className="notif-panel z-[95] sm:absolute sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[22rem]"
          >
            <div className="notif-panel__chrome">
              <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
                <div>
                  <p className="font-display text-sm font-bold text-white">Notifications</p>
                  <p className="text-[10px] text-slate-500">
                    {unreadNotificationCount
                      ? `${unreadNotificationCount} unread`
                      : 'You are up to date'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/5 hover:text-white"
                      onClick={() => markAllNotificationsRead?.()}
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white sm:hidden"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {'Notification' in window && Notification.permission !== 'granted' && (
                <button
                  type="button"
                  onClick={enablePush}
                  className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-[11px] font-semibold text-indigo-200"
                >
                  Enable device notifications
                </button>
              )}

              <div className="notif-panel__list">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm text-slate-400">No notifications yet</p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      Publishes, email opens, and meeting clicks show up here.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-white/[0.05]">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <Link
                          to={n.href || '/compose'}
                          onClick={() => {
                            markNotificationRead?.(n.id)
                            setOpen(false)
                          }}
                          className={`flex gap-3 px-4 py-3 transition hover:bg-white/[0.04] ${
                            n.read ? 'opacity-70' : ''
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot(n.tone)} ${
                              n.read ? 'opacity-40' : 'shadow-[0_0_8px_currentColor]'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-[13px] font-semibold text-white">{n.title}</p>
                              <span className="shrink-0 text-[10px] text-slate-600">{formatWhen(n.at)}</span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                              {n.body}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-white/[0.06] px-3 py-2.5">
                  <button
                    type="button"
                    className="w-full rounded-xl py-2 text-[11px] font-semibold text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                    onClick={() => clearNotifications?.()}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
