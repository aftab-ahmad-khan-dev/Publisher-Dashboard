const SOCKET_EVENT = 'publisher:socket'

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export async function notifyViaServiceWorker(payload) {
  if (!('serviceWorker' in navigator)) return false
  if (Notification.permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    if (registration.active) {
      registration.active.postMessage({ type: 'POST_PUBLISHED', payload })
      return true
    }
    registration.showNotification?.(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: payload.tag,
    })
    return true
  } catch {
    return false
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
