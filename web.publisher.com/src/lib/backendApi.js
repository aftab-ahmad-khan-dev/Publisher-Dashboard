import { isLivePublishing } from './api'

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || ''
const AUTH_KEY = 'pulse_auth_session'

export function getWorkspaceId() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY)
    if (raw) return JSON.parse(raw).workspaceId || 'joseph-morgan'
  } catch {
    /* ignore */
  }
  return 'joseph-morgan'
}

export function hasBackend() {
  return isLivePublishing()
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-Id': getWorkspaceId(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || data.message || `API error ${res.status}`)
  }
  return data
}

export function subscribeRealtime(onEvent) {
  if (!API_BASE) return () => {}
  const url = `${API_BASE}/events?workspaceId=${encodeURIComponent(getWorkspaceId())}`
  const source = new EventSource(url)

  source.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data))
    } catch {
      /* ignore */
    }
  }

  source.onerror = () => {
    source.close()
  }

  return () => source.close()
}

export async function loadBootstrap() {
  return apiFetch('/bootstrap')
}

export async function saveConfigRemote(config) {
  return apiFetch('/config', { method: 'PUT', body: { config } })
}

export async function saveLinkedInRemote(linkedin) {
  return apiFetch('/config/linkedin', { method: 'PUT', body: { linkedin } })
}

export async function saveMetaRemote(meta) {
  return apiFetch('/config/meta', { method: 'PUT', body: { meta } })
}

export async function saveRedditRemote(reddit) {
  return apiFetch('/config/reddit', { method: 'PUT', body: { reddit } })
}

export async function saveQuoraRemote(quora) {
  return apiFetch('/config/quora', { method: 'PUT', body: { quora } })
}

export function linkedInOAuthUrl() {
  if (!API_BASE) return null
  return `${API_BASE}/auth/linkedin?workspaceId=${encodeURIComponent(getWorkspaceId())}`
}

export function gmailOAuthUrl() {
  if (!API_BASE) return null
  return `${API_BASE}/auth/gmail?workspaceId=${encodeURIComponent(getWorkspaceId())}`
}

export async function fetchGmailOAuthSetup() {
  return apiFetch('/auth/gmail/setup')
}

export async function saveGmailRemote(gmail) {
  return apiFetch('/config/gmail', { method: 'PUT', body: { gmail } })
}

export async function listEmailCampaigns() {
  return apiFetch('/email/campaigns')
}

export async function getEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}`)
}

export async function createEmailCampaign(payload) {
  return apiFetch('/email/campaigns', { method: 'POST', body: payload })
}

export async function sendEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}/send`, { method: 'POST' })
}

export async function deleteEmailCampaign(id) {
  return apiFetch(`/email/campaigns/${id}`, { method: 'DELETE' })
}

export async function saveDraftRemote(draft) {
  return apiFetch(`/drafts/${draft.id}`, { method: 'PUT', body: { draft } })
}

export async function deleteDraftRemote(id) {
  return apiFetch(`/drafts/${id}`, { method: 'DELETE' })
}

export async function deleteScheduledRemote(id) {
  return apiFetch(`/scheduled/${id}`, { method: 'DELETE' })
}

export async function scheduleBulkRemote(payload) {
  return apiFetch('/bulk/schedule', { method: 'POST', body: payload })
}
