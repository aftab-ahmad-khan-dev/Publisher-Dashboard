/** Browser localStorage keys used by the dashboard (no server DB). */

export const STORAGE_KEYS = {
  apiConfig: 'pulse_api_config',
  scheduledQueue: 'pulse_scheduled_queue',
  drafts: 'pulse_drafts',
}

export function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    localStorage.removeItem(key)
  }
  return fallback
}

export function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}
