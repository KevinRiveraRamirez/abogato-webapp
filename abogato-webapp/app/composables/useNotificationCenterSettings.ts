import {
  notificationTabOptions,
  type NotificationCenterTab,
} from '~~/shared/notifications/catalog'

type NotificationCenterSettings = {
  visibleTabs: NotificationCenterTab[]
}

const DEFAULT_VISIBLE_TABS = notificationTabOptions.map(option => option.key)
const MAX_VISIBLE_TABS = 3 as const

let settingsWatchersInitialized = false

function createDefaultSettings(): NotificationCenterSettings {
  return {
    visibleTabs: [...DEFAULT_VISIBLE_TABS].slice(0, MAX_VISIBLE_TABS),
  }
}

function clampVisibleTabs(value: NotificationCenterTab[]): NotificationCenterTab[] {
  if (value.length <= MAX_VISIBLE_TABS) return value
  return value.slice(0, MAX_VISIBLE_TABS)
}

function normalizeVisibleTabs(value: unknown): NotificationCenterTab[] {
  const list = Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
  const unique = new Set(
    list.filter((item): item is NotificationCenterTab =>
      notificationTabOptions.some(option => option.key === item)
    )
  )

  const normalized = DEFAULT_VISIBLE_TABS.filter(tab => unique.has(tab))
  const clamped = clampVisibleTabs(normalized)
  return clamped.length ? clamped : clampVisibleTabs([...DEFAULT_VISIBLE_TABS])
}

function normalizeSettings(value: unknown): NotificationCenterSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createDefaultSettings()
  }

  const candidate = value as Partial<NotificationCenterSettings>

  return {
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

  function toggleVisibleTab(tab: NotificationCenterTab) {
    const isVisible = settings.value.visibleTabs.includes(tab)

    if (isVisible && settings.value.visibleTabs.length === 1) {
      return
    }

    if (!isVisible && settings.value.visibleTabs.length >= MAX_VISIBLE_TABS) {
      return
    }

    const nextVisibleTabs = isVisible
      ? settings.value.visibleTabs.filter(item => item !== tab)
      : DEFAULT_VISIBLE_TABS.filter(item => item === tab || settings.value.visibleTabs.includes(item))

    settings.value = {
      ...settings.value,
      visibleTabs: clampVisibleTabs(nextVisibleTabs),
    }
  }

  function reset() {
    settings.value = createDefaultSettings()
  }

  const visibleTabs = computed(() => settings.value.visibleTabs)

  const hasCustomSettings = computed(() =>
    !sameStringArray(settings.value.visibleTabs, clampVisibleTabs(DEFAULT_VISIBLE_TABS))
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
    hasCustomSettings,
    hydrate,
    isHydrated,
    reset,
    toggleVisibleTab,
    visibleTabs,
  }
}
