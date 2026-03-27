import type { NotificationType } from '~~/shared/types/notification'

export type NotificationTone = 'primary' | 'success' | 'warning' | 'info' | 'error' | 'neutral'

export interface NotificationMeta {
  label: string
  icon: string
  tone: NotificationTone
}

const notificationCatalog: Record<NotificationType, NotificationMeta> = {
  ticket_created: {
    label: 'Nuevo ticket',
    icon: 'i-lucide-file-plus-2',
    tone: 'primary',
  },
  ticket_assigned_lawyer: {
    label: 'Asignacion',
    icon: 'i-lucide-briefcase-business',
    tone: 'info',
  },
  ticket_comment_from_client: {
    label: 'Comentario del cliente',
    icon: 'i-lucide-message-square-dot',
    tone: 'warning',
  },
  ticket_comment_from_staff: {
    label: 'Respuesta del equipo',
    icon: 'i-lucide-message-circle-reply',
    tone: 'info',
  },
  ticket_reopen_requested: {
    label: 'Reapertura',
    icon: 'i-lucide-rotate-ccw',
    tone: 'warning',
  },
  ticket_reopen_approved: {
    label: 'Reapertura aprobada',
    icon: 'i-lucide-badge-check',
    tone: 'success',
  },
  ticket_reopen_rejected: {
    label: 'Reapertura rechazada',
    icon: 'i-lucide-ban',
    tone: 'error',
  },
  ticket_taken: {
    label: 'Caso tomado',
    icon: 'i-lucide-hourglass',
    tone: 'info',
  },
  ticket_status_changed: {
    label: 'Cambio de estado',
    icon: 'i-lucide-arrow-right-left',
    tone: 'primary',
  },
  document_approved: {
    label: 'Documento aprobado',
    icon: 'i-lucide-file-check-2',
    tone: 'success',
  },
  document_rejected: {
    label: 'Documento rechazado',
    icon: 'i-lucide-file-x-2',
    tone: 'error',
  },
}

const fallbackMeta: NotificationMeta = {
  label: 'Notificacion',
  icon: 'i-lucide-bell',
  tone: 'neutral',
}

export function getNotificationMeta(type: string): NotificationMeta {
  return notificationCatalog[type as NotificationType] ?? fallbackMeta
}
