const clients = new Set()

export function subscribeClient(res) {
  clients.add(res)
}

export function unsubscribeClient(res) {
  clients.delete(res)
}

export function broadcastEvent(type, payload) {
  const data = JSON.stringify({ type, ...payload, at: Date.now() })
  for (const res of clients) {
    try {
      res.write(`data: ${data}\n\n`)
    } catch {
      clients.delete(res)
    }
  }
}
