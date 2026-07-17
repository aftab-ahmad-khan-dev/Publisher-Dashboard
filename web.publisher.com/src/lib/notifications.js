/**
 * In-app notification helpers + native browser notifications via Service Worker.
 * No third-party push SDKs — uses the browser Notification API + SW showNotification.
 */

const STORAGE_KEY = 'publisher_notifications_v1'
const MAX_ITEMS = 40

export function loadStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    /* ignore quota */
  }
}

export function notificationFromEvent(event) {
  if (!event?.type) return null
  const at = event.at || Date.now()
  const id = `${event.type}-${event.id || event.tag || at}-${Math.random().toString(36).slice(2, 7)}`

  const map = {
    POST_PUBLISHED: {
      title: event.title || 'Post published',
      body: event.body || 'Your post is live on connected platforms.',
      tone: 'success',
    },
    POST_SCHEDULED: {
      title: 'Post scheduled',
      body: event.body || 'Added to your publish queue.',
      tone: 'info',
    },
    POST_FAILED: {
      title: 'Publish failed',
      body: event.body || event.error || 'A scheduled post failed to publish.',
      tone: 'error',
    },
    EMAIL_OPENED: {
      title: 'Email opened',
      body: event.email ? `${event.email} opened your email.` : 'A recipient opened your email.',
      tone: 'info',
    },
    EMAIL_CLICKED: {
      title: 'Email link clicked',
      body: event.email ? `${event.email} clicked a link.` : 'A recipient clicked a link.',
      tone: 'info',
    },
    EMAIL_MEETING_CLICK: {
      title: 'Meeting link clicked',
      body: event.email
        ? `${event.email} opened your calendar booking link.`
        : 'Someone opened your Schedule a meeting link.',
      tone: 'success',
    },
    MEETING_SCHEDULED: {
      title: event.title || 'Meeting scheduled',
      body: event.body || 'Meet link sent to lead and admin.',
      tone: 'success',
    },
    MEETING_REMINDER: {
      title: event.title || 'Meeting starting soon',
      body: event.body || 'Join with the Google Meet link in ~5–10 minutes.',
      tone: 'warn',
    },
    EMAIL_CAMPAIGN_DONE: {
      title: 'Campaign finished',
      body: event.body || 'Email campaign completed.',
      tone: 'success',
    },
    EMAIL_CAMPAIGN_PAUSED: {
      title: 'Campaign paused',
      body: event.body || 'Email campaign was paused.',
      tone: 'warn',
    },
    EMAIL_CAMPAIGN_FAILED: {
      title: 'Campaign failed',
      body: event.body || event.error || 'Email campaign failed.',
      tone: 'error',
    },
  }

  const meta = map[event.type]
  if (!meta) return null

  return {
    id,
    type: event.type,
    title: meta.title,
    body: meta.body,
    tone: meta.tone,
    read: false,
    at,
    href:
      event.type === 'MEETING_SCHEDULED' || event.type === 'MEETING_REMINDER'
        ? '/email'
        : event.type?.startsWith('EMAIL_')
          ? '/email'
          : event.type?.startsWith('POST_')
            ? '/scheduled'
            : '/compose',
  }
}

const SOCKET_EVENT = 'publisher:socket'

/** Wait until the Vite PWA service worker is ready (or null if unsupported). */
export async function ensureServiceWorkerReady() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  await ensureServiceWorkerReady()
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

/**
 * Show an OS notification through the service worker (preferred) or Notification API.
 * Works while the dashboard/PWA is open and receiving realtime events — no Firebase/OneSignal.
 */
export async function notifyViaServiceWorker(payload) {
  if (!payload?.title) return false
  if (!('Notification' in window)) return false

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      /* user gesture may be required */
    }
  }
  if (Notification.permission !== 'granted') return false

  const origin = window.location.origin
  // Absolute URLs — relative paths often fail in SW/Notification and show a blank/white dot
  const appIcon = `${origin}/icons/icon-192.png`

  const body = {
    title: payload.title,
    body: payload.body || '',
    tag: payload.tag || `notif-${Date.now()}`,
    href: payload.href || '/compose',
    icon: payload.icon || appIcon,
    badge: payload.badge || appIcon,
  }

  const options = {
    body: body.body,
    icon: body.icon,
    badge: body.badge,
    tag: body.tag,
    data: { href: body.href },
    renotify: true,
  }

  try {
    const registration =
      (await ensureServiceWorkerReady()) ||
      (await navigator.serviceWorker?.getRegistration?.()) ||
      null

    // Prefer registration.showNotification — more reliable than postMessage to SW
    if (registration?.showNotification) {
      await registration.showNotification(body.title, options)
      return true
    }

    if (registration?.active) {
      registration.active.postMessage({ type: 'SHOW_NOTIFICATION', payload: body })
      return true
    }
  } catch {
    /* fall through */
  }

  try {
    const n = new Notification(body.title, options)
    n.onclick = () => {
      window.focus()
      if (body.href) window.location.assign(body.href)
      n.close()
    }
    return true
  } catch {
    return false
  }
}

/** Build SW payload from an in-app notification item or realtime event. */
export function browserPayloadFromItem(item) {
  if (!item) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const appIcon = origin ? `${origin}/icons/icon-192.png` : '/icons/icon-192.png'
  return {
    title: item.title,
    body: item.body,
    tag: item.id || item.tag || `notif-${item.at || Date.now()}`,
    href: item.href || '/compose',
    icon: appIcon,
    badge: appIcon,
  }
}

export function emitSocketEvent(detail) {
  window.dispatchEvent(new CustomEvent(SOCKET_EVENT, { detail }))
}

export function subscribeSocket(handler) {
  const listener = (e) => handler(e.detail)
  window.addEventListener(SOCKET_EVENT, listener)
  return () => window.removeEventListener(SOCKET_EVENT, listener)
}

export function simulateSocketPublish(payload) {
  emitSocketEvent({ type: 'POST_PUBLISHED', ...payload, at: Date.now() })
}

export function prependNotification(list, item) {
  if (!item) return list
  const next = [item, ...list.filter((n) => n.id !== item.id)].slice(0, MAX_ITEMS)
  persist(next)
  return next
}

export function markNotificationRead(list, id) {
  const next = list.map((n) => (n.id === id ? { ...n, read: true } : n))
  persist(next)
  return next
}

export function markAllNotificationsRead(list) {
  const next = list.map((n) => ({ ...n, read: true }))
  persist(next)
  return next
}

export function clearNotifications() {
  persist([])
  return []
}
