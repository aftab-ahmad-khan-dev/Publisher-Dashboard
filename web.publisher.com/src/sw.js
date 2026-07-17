import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(Promise.resolve())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const NOTIFICATION_ICON = '/icons/icon-192.png'
const NOTIFICATION_BADGE = '/icons/badge-72.png'

function showBrowserNotification(payload = {}) {
  const title = payload.title || 'Publisher Suite'
  return self.registration.showNotification(title, {
    body: payload.body || '',
    icon: payload.icon || NOTIFICATION_ICON,
    badge: payload.badge || NOTIFICATION_BADGE,
    tag: payload.tag || `notif-${Date.now()}`,
    data: {
      href: payload.href || '/compose',
      ...payload,
    },
    vibrate: payload.vibrate || [120, 60, 120],
    requireInteraction: Boolean(payload.requireInteraction),
    renotify: Boolean(payload.renotify),
  })
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}
  if (type === 'SHOW_NOTIFICATION' || type === 'POST_PUBLISHED') {
    if (!payload) return
    event.waitUntil(showBrowserNotification(payload))
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href = event.notification.data?.href || '/compose'
  const url =
    new URL(href, self.location.origin).pathname +
    (new URL(href, self.location.origin).search || '')

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', href: url })
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
      return undefined
    }),
  )
})
