<script setup lang="ts">
import NotificationsNotificationItem from '~/components/notifications/NotificationItem.vue'
import type { NotificationRecord } from '~~/shared/types/notification'

defineProps<{
  notifications: NotificationRecord[]
  unreadCount: number
  loading: boolean
  error?: string | null
}>()

defineEmits<{
  select: [notification: NotificationRecord]
  markAll: []
}>()
</script>

<template>
  <UCard
    class="w-80 max-w-[calc(100vw-1rem)] shadow-xl"
    :ui="{
      header: 'px-4 py-4',
      body: 'p-0',
      footer: 'px-4 py-3'
    }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-highlighted">Notificaciones</h3>
          <p class="mt-1 text-xs text-muted">
            {{ unreadCount ? `${unreadCount} sin leer` : 'Todo al dia' }}
          </p>
        </div>

        <UButton
          v-if="notifications.length && unreadCount"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="$emit('markAll')"
        >
          Marcar todas
        </UButton>
      </div>
    </template>

    <div v-if="error" class="border-b border-default px-4 py-3">
      <UAlert
        color="error"
        variant="soft"
        title="No se pudo cargar"
        :description="error"
      />
    </div>

    <div v-if="loading && !notifications.length" class="px-4 py-10 text-center">
      <p class="text-sm text-muted">Cargando notificaciones...</p>
    </div>

    <div v-else-if="!notifications.length" class="px-4 py-10 text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-toned">
        <UIcon name="i-lucide-bell-ring" class="h-6 w-6" />
      </div>
      <p class="mt-4 text-sm font-medium text-highlighted">No hay notificaciones por ahora</p>
      <p class="mt-1 text-sm text-muted">Cuando ocurra algo importante en tus casos, lo vas a ver acá.</p>
    </div>

    <div v-else class="max-h-96 overflow-y-auto divide-y divide-default">
      <NotificationsNotificationItem
        v-for="notification in notifications"
        :key="notification.id"
        :notification="notification"
        @select="$emit('select', $event)"
      />
    </div>

    <template #footer>
      <p class="text-xs text-muted">
        Mostrando las ultimas {{ notifications.length }} notificaciones.
      </p>
    </template>
  </UCard>
</template>
