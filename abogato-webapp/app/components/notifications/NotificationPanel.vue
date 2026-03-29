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
  dragStart: [event: PointerEvent]
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
  <SkeletonNotificationPanel v-if="loading && !notifications.length && !error" />

  <UCard
    v-else
    class="app-floating-panel app-panel-xl flex w-[clamp(20rem,30vw,28rem)] max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col sm:max-h-[calc(100vh-2rem)] sm:max-w-[calc(100vw-2rem)]"
    :ui="{
      header: 'shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pt-5',
      body: 'flex min-h-0 flex-1 flex-col px-4 pb-0 pt-0 sm:px-5',
      footer: 'shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5'
    }"
  >
    <template #header>
      <div
        class="flex items-start justify-between gap-3 cursor-grab select-none touch-none active:cursor-grabbing"
        @pointerdown="emit('dragStart', $event)"
      >
        <div>
          <h3 class="text-xl font-semibold tracking-tight text-highlighted">Notificaciones</h3>
          <p class="mt-1 text-sm text-muted">
            {{ unreadCount ? `${unreadCount} sin leer` : 'Todo al dia' }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Arrastrar
          </span>
          <UIcon name="i-lucide-grip-horizontal" class="size-4 text-muted" />

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
      </div>

      <div class="app-subtle-panel app-panel-sm mt-4 p-1">
        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="filter in filters"
            :key="filter.key"
            type="button"
            class="flex items-center justify-center gap-1.5 rounded-[1rem] px-2.5 py-2 text-xs font-medium transition sm:gap-2 sm:px-3 sm:text-sm"
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

    <div v-if="!notifications.length" class="flex min-h-[12rem] flex-1 flex-col items-center justify-center py-8 text-center sm:py-12">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-toned">
        <UIcon name="i-lucide-bell-ring" class="h-6 w-6" />
      </div>
      <p class="mt-4 text-sm font-medium text-highlighted">No hay notificaciones por ahora</p>
      <p class="mt-1 text-sm text-muted">Cuando ocurra algo importante en tus casos, lo vas a ver acá.</p>
    </div>

    <div v-else-if="!filteredNotifications.length" class="flex min-h-[12rem] flex-1 flex-col items-center justify-center py-8 text-center sm:py-12">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-toned">
        <UIcon name="i-lucide-inbox" class="h-6 w-6" />
      </div>
      <p class="mt-4 text-sm font-medium text-highlighted">Sin elementos en este filtro</p>
      <p class="mt-1 text-sm text-muted">{{ emptyFilterMessage }}</p>
    </div>

    <div v-else class="scrollbar-none min-h-0 flex-1 space-y-3 overflow-y-auto pb-1 pr-1">
      <NotificationsNotificationItem
        v-for="notification in filteredNotifications"
        :key="notification.id"
        :notification="notification"
        @select="emit('select', $event)"
      />
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 border-t border-default/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          class="text-left text-sm font-medium text-highlighted underline decoration-default underline-offset-4 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!notifications.length || !unreadCount"
          @click="emit('markAll')"
        >
          Marcar todas como leidas
        </button>

        <UButton color="neutral" variant="outline" to="/dashboard" class="justify-center">
          Ir al panel
        </UButton>
      </div>
    </template>
  </UCard>
</template>
