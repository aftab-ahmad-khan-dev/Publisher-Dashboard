/**
 * API base URL (no trailing slash), e.g. http://localhost:3001/api
 *
 * Resolution order:
 * 1. VITE_API_BASE_URL from env (Vercel production, or .env.local override)
 * 2. Dev fallback → http://localhost:3001/api
 * 3. Production without env → "" (demo mode)
 */
export function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3001/api'
  return ''
}

export function isLocalApi() {
  const base = getApiBaseUrl()
  return /localhost|127\.0\.0\.1/.test(base)
}
