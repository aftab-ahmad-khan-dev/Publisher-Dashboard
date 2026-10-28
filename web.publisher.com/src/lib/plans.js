import { isPlatformAdmin } from './admin'

export const PLAN_PRICES = {
  starter: 19.99,
  growth: 39.99,
  pro: 49.99,
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
    price: 19.99,
    blurb: 'Publish and bulk-schedule across your channels',
    features: [
      'Compose posts',
      'Bulk upload & schedule',
      'Multi-platform publish',
      'Bank-transfer activation',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 39.99,
    blurb: 'Publishing plus Mail Box outreach and Sales Tracker',
    features: [
      'Everything in Starter',
      'Mail Box campaigns',
      'Lead import & tracking',
      'Meetings & calendar CTAs',
      'Sales Tracker CRM',
      'Open / click insights',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49.99,
    blurb: 'Full Publisher Suite for operators who ship',
    features: [
      'Everything in Growth',
      'Drafts & Scheduled queue',
      'Content Calendar',
      'Integrations hub',
      'Setup Guide',
      'Priority activation support',
    ],
  },
}

/** Path → feature key used for gating */
export const PATH_FEATURE = {
  '/overview': 'compose',
  '/compose': 'compose',
  '/bulk': 'bulk',
  '/email': 'email',
  '/sales': 'email',
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
