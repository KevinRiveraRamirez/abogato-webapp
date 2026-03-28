import type { NavigationMenuItem } from '#ui/types'

export type AppRole = 'cliente' | 'abogado' | 'admin'
export type NavigationSection = {
  id: string
  label: string
  items: NavigationMenuItem[]
}

const clientSections: NavigationSection[] = [
  {
    id: 'overview',
    label: 'General',
    items: [
      { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/client/dashboard' },
    ],
  },
  {
    id: 'matters',
    label: 'Gestiones',
    items: [
      { label: 'Mis tickets', icon: 'i-lucide-ticket', to: '/tickets' },
      { label: 'Traspaso de carro', icon: 'i-lucide-car-front', to: '/traspaso-carro' },
    ],
  },
  {
    id: 'account',
    label: 'Cuenta',
    items: [
      { label: 'Mi perfil', icon: 'i-lucide-user-round', to: '/account/profile' },
    ],
  },
]

const lawyerSections: NavigationSection[] = [
  {
    id: 'overview',
    label: 'General',
    items: [
      { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/lawyer/dashboard' },
    ],
  },
  {
    id: 'matters',
    label: 'Casos',
    items: [
      { label: 'Mis casos', icon: 'i-lucide-scale', to: '/lawyer/tickets' },
      { label: 'Traspaso de carro', icon: 'i-lucide-car-front', to: '/traspaso-carro' },
    ],
  },
  {
    id: 'account',
    label: 'Cuenta',
    items: [
      { label: 'Mi perfil', icon: 'i-lucide-user-round', to: '/account/profile' },
    ],
  },
]

const adminSections: NavigationSection[] = [
  {
    id: 'overview',
    label: 'General',
    items: [
      { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin/dashboard' },
    ],
  },
  {
    id: 'management',
    label: 'Administracion',
    items: [
      { label: 'Tickets', icon: 'i-lucide-ticket', to: '/admin/tickets' },
      { label: 'Usuarios', icon: 'i-lucide-users', to: '/admin/usuarios' },
    ],
  },
  {
    id: 'account',
    label: 'Cuenta',
    items: [
      { label: 'Mi perfil', icon: 'i-lucide-user-round', to: '/account/profile' },
    ],
  },
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
  return getNavigationSections(role).flatMap(section => section.items)
}

export function getNavigationSections(role: string | null | undefined): NavigationSection[] {
  const normalizedRole = normalizeAppRole(role)

  if (normalizedRole === 'admin') return adminSections
  if (normalizedRole === 'abogado') return lawyerSections
  return clientSections
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
