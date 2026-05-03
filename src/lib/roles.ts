import type { Role } from '@/types/supabase'

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  sales_staff: 1,
}

export function isAtLeast(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

export type NavItem = {
  label: string
  href: string
  minRole: Role
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Memos',     href: '/dashboard/memos',     minRole: 'sales_staff' },
  { label: 'Products',  href: '/dashboard/products',  minRole: 'sales_staff' },
  { label: 'Customers', href: '/dashboard/customers', minRole: 'sales_staff' },
  { label: 'Payments',  href: '/dashboard/payments',  minRole: 'sales_staff' },
  { label: 'Returns',   href: '/dashboard/returns',   minRole: 'sales_staff' },
  { label: 'Reports',  href: '/dashboard/reports',  minRole: 'manager'     },
  { label: 'Settings', href: '/dashboard/settings', minRole: 'super_admin' },
]

// Proxy uses this to gate specific route prefixes
export const ROUTE_MIN_ROLES: Array<[string, Role]> = [
  ['/dashboard/settings', 'super_admin'],
  ['/dashboard/reports',  'manager'],
]
