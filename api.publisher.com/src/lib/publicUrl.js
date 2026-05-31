/**
 * Public origin of this API, with any trailing slash or trailing "/api" removed.
 *
 * Every caller appends "/api/..." itself, so API_PUBLIC_URL works whether it's set
 * as "https://host" or "https://host/api". The latter is an easy copy-paste from
 * VITE_API_BASE_URL (which DOES include /api), and without this it produces a
 * broken "/api/api/..." URL — e.g. Instagram then can't fetch the hosted image.
 */
export function apiPublicBase() {
  const raw = process.env.API_PUBLIC_URL?.trim()
  if (!raw) return ''
  return raw.replace(/\/+$/, '').replace(/\/api$/i, '')
}
