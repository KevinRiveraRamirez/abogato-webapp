<script setup lang="ts">
import NotificationsNotificationItem from '~/components/notifications/NotificationItem.vue'
import type { NotificationRecord } from '~~/shared/types/notification'

const props = defineProps<{
  notifications: NotificationRecord[]
  unreadCount: number
  loading: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  select: [notification: NotificationRecord]
  markAll: []
  refresh: []
}>()

type NotificationFilter = 'all' | 'tickets' | 'documents'

const activeFilter = ref<NotificationFilter>('all')

const filters = computed(() => {
  const ticketsCount = props.notifications.filter(notification =>
    notification.type.startsWith('ticket_')
  ).length

  const documentsCount = props.notifications.filter(notification =>
    notification.type.startsWith('document_')
  ).length

  return [
    { key: 'all', label: 'Todas', count: props.notifications.length },
    { key: 'tickets', label: 'Casos', count: ticketsCount },
    { key: 'documents', label: 'Documentos', count: documentsCount },
  ] as const
})

const filteredNotifications = computed(() => {
  if (activeFilter.value === 'all') return props.notifications

  return props.notifications.filter((notification) => {
    if (activeFilter.value === 'tickets') {
      return notification.type.startsWith('ticket_')
    }

    return notification.type.startsWith('document_')
  })
})

const emptyFilterMessage = computed(() => {
  if (activeFilter.value === 'tickets') {
    return 'Todavía no hay actividad de casos en esta bandeja.'
  }

  if (activeFilter.value === 'documents') {
    return 'Todavía no hay actividad documental en esta bandeja.'
  }

  return 'Todavía no hay notificaciones para mostrar.'
})
</script>

<template>
  <UCard
    class="w-[25rem] max-w-[calc(100vw-1rem)] rounded-[2rem] border border-default/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"
    :ui="{
      header: 'px-5 pb-4 pt-5',
      body: 'px-5 pb-0 pt-0',
      footer: 'px-5 pb-5 pt-4'
    }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold tracking-tight text-highlighted">Notificaciones</h3>
          <p class="mt-1 text-sm text-muted">
            {{ unreadCount ? `${unreadCount} sin leer` : 'Todo al dia' }}
          </p>
        </div>

        <UButton
          icon="i-lucide-refresh-cw"
          size="sm"
          color="neutral"
          variant="ghost"
          square
          :loading="loading"
          @click="emit('refresh')"
        />
      </div>

      <div class="mt-4 rounded-[1.2rem] border border-default/70 bg-elevated/70 p-1">
        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="filter in filters"
            :key="filter.key"
            type="button"
            class="flex items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-sm font-medium transition"
            :class="activeFilter === filter.key
              ? 'bg-default text-highlighted shadow-sm ring-1 ring-default'
              : 'text-muted hover:text-highlighted'"
            @click="activeFilter = filter.key"
          >
            <span>{{ filter.label }}</span>
            <span class="rounded-full bg-default/80 px-1.5 py-0.5 text-xs text-toned">
              {{ filter.count }}
            </span>
          </button>
        </div>
      </div>
    </template>

    <div v-if="error" class="pb-4">
      <UAlert
        color="error"
        variant="soft"
        title="No se pudo cargar"
        :description="error"
      />
    </div>

    <div v-if="loading && !notifications.length" class="py-12 text-center">
      <p class="text-sm text-muted">Cargando notificaciones...</p>
    </div>

    <div v-else-if="!notifications.length" class="py-12 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-toned">
        <UIcon name="i-lucide-bell-ring" class="h-6 w-6" />
      </div>
      <p class="mt-4 text-sm font-medium text-highlighted">No hay notificaciones por ahora</p>
      <p class="mt-1 text-sm text-muted">Cuando ocurra algo importante en tus casos, lo vas a ver acá.</p>
    </div>

    <div v-else-if="!filteredNotifications.length" class="py-12 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-toned">
        <UIcon name="i-lucide-inbox" class="h-6 w-6" />
      </div>
      <p class="mt-4 text-sm font-medium text-highlighted">Sin elementos en este filtro</p>
      <p class="mt-1 text-sm text-muted">{{ emptyFilterMessage }}</p>
    </div>

    <div v-else class="max-h-[30rem] space-y-3 overflow-y-auto pb-1 pr-1">
      <NotificationsNotificationItem
        v-for="notification in filteredNotifications"
        :key="notification.id"
        :notification="notification"
        @select="emit('select', $event)"
      />
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3 border-t border-default/70 pt-4">
        <button
          type="button"
          class="text-sm font-medium text-highlighted underline decoration-default underline-offset-4 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!notifications.length || !unreadCount"
          @click="emit('markAll')"
        >
          Marcar todas como leidas
        </button>

        <UButton color="neutral" variant="outline" to="/dashboard">
          Ir al panel
        </UButton>
      </div>
    </template>
  </UCard>
</template>
