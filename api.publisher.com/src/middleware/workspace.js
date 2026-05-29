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

/**
 * Derive the tenant for this request.
 *
 * With Clerk configured, the workspace is the *verified* active organization
 * (or a personal `user_<id>` workspace) read from the session token — never a
 * client-supplied header, so one tenant cannot read another's data.
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
    if (auth?.orgId) {
      req.workspaceId = auth.orgId.toLowerCase().slice(0, 64)
      return next()
    }
    if (auth?.userId) {
      req.workspaceId = `user_${auth.userId}`.toLowerCase().slice(0, 64)
      return next()
    }
    // No identity (e.g. OAuth provider callback): leave unset — callback
    // routes resolve their tenant from the signed OAuth `state` instead.
    req.workspaceId = undefined
    return next()
  }

  const raw =
    req.headers['x-workspace-id'] || req.query.workspaceId || req.query.workspace
  req.workspaceId = normalize(raw)
  next()
}
