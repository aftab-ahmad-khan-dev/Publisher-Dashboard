import { NAV_ITEMS, NAV_GROUPS } from './constants'

export const PLATFORM_ADMIN_EMAIL = 'aftabahmadkhan.dev@gmail.com'

export function isPlatformAdmin(email) {
  return String(email || '').toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()
}

export const ADMIN_NAV_ITEM = {
  path: '/admin/users',
  label: 'Users',
  icon: 'users',
  description: 'Platform admin',
  adminOnly: true,
}

export function getNavItems(email) {
  if (!isPlatformAdmin(email)) return NAV_ITEMS
  return [...NAV_ITEMS, ADMIN_NAV_ITEM]
}

export function getNavGroups(email) {
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: [...g.items],
  }))

  if (isPlatformAdmin(email)) {
    const workspace = groups.find((g) => g.id === 'workspace')
    workspace?.items.push(ADMIN_NAV_ITEM)
  }

  return groups
}
