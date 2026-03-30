export const APP_ROLES = ['cliente', 'abogado', 'admin', 'superadmin'] as const
export type AppRole = (typeof APP_ROLES)[number]

export const MANAGEABLE_USER_ROLES = ['cliente', 'abogado', 'admin'] as const
export type ManageableUserRole = (typeof MANAGEABLE_USER_ROLES)[number]

export const LAWYER_AVAILABILITY_STATUSES = ['available', 'busy', 'offline'] as const
export type LawyerAvailabilityStatus = (typeof LAWYER_AVAILABILITY_STATUSES)[number]

export const roleLabels: Record<AppRole, string> = {
  cliente: 'Cliente',
  abogado: 'Abogado',
  admin: 'Administrador',
  superadmin: 'Superadministrador',
}

export const roleDescriptions: Record<AppRole, string> = {
  cliente: 'Portal cliente',
  abogado: 'Operación legal',
  admin: 'Administración operativa',
  superadmin: 'Control total del sistema',
}

export const lawyerAvailabilityLabels: Record<LawyerAvailabilityStatus, string> = {
  available: 'Disponible',
  busy: 'Ocupado',
  offline: 'Fuera de cola',
}

export const lawyerAvailabilityDescriptions: Record<LawyerAvailabilityStatus, string> = {
  available: 'Puede recibir nuevos tickets automáticos.',
  busy: 'Sigue activo, pero no entra en autoasignación.',
  offline: 'Queda fuera de la cola automática hasta reactivarse.',
}

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === 'string' && APP_ROLES.includes(role as AppRole)
}

export function normalizeAppRole(role: string | null | undefined): AppRole {
  if (isAppRole(role)) return role
  return 'cliente'
}

export function isLawyerRole(role: string | null | undefined) {
  return normalizeAppRole(role) === 'abogado'
}

export function isSuperadminRole(role: string | null | undefined) {
  return normalizeAppRole(role) === 'superadmin'
}

export function isAdminLikeRole(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role)
  return normalizedRole === 'admin' || normalizedRole === 'superadmin'
}

export function canManageAdminAccounts(role: string | null | undefined) {
  return isSuperadminRole(role)
}

export function hasProfessionalContext(role: string | null | undefined) {
  const normalizedRole = normalizeAppRole(role)
  return normalizedRole === 'abogado' || normalizedRole === 'admin' || normalizedRole === 'superadmin'
}

export function isLawyerAvailabilityStatus(value: unknown): value is LawyerAvailabilityStatus {
  return typeof value === 'string' && LAWYER_AVAILABILITY_STATUSES.includes(value as LawyerAvailabilityStatus)
}

export function normalizeLawyerAvailabilityStatus(
  value: string | null | undefined,
  fallback: LawyerAvailabilityStatus = 'available',
) {
  return isLawyerAvailabilityStatus(value) ? value : fallback
}
