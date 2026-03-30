<script setup lang="ts">
import NotificationsNotificationPanel from '~/components/notifications/NotificationPanel.vue'
import { nextTick } from 'vue'
import type { NotificationRecord, NotificationType } from '~~/shared/types/notification'
import type { NotificationCenterTab } from '~~/shared/notifications/catalog'

const props = withDefaults(defineProps<{
  panelPlacement?: 'bottom-end' | 'bottom-start' | 'top-start' | 'right-end'
}>(), {
  panelPlacement: 'bottom-end',
})

const route = useRoute()
const {
  notifications,
  unreadCount,
  totalCount,
  page,
  activeTab,
  perPage,
  loading,
  lastError,
  ensureLoaded,
  refresh,
  markAsRead,
  markAllAsRead,
  deleteAllRead,
  setPage,
  setActiveTab,
} = useNotifications()
const {
  hasCustomSettings: hasCustomTabSettings,
  isHydrated,
  reset: resetTabSettings,
  toggleVisibleTab,
  visibleTabs,
} = useNotificationCenterSettings()
const {
  enabledTypes,
  ensureLoaded: ensureNotificationPreferencesLoaded,
  hasCustomPreferences,
  reset: resetNotificationPreferences,
  setTypeEnabled,
} = useNotificationPreferences()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const gap = 8

function panelBesideTrigger(panelRect: DOMRect, trigger: DOMRect | undefined) {
  const margin = 16
  if (!trigger) {
    return {
      left: window.innerWidth - panelRect.width - margin,
      top: window.innerWidth < 640 ? 72 : 88,
    }
  }

  let left = trigger.left - gap - panelRect.width
  let top = trigger.top

  if (left < margin) {
    left = Math.min(
      Math.max(margin, trigger.right - panelRect.width),
      window.innerWidth - panelRect.width - margin,
    )
    top = trigger.bottom + gap
  }

  const maxTop = window.innerHeight - panelRect.height - margin
  return {
    left,
    top: Math.min(Math.max(top, margin), maxTop),
  }
}

const {
  panel,
  panelStyle,
  updatePanelPosition,
  startDragging,
  shouldIgnoreOutsideClick,
} = useFloatingPanel({
  storageKey: 'floating-panel:notifications',
  viewportMargin: 16,
  getDefaultPosition: (panelRect) =>
    panelBesideTrigger(panelRect, root.value?.getBoundingClientRect()),
})

const unreadBadge = computed(() => {
  if (!unreadCount.value) return ''
  if (unreadCount.value > 99) return '99+'
  return String(unreadCount.value)
})
const hasCustomSettings = computed(() =>
  hasCustomTabSettings.value || hasCustomPreferences.value
)

let ignoreOutsideClickUntil = 0

watch(
  () => route.fullPath,
  () => {
    isOpen.value = false
  }
)

watch(isOpen, async (open) => {
  if (!open) return

  await nextTick()
  updatePanelPosition()

  requestAnimationFrame(() => {
    updatePanelPosition()
  })
})

watch(
  [() => notifications.value.length, loading, lastError, totalCount],
  async () => {
    if (!isOpen.value) return

    await nextTick()
    updatePanelPosition()
  }
)

watch(
  () => visibleTabs.value.join('|'),
  async () => {
    if (visibleTabs.value.includes(activeTab.value)) return

    setActiveTab(visibleTabs.value[0] ?? 'all')
    await refresh()
  },
  { immediate: true }
)

watch(
  () => isHydrated.value,
  async (hydrated, wasHydrated) => {
    if (!hydrated || wasHydrated === hydrated) return
    setPage(1)
    await refresh()
  }
)

async function togglePanel() {
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    // No llamar closeMobile() aquí: la campana vive dentro del USlideover móvil;
    // cerrar el menú desmonta el trigger y el panel parece “cerrarse” al instante.
    ignoreOutsideClickUntil = Date.now() + 500
    await ensureNotificationPreferencesLoaded()
    await refresh()
  }
}

async function handleSelect(notification: NotificationRecord) {
  if (!notification.read_at) {
    await markAsRead(notification.id)
  }

  isOpen.value = false
  await navigateTo(notification.link_path)
}

async function handleMarkAll() {
  await markAllAsRead()
}

async function handleDeleteReadAll() {
  if (!confirm('¿Querés eliminar todas las notificaciones leídas?')) return
  await deleteAllRead()
}

async function handlePageChange(nextPage: number) {
  setPage(nextPage)
  await refresh()
}

async function handleTabChange(nextTab: NotificationCenterTab) {
  setActiveTab(nextTab)
  await refresh()
}

async function handleToggleType(type: NotificationType) {
  const updated = await setTypeEnabled(type, !enabledTypes.value.includes(type))

  if (!updated) {
    return
  }

  setPage(1)
  await refresh()
}

async function handleToggleVisibleTab(tab: NotificationCenterTab) {
  const currentTab = activeTab.value
  toggleVisibleTab(tab)

  if (!visibleTabs.value.includes(currentTab)) {
    setActiveTab(visibleTabs.value[0] ?? 'all')
    await refresh()
  }
}

async function handleResetSettings() {
  resetTabSettings()
  await resetNotificationPreferences()
  setActiveTab('all')
  setPage(1)
  await refresh()
}

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value || !root.value) return
  if (shouldIgnoreOutsideClick()) return
  if (Date.now() < ignoreOutsideClickUntil) return

  const target = event.target
  if (!(target instanceof Node)) return
  if (root.value.contains(target)) return
  if (panel.value?.contains(target)) return

  isOpen.value = false
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  ensureLoaded()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
})
</script>

<template>
  <div ref="root" class="relative">
    <div class="relative">
      <UButton
        icon="i-lucide-bell"
        color="neutral"
        :variant="isOpen ? 'soft' : 'outline'"
        square
        class="rounded-xl border-default/80 bg-default/90 shadow-sm"
        :aria-expanded="isOpen"
        :aria-label="unreadCount ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'"
        @click.stop="togglePanel"
      />

      <span
        v-if="unreadBadge"
        class="pointer-events-none absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white shadow-sm"
      >
        {{ unreadBadge }}
      </span>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-if="isOpen"
          ref="panel"
          class="fixed z-[520] touch-manipulation"
          :style="panelStyle"
          @click.stop
        >
          <NotificationsNotificationPanel
            :notifications="notifications"
            :unread-count="unreadCount"
            :total-count="totalCount"
            :page="page"
            :per-page="perPage"
            :active-tab="activeTab"
            :visible-tabs="visibleTabs"
            :enabled-types="enabledTypes"
            :has-custom-settings="hasCustomSettings"
            :loading="loading"
            :error="lastError"
            @drag-start="startDragging"
            @select="handleSelect"
            @mark-all="handleMarkAll"
            @delete-read-all="handleDeleteReadAll"
            @update:page="handlePageChange"
            @update:active-tab="handleTabChange"
            @toggle:type="handleToggleType"
            @toggle:visible-tab="handleToggleVisibleTab"
            @reset-settings="handleResetSettings"
            @refresh="refresh"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
