export interface NotificationPayload {
  [key: string]: unknown
}

export interface NotificationRecord {
  id: string
  recipient_user_id: string
  actor_user_id: string | null
  type: string
  title: string
  body: string
  link_path: string
  ticket_id: string | null
  entity_type: string | null
  entity_id: string | null
  payload: NotificationPayload
  read_at: string | null
  created_at: string
}

export type NotificationType =
  | 'ticket_created'
  | 'ticket_assigned_lawyer'
  | 'ticket_unassigned_lawyer'
  | 'ticket_comment_from_client'
  | 'ticket_comment_from_staff'
  | 'ticket_file_from_client'
  | 'ticket_reopen_requested'
  | 'ticket_reopen_approved'
  | 'ticket_reopen_rejected'
  | 'ticket_taken'
  | 'ticket_status_changed'
  | 'ticket_unassigned_alert'
  | 'document_approved'
  | 'document_rejected'
  | 'document_generation_sla_alert'
  | 'system_lookup_failure_alert'
