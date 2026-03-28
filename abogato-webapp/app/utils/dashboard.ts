import type { Database } from '~/types/database.types'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
export type TicketDisplayStatus = TicketStatus | 'reopened'
export type TicketPriority = 'low' | 'normal' | 'high'
export type DocumentStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type TicketStatusColor = 'primary' | 'warning' | 'info' | 'success' | 'neutral' | 'error'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type TicketHistoryRow = Database['public']['Tables']['ticket_historial']['Row']

export type DashboardProfile = Pick<
  ProfileRow,
  | 'user_id'
  | 'display_name'
  | 'first_name'
  | 'last_name'
  | 'contact_email'
  | 'contact_phone'
  | 'personal_address'
  | 'office_address'
>

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

export const ticketDisplayStatusLabels: Record<TicketDisplayStatus, string> = {
  ...ticketStatusLabels,
  reopened: 'Reabierto',
}

export const ticketStatusColors: Record<TicketStatus, TicketStatusColor> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
  cancelled: 'error',
}

export const ticketDisplayStatusColors: Record<TicketDisplayStatus, TicketStatusColor> = {
  ...ticketStatusColors,
  reopened: 'primary',
}

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
}

export const ticketPriorityColors: Record<TicketPriority, 'neutral' | 'warning' | 'error'> = {
  low: 'neutral',
  normal: 'warning',
  high: 'error',
}

export const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: 'Borrador',
  submitted: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

export const documentStatusColors: Record<DocumentStatus, 'neutral' | 'warning' | 'success' | 'error'> = {
  draft: 'neutral',
  submitted: 'warning',
  approved: 'success',
  rejected: 'error',
}

export function normalizeTicketStatus(value: string | null | undefined): TicketStatus {
  return ['open', 'in_progress', 'resolved', 'closed', 'cancelled'].includes(String(value))
    ? value as TicketStatus
    : 'open'
}

export function isReopenedHistoryEntry(
  entry: Pick<TicketHistoryRow, 'old_status' | 'new_status'>
) {
  return entry.new_status === 'open'
    && ['resolved', 'closed', 'cancelled'].includes(String(entry.old_status))
}

export function getReopenedTicketIds(
  entries: Array<Pick<TicketHistoryRow, 'ticket_id' | 'old_status' | 'new_status'>>
) {
  const reopenedTicketIds = new Set<string>()

  for (const entry of entries) {
    if (!entry.ticket_id || !isReopenedHistoryEntry(entry)) continue
    reopenedTicketIds.add(entry.ticket_id)
  }

  return reopenedTicketIds
}

export function getTicketDisplayStatus(ticket: { status: TicketStatus, wasReopened?: boolean | null }): TicketDisplayStatus {
  if (ticket.status === 'open' && ticket.wasReopened) {
    return 'reopened'
  }

  return ticket.status
}

export function normalizeTicketPriority(value: string | null | undefined): TicketPriority {
  return ['low', 'normal', 'high'].includes(String(value))
    ? value as TicketPriority
    : 'normal'
}

export function normalizeDocumentStatus(value: string | null | undefined): DocumentStatus {
  return ['draft', 'submitted', 'approved', 'rejected'].includes(String(value))
    ? value as DocumentStatus
    : 'draft'
}

export function getProfileDisplayName(profile: Partial<DashboardProfile> | null | undefined) {
  if (!profile) return 'Sin nombre disponible'

  const explicitName = profile.display_name?.trim()
  if (explicitName) return explicitName

  const joinedName = [profile.first_name?.trim(), profile.last_name?.trim()]
    .filter(Boolean)
    .join(' ')

  if (joinedName) return joinedName
  return 'Sin nombre disponible'
}

export function getFriendlyFirstName(profile: Partial<DashboardProfile> | null | undefined) {
  if (!profile) return 'Hola'

  const explicitName = profile.display_name?.trim()
  if (explicitName) return explicitName.split(' ')[0] || explicitName

  const firstName = profile.first_name?.trim()
  if (firstName) return firstName

  const lastName = profile.last_name?.trim()
  if (lastName) return lastName

  return 'Hola'
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Fecha no disponible'

  return new Date(value).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Fecha no disponible'

  return new Date(value).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function percentage(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}
