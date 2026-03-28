import type { NavigationMenuItem } from '#ui/types'

export type AppRole = 'cliente' | 'abogado' | 'admin'

const clientItems: NavigationMenuItem[] = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/client/dashboard' },
  { label: 'Mis tickets', icon: 'i-lucide-ticket', to: '/tickets' },
  { label: 'Traspaso de carro', icon: 'i-lucide-car-front', to: '/traspaso-carro' },
  { label: 'Mi perfil', icon: 'i-lucide-user-round', to: '/account/profile' },
]

const lawyerItems: NavigationMenuItem[] = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/lawyer/dashboard' },
  { label: 'Mis casos', icon: 'i-lucide-scale', to: '/lawyer/tickets' },
  { label: 'Traspaso de carro', icon: 'i-lucide-car-front', to: '/traspaso-carro' },
  { label: 'Mi perfil', icon: 'i-lucide-user-round', to: '/account/profile' },
]

const adminItems: NavigationMenuItem[] = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin/dashboard' },
  { label: 'Tickets', icon: 'i-lucide-ticket', to: '/admin/tickets' },
  { label: 'Usuarios', icon: 'i-lucide-users', to: '/admin/usuarios' },
  { label: 'Mi perfil', icon: 'i-lucide-user-round', to: '/account/profile' },
]

export function normalizeAppRole(role: string | null | undefined): AppRole {
  if (role === 'admin' || role === 'abogado') return role
  return 'cliente'
}

export function getDashboardPathForRole(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role)

  if (normalizedRole === 'admin') return '/admin/dashboard'
  if (normalizedRole === 'abogado') return '/lawyer/dashboard'
  return '/client/dashboard'
}

export function getRoleLabel(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role)

  if (normalizedRole === 'admin') return 'Administrador'
  if (normalizedRole === 'abogado') return 'Abogado'
  return 'Cliente'
}

export function getNavigationItems(role: string | null | undefined): NavigationMenuItem[] {
  const normalizedRole = normalizeAppRole(role)

  if (normalizedRole === 'admin') return adminItems
  if (normalizedRole === 'abogado') return lawyerItems
  return clientItems
}

export function getNavigationTitle(path: string, role: string | null | undefined) {
  const items = getNavigationItems(role)
  const matchedItem = items.find((item) => {
    if (!item.to || typeof item.to !== 'string') return false

    return path === item.to || path.startsWith(`${item.to}/`)
  })

  if (matchedItem?.label) return matchedItem.label

  if (path.startsWith('/ticket/')) return 'Detalle del caso'
  if (path.startsWith('/traspaso-carro/')) return 'Traspaso de carro'
  return 'Panel'
}
