/**
 * Public origin of this API, with any trailing slash or trailing "/api" removed.
 *
 * Every caller appends "/api/..." itself, so API_PUBLIC_URL works whether it's set
 * as "https://host" or "https://host/api". The latter is an easy copy-paste from
 * VITE_API_BASE_URL (which DOES include /api), and without this it produces a
 * broken "/api/api/..." URL — e.g. Instagram then can't fetch the hosted image.
 *
 * Production defaults to the live Vercel domain so email tracking / media / OAuth
 * work without setting API_PUBLIC_URL or WEB_URL in Vercel env.
 */

/** Live app (API is mounted under /api on the same host). */
export const PRODUCTION_PUBLIC_URL = 'https://publisher-dashboard.vercel.app'

function normalizeOrigin(raw) {
  if (!raw) return ''
  return String(raw).trim().replace(/\/+$/, '').replace(/\/api$/i, '')
}

function isLocalHost(url) {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url)
  }
}

function isLocalDev() {
  if (process.env.NODE_ENV === 'production') return false
  // Vercel always sets VERCEL=1 on deployed builds
  if (process.env.VERCEL === '1') return false
  return true
}

/**
 * Prefer env override, but never use a localhost URL in production/Vercel.
 */
function resolvePublicOrigin(envValue, localFallback) {
  const fromEnv = normalizeOrigin(envValue)
  if (fromEnv && (isLocalDev() || !isLocalHost(fromEnv))) {
    return fromEnv
  }
  if (isLocalDev()) return localFallback
  return PRODUCTION_PUBLIC_URL
}

/**
 * API origin used for tracking pixels, media URLs, OAuth callbacks.
 */
export function apiPublicBase() {
  const port = Number(process.env.PORT) || 3001
  return resolvePublicOrigin(process.env.API_PUBLIC_URL, `http://localhost:${port}`)
}

/**
 * Frontend origin used for OAuth return redirects after Connect *.
 */
export function webPublicBase() {
  return resolvePublicOrigin(process.env.WEB_URL, 'http://localhost:5173')
}
