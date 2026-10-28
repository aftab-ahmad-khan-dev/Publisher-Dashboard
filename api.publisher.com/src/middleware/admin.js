import { getAuth } from '@clerk/express'
import { clerkEnabled } from './workspace.js'

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'aftabahmadkhan.dev@gmail.com').toLowerCase()

async function fetchClerkUser(userId) {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) return null
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  if (!res.ok) return null
  return res.json()
}

function primaryEmail(clerkUser) {
  if (!clerkUser?.email_addresses?.length) return ''
  const primaryId = clerkUser.primary_email_address_id
  const match = clerkUser.email_addresses.find((e) => e.id === primaryId)
  return (match?.email_address || clerkUser.email_addresses[0]?.email_address || '').toLowerCase()
}

function headerAdminEmail(req) {
  return String(req.headers['x-admin-email'] || '').trim().toLowerCase()
}

/** Only the platform owner (ADMIN_EMAIL) may access admin routes. */
export async function requirePlatformAdmin(req, res, next) {
  try {
    if (clerkEnabled) {
      const auth = getAuth(req)
      if (!auth?.userId) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' })
      }

      const clerkUser = await fetchClerkUser(auth.userId)
      const email = primaryEmail(clerkUser)
      if (!email || email !== ADMIN_EMAIL) {
        return res.status(403).json({ ok: false, error: 'Forbidden' })
      }
      req.adminUser = { id: auth.userId, email }
      return next()
    }

    // Local dev without CLERK_SECRET_KEY: trust X-Admin-Email from the signed-in web app.
    const email = headerAdminEmail(req)
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({
        ok: false,
        error:
          'Admin access denied. Set CLERK_SECRET_KEY in api.publisher.com/.env for production-grade auth.',
      })
    }
    req.adminUser = { email }
    return next()
  } catch (err) {
    next(err)
  }
}

export { ADMIN_EMAIL, fetchClerkUser, primaryEmail }
