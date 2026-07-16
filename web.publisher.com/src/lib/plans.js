import { isPlatformAdmin } from './admin'

export const PLAN_PRICES = {
  starter: 5,
  growth: 10,
  pro: 20,
}

export const PLAN_META = {
  none: {
    id: 'none',
    name: 'No plan',
    price: 0,
    blurb: 'Choose a plan to unlock publishing tools.',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 5,
    blurb: 'Compose + Bulk upload',
    features: ['Compose', 'Bulk Upload'],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 10,
    blurb: 'Compose, Bulk, and Mail Box',
    features: ['Compose', 'Bulk Upload', 'Mail Box'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 20,
    blurb: 'Full platform access',
    features: [
      'Compose',
      'Bulk Upload',
      'Mail Box',
      'Drafts',
      'Scheduled',
      'Calendar',
      'Integrations',
      'Setup Guide',
    ],
  },
}

/** Path → feature key used for gating */
export const PATH_FEATURE = {
  '/compose': 'compose',
  '/bulk': 'bulk',
  '/email': 'email',
  '/drafts': 'drafts',
  '/scheduled': 'scheduled',
  '/calendar': 'calendar',
  '/api-config': 'api',
  '/guide': 'guide',
  '/admin/users': 'admin',
  '/billing': 'billing',
}

export const FEATURE_BY_PLAN = {
  none: [],
  starter: ['compose', 'bulk'],
  growth: ['compose', 'bulk', 'email'],
  pro: [
    'compose',
    'bulk',
    'email',
    'drafts',
    'scheduled',
    'calendar',
    'api',
    'guide',
    'admin',
    'billing',
  ],
}

export function effectivePlan(subscription, email) {
  if (isPlatformAdmin(email)) return 'pro'
  if (!subscription) return 'none'
  if (subscription.isAdmin) return 'pro'
  if (subscription.status === 'active' && subscription.plan && subscription.plan !== 'none') {
    return subscription.plan
  }
  return 'none'
}

export function planAllowsFeature(plan, feature) {
  if (feature === 'billing') return true
  if (plan === 'pro') return true
  return (FEATURE_BY_PLAN[plan] || []).includes(feature)
}

export function pathIsLocked(pathname, plan, email) {
  if (isPlatformAdmin(email)) return false
  const feature = PATH_FEATURE[pathname]
  if (!feature) return false
  return !planAllowsFeature(plan, feature)
}

export function featureForPath(pathname) {
  return PATH_FEATURE[pathname] || null
}
