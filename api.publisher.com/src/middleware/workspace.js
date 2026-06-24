import { getAuth } from '@clerk/express'

const DEFAULT_WORKSPACE = 'joseph-morgan'

/** Clerk is wired up only when a secret key is present. */
export const clerkEnabled = Boolean(process.env.CLERK_SECRET_KEY?.trim())

function normalize(value) {
  return String(value || DEFAULT_WORKSPACE)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 64)
}

/** Canonical content tenant for a signed-in Clerk user (stable across org switches). */
export function contentWorkspaceId(clerkUserId) {
  if (!clerkUserId) return undefined
  return `user_${clerkUserId}`.toLowerCase().slice(0, 64)
}

/**
 * Derive the tenant for this request.
 *
 * With Clerk, publishing data always lives under `user_<clerkUserId>` so switching
 * organizations in the UI never hides drafts, scheduled posts, or API config.
 * The active org (if any) is exposed separately as `req.orgId` for display/roles.
 *
 * Without Clerk (local dev / no secret key), we fall back to the legacy header
 * so the app keeps working single-tenant.
 */
export function workspaceMiddleware(req, _res, next) {
  if (clerkEnabled) {
    let auth = null
    try {
      auth = getAuth(req)
    } catch {
      auth = null
    }

    req.clerkUserId = auth?.userId || undefined
    req.orgId = auth?.orgId ? auth.orgId.toLowerCase().slice(0, 64) : undefined
    req.workspaceId = contentWorkspaceId(auth?.userId)

    if (!req.workspaceId) {
      // OAuth provider callback routes resolve tenant from signed `state` instead.
      req.workspaceId = undefined
    }
    return next()
  }

  const raw =
    req.headers['x-workspace-id'] || req.query.workspaceId || req.query.workspace
  req.workspaceId = normalize(raw)
  next()
}
