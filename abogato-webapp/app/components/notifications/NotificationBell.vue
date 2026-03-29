<script setup lang="ts">
import NotificationsNotificationPanel from '~/components/notifications/NotificationPanel.vue'
import { nextTick } from 'vue'
import type { NotificationRecord } from '~~/shared/types/notification'

const props = withDefaults(defineProps<{
  panelPlacement?: 'bottom-end' | 'bottom-start' | 'top-start' | 'right-end'
}>(), {
  panelPlacement: 'bottom-end',
})

const route = useRoute()
const {
  notifications,
  unreadCount,
  loading,
  lastError,
  ensureLoaded,
  refresh,
  markAsRead,
  markAllAsRead,
} = useNotifications()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const {
  panel,
  panelStyle,
  updatePanelPosition,
  startDragging,
  shouldIgnoreOutsideClick,
} = useFloatingPanel({
  storageKey: 'floating-panel:notifications',
})

const unreadBadge = computed(() => {
  if (!unreadCount.value) return ''
  if (unreadCount.value > 99) return '99+'
  return String(unreadCount.value)
})

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
  [() => notifications.value.length, loading, lastError],
  async () => {
    if (!isOpen.value) return

    await nextTick()
    updatePanelPosition()
  }
)

async function togglePanel() {
  isOpen.value = !isOpen.value

  if (isOpen.value) {
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

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value || !root.value) return
  if (shouldIgnoreOutsideClick()) return

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
        @click="togglePanel"
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
          class="fixed z-[240]"
          :style="panelStyle"
        >
          <NotificationsNotificationPanel
            :notifications="notifications"
            :unread-count="unreadCount"
            :loading="loading"
            :error="lastError"
            @drag-start="startDragging"
            @select="handleSelect"
            @mark-all="handleMarkAll"
            @refresh="refresh"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
