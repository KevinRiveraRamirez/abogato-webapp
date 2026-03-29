import type { NotificationPayload, NotificationRecord, NotificationType } from '~~/shared/types/notification'
import {
  getNotificationGroup,
  type NotificationCenterTab,
} from '~~/shared/notifications/catalog'

const NOTIFICATION_CENTER_PER_PAGE = 10
let refreshPromise: Promise<void> | null = null
let refreshQueued = false

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

function sortNotifications(list: NotificationRecord[]) {
  return [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}

export function useNotifications() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const {
    enabledTypes,
  } = useNotificationCenterSettings()

  const notifications = useState<NotificationRecord[]>('notifications:list', () => [])
  const unreadCount = useState<number>('notifications:unread-count', () => 0)
  const totalCount = useState<number>('notifications:total-count', () => 0)
  const loading = useState<boolean>('notifications:loading', () => false)
  const page = useState<number>('notifications:page', () => 1)
  const perPage = computed(() => NOTIFICATION_CENTER_PER_PAGE)
  const activeTab = useState<NotificationCenterTab>('notifications:active-tab', () => 'all')
  const initializedForUserId = useState<string | null>('notifications:initialized-user-id', () => null)
  const lastError = useState<string | null>('notifications:last-error', () => null)

  function reset() {
    notifications.value = []
    unreadCount.value = 0
    totalCount.value = 0
    loading.value = false
    initializedForUserId.value = null
    lastError.value = null
  }

  function clampPage(value: number) {
    return Math.max(1, Math.trunc(value) || 1)
  }

  function getActiveQueryTypes() {
    if (activeTab.value === 'all') {
      return enabledTypes.value
    }

    return enabledTypes.value.filter(type => getNotificationGroup(type) === activeTab.value)
  }

  function setPage(nextPage: number) {
    page.value = clampPage(nextPage)
  }

  function setActiveTab(nextTab: NotificationCenterTab) {
    if (activeTab.value === nextTab) return

    activeTab.value = nextTab
    page.value = 1
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
    if (refreshPromise) {
      refreshQueued = true
      await refreshPromise

      if (refreshQueued) {
        refreshQueued = false
        await refresh()
      }

      return
    }

    refreshPromise = (async () => {
      const userId = await resolveCurrentUserId()

      if (!userId) {
        reset()
        return
      }

      loading.value = true
      lastError.value = null

      try {
        const queryTypes = getActiveQueryTypes()
        const unreadQueryTypes = enabledTypes.value

        if (!queryTypes.length) {
          notifications.value = []
          totalCount.value = 0
        } else {
          const currentPage = clampPage(page.value)
          const currentPerPage = Math.max(1, perPage.value)
          const from = (currentPage - 1) * currentPerPage
          const to = from + currentPerPage - 1

          const notificationsResult = await supabase
            .from('notifications')
            .select('id, recipient_user_id, actor_user_id, type, title, body, link_path, ticket_id, entity_type, entity_id, payload, read_at, created_at', { count: 'exact' })
            .eq('recipient_user_id', userId)
            .in('type', queryTypes)
            .order('created_at', { ascending: false })
            .range(from, to)

          if (notificationsResult.error) {
            lastError.value = notificationsResult.error.message
            return
          }

          notifications.value = (notificationsResult.data ?? []).map(row =>
            normalizeNotification(row as Partial<NotificationRecord>)
          )
          totalCount.value = notificationsResult.count ?? notifications.value.length

          const totalPages = Math.max(1, Math.ceil(totalCount.value / currentPerPage))

          if (page.value > totalPages) {
            page.value = totalPages
            refreshQueued = true
          }
        }

        initializedForUserId.value = userId

        if (!unreadQueryTypes.length) {
          unreadCount.value = 0
          return
        }

        const unreadResult = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_user_id', userId)
          .in('type', unreadQueryTypes)
          .is('read_at', null)

        if (!unreadResult.error && typeof unreadResult.count === 'number') {
          unreadCount.value = unreadResult.count
        } else {
          unreadCount.value = notifications.value.filter(notification => !notification.read_at).length
        }
      } finally {
        loading.value = false
      }
    })()

    try {
      await refreshPromise
    } finally {
      refreshPromise = null
    }

    if (refreshQueued) {
      refreshQueued = false
      await refresh()
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

  function upsertFromRealtime(row: Partial<NotificationRecord>) {
    const notification = normalizeNotification(row)
    const visibleTypes = getActiveQueryTypes()
    const notificationType = notification.type as NotificationType
    const isEnabledType = enabledTypes.value.includes(notificationType)
    const isVisibleOnCurrentTab = visibleTypes.includes(notificationType)

    if (!notification.id || !notification.recipient_user_id) return
    if (!isEnabledType) return

    if (!isVisibleOnCurrentTab) {
      if (!notification.read_at) {
        unreadCount.value += 1
      }
      return
    }

    if (page.value !== 1) {
      refreshQueued = true
      void refresh()
      return
    }

    const existing = notifications.value.find(item => item.id === notification.id)

    if (existing) {
      const wasUnread = !existing.read_at
      const isUnread = !notification.read_at

      notifications.value = sortNotifications(
        notifications.value.map(item =>
          item.id === notification.id
            ? { ...item, ...notification }
            : item
        )
      ).slice(0, perPage.value)

      if (wasUnread && !isUnread) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      } else if (!wasUnread && isUnread) {
        unreadCount.value += 1
      }

      return
    }

    notifications.value = sortNotifications([
      notification,
      ...notifications.value,
    ]).slice(0, perPage.value)
    totalCount.value += 1

    if (!notification.read_at) {
      unreadCount.value += 1
    }

    initializedForUserId.value = notification.recipient_user_id
  }

  return {
    notifications,
    unreadCount,
    totalCount,
    page,
    activeTab,
    perPage,
    loading,
    lastError,
    refresh,
    ensureLoaded,
    markAsRead,
    markAllAsRead,
    upsertFromRealtime,
    reset,
    setPage,
    setActiveTab,
  }
}
