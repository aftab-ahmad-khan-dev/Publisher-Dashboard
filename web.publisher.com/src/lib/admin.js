import { NAV_ITEMS } from './constants'

export const PLATFORM_ADMIN_EMAIL = 'aftabahmadkhan.dev@gmail.com'

export function isPlatformAdmin(email) {
  return String(email || '').toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()
}

export const ADMIN_NAV_ITEM = {
  path: '/admin/users',
  label: 'Users',
  icon: 'users',
  adminOnly: true,
}

export function getNavItems(email) {
  if (!isPlatformAdmin(email)) return NAV_ITEMS
  return [...NAV_ITEMS, ADMIN_NAV_ITEM]
}
