import type { Database } from '~/types/database.types'
import type { NotificationType } from '~~/shared/types/notification'
import { getAllNotificationTypes, isNotificationType } from '~~/shared/notifications/catalog'

const DEFAULT_ENABLED_NOTIFICATION_TYPES = getAllNotificationTypes()

function orderEnabledTypes(enabledTypes: Iterable<NotificationType>) {
  const enabledSet = new Set(enabledTypes)

  return DEFAULT_ENABLED_NOTIFICATION_TYPES.filter(type => enabledSet.has(type))
}

export function useNotificationPreferences() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const enabledTypes = useState<NotificationType[]>(
    'notification-preferences:enabled-types',
    () => [...DEFAULT_ENABLED_NOTIFICATION_TYPES]
  )
  const loading = useState<boolean>('notification-preferences:loading', () => false)
  const initializedForUserId = useState<string | null>(
    'notification-preferences:initialized-user-id',
    () => null
  )
  const lastError = useState<string | null>('notification-preferences:last-error', () => null)

  const hasCustomPreferences = computed(() =>
    enabledTypes.value.length !== DEFAULT_ENABLED_NOTIFICATION_TYPES.length
  )

  function resetLocalState() {
    enabledTypes.value = [...DEFAULT_ENABLED_NOTIFICATION_TYPES]
    initializedForUserId.value = null
    loading.value = false
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

  async function load() {
    const userId = await resolveCurrentUserId()

    if (!userId) {
      resetLocalState()
      return
    }

    loading.value = true
    lastError.value = null

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('notification_type, enabled')
      .eq('user_id', userId)

    loading.value = false

    if (error) {
      enabledTypes.value = [...DEFAULT_ENABLED_NOTIFICATION_TYPES]
      initializedForUserId.value = userId
      lastError.value = error.message
      return
    }

    const disabledTypes = (data ?? []).flatMap((preference) =>
      !preference.enabled && isNotificationType(preference.notification_type)
        ? [preference.notification_type]
        : []
    )

    enabledTypes.value = orderEnabledTypes(
      DEFAULT_ENABLED_NOTIFICATION_TYPES.filter(type => !disabledTypes.includes(type))
    )
    initializedForUserId.value = userId
  }

  async function ensureLoaded() {
    const userId = await resolveCurrentUserId()

    if (!userId) {
      resetLocalState()
      return
    }

    if (initializedForUserId.value !== userId) {
      await load()
    }
  }

  async function setTypeEnabled(type: NotificationType, nextEnabled: boolean) {
    const userId = await resolveCurrentUserId()

    if (!userId) {
      return false
    }

    const previousEnabledTypes = [...enabledTypes.value]
    enabledTypes.value = nextEnabled
      ? orderEnabledTypes(enabledTypes.value.filter(item => item !== type).concat(type))
      : orderEnabledTypes(enabledTypes.value.filter(item => item !== type))

    lastError.value = null

    let error: { message: string } | null = null

    if (nextEnabled) {
      const result = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('notification_type', type)

      error = result.error
    } else {
      const result = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          notification_type: type,
          enabled: false,
        }, {
          onConflict: 'user_id,notification_type',
        })

      error = result.error
    }

    if (error) {
      enabledTypes.value = previousEnabledTypes
      lastError.value = error.message
      return false
    }

    initializedForUserId.value = userId
    return true
  }

  async function reset() {
    const userId = await resolveCurrentUserId()

    if (!userId) {
      resetLocalState()
      return false
    }

    const previousEnabledTypes = [...enabledTypes.value]
    enabledTypes.value = [...DEFAULT_ENABLED_NOTIFICATION_TYPES]
    lastError.value = null

    const { error } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', userId)

    if (error) {
      enabledTypes.value = previousEnabledTypes
      lastError.value = error.message
      return false
    }

    initializedForUserId.value = userId
    return true
  }

  return {
    enabledTypes,
    hasCustomPreferences,
    loading,
    lastError,
    ensureLoaded,
    load,
    reset,
    resetLocalState,
    setTypeEnabled,
  }
}
