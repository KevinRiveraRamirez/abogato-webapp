import type { NotificationPayload, NotificationRecord } from '~~/shared/types/notification'

const NOTIFICATIONS_PAGE_SIZE = 25

function normalizeNotificationPayload(value: unknown): NotificationPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as NotificationPayload
}

function normalizeNotification(row: Partial<NotificationRecord>): NotificationRecord {
  return {
    id: row.id ?? '',
    recipient_user_id: row.recipient_user_id ?? '',
    actor_user_id: row.actor_user_id ?? null,
    type: row.type ?? 'unknown',
    title: row.title ?? 'Notificacion',
    body: row.body ?? '',
    link_path: row.link_path ?? '/tickets',
    ticket_id: row.ticket_id ?? null,
    entity_type: row.entity_type ?? null,
    entity_id: row.entity_id ?? null,
    payload: normalizeNotificationPayload(row.payload),
    read_at: row.read_at ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export function useNotifications() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const notifications = useState<NotificationRecord[]>('notifications:list', () => [])
  const unreadCount = useState<number>('notifications:unread-count', () => 0)
  const loading = useState<boolean>('notifications:loading', () => false)
  const initializedForUserId = useState<string | null>('notifications:initialized-user-id', () => null)
  const lastError = useState<string | null>('notifications:last-error', () => null)

  function reset() {
    notifications.value = []
    unreadCount.value = 0
    loading.value = false
    initializedForUserId.value = null
    lastError.value = null
  }

  async function resolveCurrentUserId() {
    if (user.value?.id) {
      return user.value.id
    }

    const { data, error } = await supabase.auth.getUser()

    if (error) {
      lastError.value = error.message
      return null
    }

    return data.user?.id ?? null
  }

  async function refresh() {
    const userId = await resolveCurrentUserId()

    if (!userId) {
      reset()
      return
    }

    loading.value = true
    lastError.value = null

    const notificationsResult = await supabase
      .from('notifications')
      .select('id, recipient_user_id, actor_user_id, type, title, body, link_path, ticket_id, entity_type, entity_id, payload, read_at, created_at')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(NOTIFICATIONS_PAGE_SIZE)

    loading.value = false

    if (notificationsResult.error) {
      lastError.value = notificationsResult.error.message
      return
    }

    notifications.value = (notificationsResult.data ?? []).map(row =>
      normalizeNotification(row as Partial<NotificationRecord>)
    )
    unreadCount.value = notifications.value.filter(notification => !notification.read_at).length
    initializedForUserId.value = userId

    const unreadResult = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .is('read_at', null)

    if (!unreadResult.error && typeof unreadResult.count === 'number') {
      unreadCount.value = unreadResult.count
    }
  }

  async function ensureLoaded() {
    const userId = await resolveCurrentUserId()

    if (!userId) {
      reset()
      return
    }

    if (initializedForUserId.value !== userId) {
      await refresh()
    }
  }

  async function markAsRead(notificationId: string) {
    const notification = notifications.value.find(item => item.id === notificationId)

    if (!notification || notification.read_at) return

    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    })

    if (error) {
      lastError.value = error.message
      return
    }

    const readAt = new Date().toISOString()

    notifications.value = notifications.value.map(item =>
      item.id === notificationId
        ? { ...item, read_at: readAt }
        : item
    )
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllAsRead() {
    if (!unreadCount.value) return

    const { error } = await supabase.rpc('mark_all_notifications_read')

    if (error) {
      lastError.value = error.message
      return
    }

    const readAt = new Date().toISOString()

    notifications.value = notifications.value.map(item => ({
      ...item,
      read_at: item.read_at ?? readAt,
    }))
    unreadCount.value = 0
  }

  return {
    notifications,
    unreadCount,
    loading,
    lastError,
    refresh,
    ensureLoaded,
    markAsRead,
    markAllAsRead,
    reset,
  }
}
