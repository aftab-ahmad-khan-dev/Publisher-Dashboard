import { NAV_ITEMS, NAV_GROUPS } from './constants'
import { effectivePlan, planAllowsFeature, PATH_FEATURE } from './plans'

export const PLATFORM_ADMIN_EMAIL = 'aftabahmadkhan.dev@gmail.com'

export function isPlatformAdmin(email) {
  return String(email || '').toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()
}

export const ADMIN_NAV_ITEM = {
  path: '/admin/users',
  label: 'Users',
  icon: 'users',
  description: 'Signups & payments',
  adminOnly: true,
}

function withLockFlags(items, email, subscription) {
  const plan = effectivePlan(subscription, email)
  return items.map((item) => {
    const feature = PATH_FEATURE[item.path]
    const locked = feature ? !planAllowsFeature(plan, feature) : false
    return { ...item, locked }
  })
}

export function getNavItems(email, subscription) {
  const base = isPlatformAdmin(email) ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS
  return withLockFlags(base, email, subscription)
}

export function getNavGroups(email, subscription) {
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: withLockFlags([...g.items], email, subscription),
  }))

  if (isPlatformAdmin(email)) {
    const workspace = groups.find((g) => g.id === 'workspace')
    workspace?.items.push({ ...ADMIN_NAV_ITEM, locked: false })
  }

  return groups
}
