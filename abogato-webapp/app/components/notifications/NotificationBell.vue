<script setup lang="ts">
import NotificationsNotificationPanel from '~/components/notifications/NotificationPanel.vue'
import type { NotificationRecord } from '~~/shared/types/notification'

const route = useRoute()
const {
  notifications,
  unreadCount,
  loading,
  lastError,
  refresh,
  markAsRead,
  markAllAsRead,
} = useNotifications()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)

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

  const target = event.target
  if (target instanceof Node && root.value.contains(target)) return

  isOpen.value = false
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  refresh()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div ref="root" class="relative">
    <div class="relative">
      <UButton
        icon="i-lucide-bell"
        color="neutral"
        :variant="isOpen ? 'soft' : 'ghost'"
        square
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
        class="absolute right-0 top-[calc(100%+0.75rem)] z-50"
      >
        <NotificationsNotificationPanel
          :notifications="notifications"
          :unread-count="unreadCount"
          :loading="loading"
          :error="lastError"
          @select="handleSelect"
          @mark-all="handleMarkAll"
        />
      </div>
    </Transition>
  </div>
</template>
