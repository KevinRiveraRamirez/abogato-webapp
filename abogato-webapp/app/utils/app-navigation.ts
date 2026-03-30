import type { NavigationMenuItem } from '#ui/types'
import {
  normalizeAppRole as normalizeSharedAppRole,
  roleLabels,
  type AppRole,
} from '~~/shared/roles'

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
      { label: 'Buscar', icon: 'i-lucide-search', to: '/buscar' },
    ],
  },
  {
    id: 'assets',
    label: 'Mis bienes',
    items: [
      { label: 'Bienes y muebles', icon: 'i-lucide-package', to: '/client/bienes' },
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
      { label: 'Seguridad', icon: 'i-lucide-shield', to: '/account/security' },
    ],
  },
]

const lawyerSections: NavigationSection[] = [
  {
    id: 'overview',
    label: 'General',
    items: [
      { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/lawyer/dashboard' },
      { label: 'Buscar', icon: 'i-lucide-search', to: '/buscar' },
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
      { label: 'Seguridad', icon: 'i-lucide-shield', to: '/account/security' },
    ],
  },
]

const adminSections: NavigationSection[] = [
  {
    id: 'overview',
    label: 'General',
    items: [
      { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin/dashboard' },
      { label: 'Buscar', icon: 'i-lucide-search', to: '/buscar' },
    ],
  },
  {
    id: 'management',
    label: 'Administracion',
    items: [
      { label: 'Tickets', icon: 'i-lucide-ticket', to: '/admin/tickets' },
      { label: 'Plantillas', icon: 'i-lucide-file-text', to: '/admin/plantillas' },
      { label: 'Plantillas de bienes', icon: 'i-lucide-package', to: '/admin/plantillas/bienes' },
      { label: 'Usuarios', icon: 'i-lucide-users', to: '/admin/usuarios' },
      { label: 'Auditoría', icon: 'i-lucide-history', to: '/admin/auditoria' },
      { label: 'Asistente IA', icon: 'i-lucide-bot', to: '/admin/asistente' },
    ],
  },
  {
    id: 'account',
    label: 'Cuenta',
    items: [
      { label: 'Mi perfil', icon: 'i-lucide-user-round', to: '/account/profile' },
      { label: 'Seguridad', icon: 'i-lucide-shield', to: '/account/security' },
    ],
  },
]

export function normalizeAppRole(role: string | null | undefined): AppRole {
  return normalizeSharedAppRole(role)
}

export function getDashboardPathForRole(role: string | null | undefined) {
  const normalizedRole = normalizeSharedAppRole(role)

  if (normalizedRole === 'admin' || normalizedRole === 'superadmin') return '/admin/dashboard'
  if (normalizedRole === 'abogado') return '/lawyer/dashboard'
  return '/client/dashboard'
}

export function getRoleLabel(role: string | null | undefined) {
  return roleLabels[normalizeSharedAppRole(role)]
}

export function getNavigationItems(role: string | null | undefined): NavigationMenuItem[] {
  return getNavigationSections(role).flatMap(section => section.items)
}

export function getNavigationSections(role: string | null | undefined): NavigationSection[] {
  const normalizedRole = normalizeSharedAppRole(role)

  if (normalizedRole === 'admin' || normalizedRole === 'superadmin') return adminSections
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
  if (path === '/buscar') return 'Buscar'
  if (path.startsWith('/traspaso-carro/')) return 'Traspaso de carro'
  return 'Panel'
}