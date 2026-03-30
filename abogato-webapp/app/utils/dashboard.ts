import type { Database } from '~/types/database.types'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
export type TicketDisplayStatus = TicketStatus | 'reopened'
export type TicketPriority = 'low' | 'normal' | 'high'
export type DocumentStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type TicketStatusColor = 'primary' | 'warning' | 'info' | 'success' | 'neutral' | 'error'
export type DocumentWorkflowAudience = 'client' | 'lawyer' | 'admin'
export type DocumentWorkflowPhaseKey =
  | 'drafting'
  | 'pending_lawyer'
  | 'legal_review'
  | 'returned_for_correction'
  | 'approved'
  | 'cancelled'

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

export function getDocumentWorkflowPhase(params: {
  documentStatus?: string | null
  latestVersionStatus?: string | null
  ticketStatus?: string | null
  assignedTo?: string | null
  audience?: DocumentWorkflowAudience
  latestVersionSource?: string | null
}): {
  key: DocumentWorkflowPhaseKey
  label: string
  description: string
  color: TicketStatusColor
} {
  const audience = params.audience ?? 'client'
  const documentStatus = getEffectiveDocumentStatus({
    documentStatus: params.documentStatus,
    latestVersionStatus: params.latestVersionStatus,
  })
  const ticketStatus = normalizeTicketStatus(params.ticketStatus)

  if (ticketStatus === 'cancelled') {
    return {
      key: 'cancelled',
      label: 'Ticket cancelado',
      description: audience === 'lawyer'
        ? 'Este trámite fue cancelado y ya no requiere revisión documental.'
        : 'Este trámite fue cancelado y ya no admite cambios sobre el documento.',
      color: 'neutral',
    }
  }

  if (documentStatus === 'approved') {
    return {
      key: 'approved',
      label: 'Documento aprobado',
      description: audience === 'lawyer'
        ? 'La última versión ya quedó aprobada y lista para cerrar el siguiente paso del caso.'
        : 'La última versión ya fue aprobada por el equipo legal y queda lista para tu seguimiento.',
      color: 'success',
    }
  }

  if (documentStatus === 'rejected') {
    return {
      key: 'returned_for_correction',
      label: 'Devuelto para corrección',
      description: audience === 'lawyer'
        ? 'Ya registraste observaciones. Ahora el cliente debe corregir y reenviar la última versión.'
        : 'El abogado dejó observaciones en la última versión. Corregí el documento y reenviá una nueva versión.',
      color: 'warning',
    }
  }

  if (documentStatus === 'submitted') {
    if (params.latestVersionSource === 'correction') {
      if (audience === 'lawyer') {
        return {
          key: 'legal_review',
          label: 'Corrección recibida',
          description: 'El cliente ya reenviò una versión corregida. Revisala para aprobarla o devolverla con nuevas observaciones.',
          color: 'info',
        }
      }

      return {
        key: 'legal_review',
        label: 'Documento corregido en espera de aprobación',
        description: 'Ya enviaste una versión corregida. Ahora el abogado debe revisarla antes de aprobarla o devolverla nuevamente.',
        color: 'info',
      }
    }

    if (!params.assignedTo || ticketStatus === 'open') {
      return {
        key: 'pending_lawyer',
        label: 'Pendiente de abogado',
        description: audience === 'lawyer'
          ? 'La versión más reciente ya está lista. Tomá el caso para comenzar la revisión legal.'
          : 'Tu documento ya fue enviado. Ahora queda pendiente de que un abogado tome el caso.',
        color: 'warning',
      }
    }

    return {
      key: 'legal_review',
      label: 'En revisión legal',
      description: audience === 'lawyer'
        ? 'La versión más reciente está en tus manos para revisar, aprobar o devolver con observaciones.'
        : 'El abogado asignado está revisando la última versión del documento.',
      color: 'info',
    }
  }

  return {
    key: 'drafting',
    label: 'Preparando documento',
    description: audience === 'lawyer'
      ? 'Todavía no hay una versión enviada a revisión en este ticket.'
      : 'Todavía no hay una versión enviada a revisión en este ticket.',
    color: 'neutral',
  }
}

export function getEffectiveDocumentStatus(params: {
  documentStatus?: string | null
  latestVersionStatus?: string | null
}): DocumentStatus {
  return normalizeDocumentStatus(params.latestVersionStatus ?? params.documentStatus)
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
