import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

const NOTIFICATION_ICON = '/icons/icon-192.png'
const NOTIFICATION_BADGE = '/icons/badge-72.png'

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}
  if (type !== 'POST_PUBLISHED' || !payload) return

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Post Published', {
      body: payload.body || 'Your post is now live across connected platforms.',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      tag: payload.tag || `publish-${Date.now()}`,
      data: payload,
      vibrate: [120, 60, 120],
      requireInteraction: false,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('/compose')
    }),
  )
})
