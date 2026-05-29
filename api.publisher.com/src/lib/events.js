/** Each entry: { res, workspaceId } so events never cross tenants. */
const clients = new Set()

export function subscribeClient(res, workspaceId) {
  const client = { res, workspaceId: workspaceId || null }
  clients.add(client)
  return client
}

export function unsubscribeClient(client) {
  clients.delete(client)
}

/**
 * Broadcast to connected clients. When the payload carries a `workspaceId`,
 * only clients in that same workspace receive it — preventing one tenant from
 * seeing another tenant's publish/email activity over the shared event stream.
 */
export function broadcastEvent(type, payload = {}) {
  const data = JSON.stringify({ type, ...payload, at: Date.now() })
  const target = payload.workspaceId || null
  for (const client of clients) {
    if (target && client.workspaceId && client.workspaceId !== target) continue
    try {
      client.res.write(`data: ${data}\n\n`)
    } catch {
      clients.delete(client)
    }
  }
}
