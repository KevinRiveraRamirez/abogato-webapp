import type { NotificationType } from '~~/shared/types/notification'

export type NotificationTone = 'primary' | 'success' | 'warning' | 'info' | 'error' | 'neutral'
export type NotificationGroup = 'tickets' | 'documents'
export type NotificationCenterTab = 'all' | NotificationGroup

export interface NotificationMeta {
  label: string
  icon: string
  tone: NotificationTone
  group: NotificationGroup
}

const notificationCatalog: Record<NotificationType, NotificationMeta> = {
  ticket_created: {
    label: 'Nuevo ticket',
    icon: 'i-lucide-file-plus-2',
    tone: 'primary',
    group: 'tickets',
  },
  ticket_assigned_lawyer: {
    label: 'Asignacion',
    icon: 'i-lucide-briefcase-business',
    tone: 'info',
    group: 'tickets',
  },
  ticket_comment_from_client: {
    label: 'Comentario del cliente',
    icon: 'i-lucide-message-square-dot',
    tone: 'warning',
    group: 'tickets',
  },
  ticket_comment_from_staff: {
    label: 'Respuesta del equipo',
    icon: 'i-lucide-message-circle-reply',
    tone: 'info',
    group: 'tickets',
  },
  ticket_reopen_requested: {
    label: 'Reapertura',
    icon: 'i-lucide-rotate-ccw',
    tone: 'warning',
    group: 'tickets',
  },
  ticket_reopen_approved: {
    label: 'Reapertura aprobada',
    icon: 'i-lucide-badge-check',
    tone: 'success',
    group: 'tickets',
  },
  ticket_reopen_rejected: {
    label: 'Reapertura rechazada',
    icon: 'i-lucide-ban',
    tone: 'error',
    group: 'tickets',
  },
  ticket_taken: {
    label: 'Caso tomado',
    icon: 'i-lucide-hourglass',
    tone: 'info',
    group: 'tickets',
  },
  ticket_status_changed: {
    label: 'Cambio de estado',
    icon: 'i-lucide-arrow-right-left',
    tone: 'primary',
    group: 'tickets',
  },
  document_approved: {
    label: 'Documento aprobado',
    icon: 'i-lucide-file-check-2',
    tone: 'success',
    group: 'documents',
  },
  document_rejected: {
    label: 'Documento rechazado',
    icon: 'i-lucide-file-x-2',
    tone: 'error',
    group: 'documents',
  },
}

const fallbackMeta: NotificationMeta = {
  label: 'Notificacion',
  icon: 'i-lucide-bell',
  tone: 'neutral',
  group: 'tickets',
}

export const notificationTabOptions: Array<{ key: NotificationCenterTab, label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'tickets', label: 'Casos' },
  { key: 'documents', label: 'Documentos' },
]

export const notificationTypeOptions = (Object.entries(notificationCatalog) as Array<[NotificationType, NotificationMeta]>)
  .map(([type, meta]) => ({
    type,
    ...meta,
  }))

export function getAllNotificationTypes(): NotificationType[] {
  return notificationTypeOptions.map(option => option.type)
}

export function getNotificationMeta(type: string): NotificationMeta {
  return notificationCatalog[type as NotificationType] ?? fallbackMeta
}

export function getNotificationGroup(type: string): NotificationGroup | null {
  return notificationCatalog[type as NotificationType]?.group ?? null
}

export function isNotificationType(type: string): type is NotificationType {
  return type in notificationCatalog
}
