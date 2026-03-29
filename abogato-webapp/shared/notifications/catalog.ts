import type { NotificationRecord, NotificationType } from '~~/shared/types/notification'

export type NotificationTone = 'primary' | 'success' | 'warning' | 'info' | 'error' | 'neutral'
export type NotificationGroup = 'tickets' | 'documents'
export type NotificationCenterTab = 'all' | NotificationGroup

export interface NotificationMeta {
  label: string
  icon: string
  tone: NotificationTone
  group: NotificationGroup
  previewTitle: string
  previewBody: string
}

const notificationCatalog: Record<NotificationType, NotificationMeta> = {
  ticket_created: {
    label: 'Nuevo ticket',
    icon: 'i-lucide-file-plus-2',
    tone: 'primary',
    group: 'tickets',
    previewTitle: 'Nuevo ticket recibido',
    previewBody: 'Se creó el ticket "Solicitud de divorcio" y ya está listo para revisión.',
  },
  ticket_assigned_lawyer: {
    label: 'Asignacion',
    icon: 'i-lucide-briefcase-business',
    tone: 'info',
    group: 'tickets',
    previewTitle: 'Tenés un caso asignado',
    previewBody: 'Se te asignó el ticket "Traspaso de vehículo".',
  },
  ticket_unassigned_lawyer: {
    label: 'Caso reasignado',
    icon: 'i-lucide-user-round-minus',
    tone: 'warning',
    group: 'tickets',
    previewTitle: 'Caso reasignado',
    previewBody: 'El ticket "Poder generalísimo" fue reasignado y ya no forma parte de tu bandeja.',
  },
  ticket_comment_from_client: {
    label: 'Comentario del cliente',
    icon: 'i-lucide-message-square-dot',
    tone: 'warning',
    group: 'tickets',
    previewTitle: 'Nuevo comentario del cliente',
    previewBody: 'Hay una respuesta nueva en el ticket "Cambio de municipalidad".',
  },
  ticket_comment_from_staff: {
    label: 'Respuesta del equipo',
    icon: 'i-lucide-message-circle-reply',
    tone: 'info',
    group: 'tickets',
    previewTitle: 'Nuevo comentario en tu caso',
    previewBody: 'Recibiste una actualización del equipo en el ticket "Contrato de divorcio".',
  },
  ticket_reopen_requested: {
    label: 'Reapertura',
    icon: 'i-lucide-rotate-ccw',
    tone: 'warning',
    group: 'tickets',
    previewTitle: 'Solicitud de reapertura',
    previewBody: 'El cliente pidió reabrir el ticket "Reconocimiento de firma".',
  },
  ticket_reopen_approved: {
    label: 'Reapertura aprobada',
    icon: 'i-lucide-badge-check',
    tone: 'success',
    group: 'tickets',
    previewTitle: 'Reapertura aprobada',
    previewBody: 'Tu solicitud de reapertura para el ticket "Poder especial" fue aprobada.',
  },
  ticket_reopen_rejected: {
    label: 'Reapertura rechazada',
    icon: 'i-lucide-ban',
    tone: 'error',
    group: 'tickets',
    previewTitle: 'Reapertura rechazada',
    previewBody: 'La solicitud para reabrir el ticket "Traspaso de vehículo" fue rechazada.',
  },
  ticket_taken: {
    label: 'Caso tomado',
    icon: 'i-lucide-hourglass',
    tone: 'info',
    group: 'tickets',
    previewTitle: 'Tu caso ya fue tomado',
    previewBody: 'Un abogado ya está revisando el ticket "Solicitud de divorcio".',
  },
  ticket_status_changed: {
    label: 'Cambio de estado',
    icon: 'i-lucide-arrow-right-left',
    tone: 'primary',
    group: 'tickets',
    previewTitle: 'Cambio en tu caso',
    previewBody: 'El ticket "Contrato de divorcio" cambió de Pendiente a En revisión.',
  },
  document_approved: {
    label: 'Documento aprobado',
    icon: 'i-lucide-file-check-2',
    tone: 'success',
    group: 'documents',
    previewTitle: 'Documento aprobado',
    previewBody: 'El documento del ticket "Poder generalísimo" fue aprobado.',
  },
  document_rejected: {
    label: 'Documento rechazado',
    icon: 'i-lucide-file-x-2',
    tone: 'error',
    group: 'documents',
    previewTitle: 'Documento requiere correcciones',
    previewBody: 'El documento del ticket "Traspaso de vehículo" necesita ajustes. Revisá el detalle para ver el motivo.',
  },
}

const fallbackMeta: NotificationMeta = {
  label: 'Notificacion',
  icon: 'i-lucide-bell',
  tone: 'neutral',
  group: 'tickets',
  previewTitle: 'Notificación',
  previewBody: 'Acá vas a ver el resumen de una notificación interna de la plataforma.',
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

export function buildNotificationPreview(type: NotificationType): NotificationRecord {
  const meta = getNotificationMeta(type)
  const now = new Date().toISOString()

  return {
    id: `preview-${type}`,
    recipient_user_id: 'preview-user',
    actor_user_id: null,
    type,
    title: meta.previewTitle,
    body: meta.previewBody,
    link_path: '/ticket/demo-ticket',
    ticket_id: 'demo-ticket',
    entity_type: 'ticket',
    entity_id: 'demo-ticket',
    payload: {
      preview: true,
      type,
    },
    read_at: null,
    created_at: now,
  }
}
