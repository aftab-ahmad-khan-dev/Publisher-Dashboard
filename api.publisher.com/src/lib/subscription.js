import { getAuth } from '@clerk/express'
import { Subscription } from '../models/Subscription.js'
import { ADMIN_EMAIL, fetchClerkUser, primaryEmail } from '../middleware/admin.js'
import { clerkEnabled } from '../middleware/workspace.js'
import { effectivePlan } from './plans.js'

export async function resolveRequestEmail(req) {
  if (clerkEnabled) {
    try {
      const auth = getAuth(req)
      if (auth?.userId) {
        const clerkUser = await fetchClerkUser(auth.userId)
        const email = primaryEmail(clerkUser)
        if (email) return email
      }
    } catch {
      /* fall through */
    }
  }
  return String(req.headers['x-admin-email'] || req.headers['x-user-email'] || '')
    .trim()
    .toLowerCase()
}

export function isAdminEmail(email) {
  return String(email || '').toLowerCase() === ADMIN_EMAIL
}

export async function getOrCreateSubscription(workspaceId, userEmail = '') {
  let sub = await Subscription.findOne({ workspaceId })
  if (!sub) {
    sub = await Subscription.create({
      workspaceId,
      userEmail: userEmail || '',
      plan: 'none',
      status: 'unpaid',
    })
  } else if (userEmail && !sub.userEmail) {
    sub.userEmail = userEmail
    await sub.save()
  }
  return sub
}

export function mapSubscription(sub, isAdmin) {
  const plan = effectivePlan({
    plan: sub?.plan || 'none',
    status: sub?.status || 'unpaid',
    isAdmin,
  })
  return {
    workspaceId: sub?.workspaceId,
    userEmail: sub?.userEmail || '',
    plan,
    rawPlan: sub?.plan || 'none',
    status: isAdmin ? 'active' : sub?.status || 'unpaid',
    activatedAt: sub?.activatedAt || null,
    isAdmin: Boolean(isAdmin),
  }
}

export async function getBillingMe(req) {
  const email = await resolveRequestEmail(req)
  const isAdmin = isAdminEmail(email)
  const sub = await getOrCreateSubscription(req.workspaceId, email)
  return mapSubscription(sub, isAdmin)
}
