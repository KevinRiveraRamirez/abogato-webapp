import type { NotificationType } from '~~/shared/types/notification'
import {
  getAllNotificationTypes,
  isNotificationType,
  notificationTabOptions,
  type NotificationCenterTab,
} from '~~/shared/notifications/catalog'

type NotificationCenterSettings = {
  enabledTypes: NotificationType[]
  visibleTabs: NotificationCenterTab[]
}

const DEFAULT_ENABLED_TYPES = getAllNotificationTypes()
const DEFAULT_VISIBLE_TABS = notificationTabOptions.map(option => option.key)

let settingsWatchersInitialized = false

function createDefaultSettings(): NotificationCenterSettings {
  return {
    enabledTypes: [...DEFAULT_ENABLED_TYPES],
    visibleTabs: [...DEFAULT_VISIBLE_TABS],
  }
}

function normalizeEnabledTypes(value: unknown): NotificationType[] {
  const list = Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
  const unique = new Set(list.filter(isNotificationType))

  return DEFAULT_ENABLED_TYPES.filter(type => unique.has(type))
}

function normalizeVisibleTabs(value: unknown): NotificationCenterTab[] {
  const list = Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
  const unique = new Set(
    list.filter((item): item is NotificationCenterTab =>
      notificationTabOptions.some(option => option.key === item)
    )
  )

  const normalized = DEFAULT_VISIBLE_TABS.filter(tab => unique.has(tab))
  return normalized.length ? normalized : [...DEFAULT_VISIBLE_TABS]
}

function normalizeSettings(value: unknown): NotificationCenterSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultSettings()
  }

  const candidate = value as Partial<NotificationCenterSettings>

  return {
    enabledTypes: normalizeEnabledTypes(candidate.enabledTypes),
    visibleTabs: normalizeVisibleTabs(candidate.visibleTabs),
  }
}

function buildStorageKey(userId: string | null | undefined) {
  return `notification-center:settings:${userId ?? 'guest'}`
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

export function useNotificationCenterSettings() {
  const user = useSupabaseUser()
  const settings = useState<NotificationCenterSettings>('notification-center:settings', () => createDefaultSettings())
  const hydratedStorageKey = useState<string | null>('notification-center:hydrated-storage-key', () => null)

  const storageKey = computed(() => buildStorageKey(user.value?.id ?? null))
  const isHydrated = computed(() => hydratedStorageKey.value === storageKey.value)

  function hydrate() {
    if (!import.meta.client) return

    try {
      const raw = window.localStorage.getItem(storageKey.value)
      settings.value = raw ? normalizeSettings(JSON.parse(raw)) : createDefaultSettings()
    } catch {
      settings.value = createDefaultSettings()
    }

    hydratedStorageKey.value = storageKey.value
  }

  function persist() {
    if (!import.meta.client || !isHydrated.value) return

    window.localStorage.setItem(storageKey.value, JSON.stringify(settings.value))
  }

  function toggleType(type: NotificationType) {
    const nextEnabledTypes = settings.value.enabledTypes.includes(type)
      ? settings.value.enabledTypes.filter(item => item !== type)
      : DEFAULT_ENABLED_TYPES.filter(item => item === type || settings.value.enabledTypes.includes(item))

    settings.value = {
      ...settings.value,
      enabledTypes: nextEnabledTypes,
    }
  }

  function toggleVisibleTab(tab: NotificationCenterTab) {
    const isVisible = settings.value.visibleTabs.includes(tab)

    if (isVisible && settings.value.visibleTabs.length === 1) {
      return
    }

    const nextVisibleTabs = isVisible
      ? settings.value.visibleTabs.filter(item => item !== tab)
      : DEFAULT_VISIBLE_TABS.filter(item => item === tab || settings.value.visibleTabs.includes(item))

    settings.value = {
      ...settings.value,
      visibleTabs: nextVisibleTabs,
    }
  }

  function reset() {
    settings.value = createDefaultSettings()
  }

  const enabledTypes = computed(() => settings.value.enabledTypes)
  const visibleTabs = computed(() => settings.value.visibleTabs)

  const hasCustomSettings = computed(() =>
    !sameStringArray(settings.value.enabledTypes, DEFAULT_ENABLED_TYPES)
    || !sameStringArray(settings.value.visibleTabs, DEFAULT_VISIBLE_TABS)
  )

  if (import.meta.client && !settingsWatchersInitialized) {
    settingsWatchersInitialized = true

    watch(storageKey, () => {
      hydrate()
    }, { immediate: true })

    watch(settings, () => {
      persist()
    }, { deep: true })
  }

  return {
    enabledTypes,
    hasCustomSettings,
    hydrate,
    isHydrated,
    reset,
    toggleType,
    toggleVisibleTab,
    visibleTabs,
  }
}
