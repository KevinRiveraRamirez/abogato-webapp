<script setup lang="ts">
import NotificationsNotificationItem from '~/components/notifications/NotificationItem.vue'
import {
  buildNotificationPreview,
  getNotificationGroup,
  notificationTabOptions,
  notificationTypeOptions,
  type NotificationCenterTab,
  type NotificationTone,
} from '~~/shared/notifications/catalog'
import type { NotificationRecord, NotificationType } from '~~/shared/types/notification'

const props = withDefaults(defineProps<{
  notifications: NotificationRecord[]
  unreadCount: number
  totalCount: number
  page: number
  perPage: number
  activeTab: NotificationCenterTab
  visibleTabs: NotificationCenterTab[]
  enabledTypes: NotificationType[]
  hasCustomSettings?: boolean
  loading: boolean
  error?: string | null
  isMobile?: boolean
}>(), {
  hasCustomSettings: false,
  error: null,
  isMobile: false,
})

const emit = defineEmits<{
  dragStart: [event: PointerEvent]
  select: [notification: NotificationRecord]
  markAll: []
  deleteReadAll: []
  refresh: []
  close: []
  'update:page': [page: number]
  'update:active-tab': [tab: NotificationCenterTab]
  'toggle:type': [type: NotificationType]
  'toggle:visible-tab': [tab: NotificationCenterTab]
  resetSettings: []
}>()

const isSettingsOpen = ref(false)
const previewType = ref<NotificationType>(notificationTypeOptions[0]?.type ?? 'ticket_created')

const toneClassMap: Record<NotificationTone, string> = {
  primary: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  info: 'border-info/20 bg-info/10 text-info',
  error: 'border-error/20 bg-error/10 text-error',
  neutral: 'border-default/70 bg-elevated text-toned',
}

const visibleFilters = computed(() =>
  notificationTabOptions.filter(option => props.visibleTabs.includes(option.key))
)

const groupMeta = {
  tickets: {
    label: 'Casos',
    description: 'Avisos sobre tickets, comentarios y cambios de estado.',
    emptyTitle: 'Sin actividad de casos',
    emptyDescription: 'Todavía no hay movimiento de casos en esta bandeja.',
  },
  documents: {
    label: 'Documentos',
    description: 'Aprobaciones, rechazos y alertas del flujo documental.',
    emptyTitle: 'Sin actividad documental',
    emptyDescription: 'Todavía no hay actividad documental en esta bandeja.',
  },
  system: {
    label: 'Operación',
    description: 'Alertas internas para supervisar problemas o desvíos operativos.',
    emptyTitle: 'Sin alertas operativas',
    emptyDescription: 'Todavía no hay alertas operativas nuevas en esta bandeja.',
  },
} satisfies Record<Exclude<NotificationCenterTab, 'all'>, {
  label: string
  description: string
  emptyTitle: string
  emptyDescription: string
}>

const notificationTypeGroups = computed(() =>
  (Object.entries(groupMeta) as Array<[Exclude<NotificationCenterTab, 'all'>, typeof groupMeta[keyof typeof groupMeta]]>)
    .map(([key, meta]) => ({
      key,
      label: meta.label,
      description: meta.description,
      options: notificationTypeOptions.filter(option => option.group === key),
    }))
)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.totalCount / Math.max(1, props.perPage)))
)

const visibleRangeStart = computed(() =>
  props.totalCount
    ? ((props.page - 1) * props.perPage) + 1
    : 0
)

const visibleRangeEnd = computed(() =>
  props.totalCount
    ? visibleRangeStart.value + props.notifications.length - 1
    : 0
)

const settingsSummary = computed(() =>
  `${props.enabledTypes.length} de ${notificationTypeOptions.length} tipos activos · ${props.visibleTabs.length} pestañas visibles`
)

const previewNotification = computed(() => buildNotificationPreview(previewType.value))

const activeTabHasEnabledTypes = computed(() => {
  if (props.activeTab === 'all') {
    return props.enabledTypes.length > 0
  }

  return props.enabledTypes.some(type => getNotificationGroup(type) === props.activeTab)
})

const emptyStateTitle = computed(() => {
  if (!props.enabledTypes.length) return 'No hay categorías activas'
  if (props.activeTab === 'tickets') return groupMeta.tickets.emptyTitle
  if (props.activeTab === 'documents') return groupMeta.documents.emptyTitle
  if (props.activeTab === 'system') return groupMeta.system.emptyTitle
  return 'No hay notificaciones por ahora'
})

const emptyStateDescription = computed(() => {
  if (!props.enabledTypes.length) {
    return 'Activá al menos un tipo de notificación desde la configuración para volver a llenar esta bandeja.'
  }

  if (!activeTabHasEnabledTypes.value && props.activeTab !== 'all') {
    return 'No hay tipos activos dentro de esta pestaña. Podés habilitarlos desde configuración.'
  }

  if (props.activeTab === 'tickets') return groupMeta.tickets.emptyDescription
  if (props.activeTab === 'documents') return groupMeta.documents.emptyDescription
  if (props.activeTab === 'system') return groupMeta.system.emptyDescription

  return 'Cuando ocurra algo importante, lo vas a ver acá.'
})

function toneClass(tone: NotificationTone) {
  return toneClassMap[tone] ?? toneClassMap.neutral
}

function isTypeEnabled(type: NotificationType) {
  return props.enabledTypes.includes(type)
}

function isLastVisibleTab(tab: NotificationCenterTab) {
  return props.visibleTabs.length === 1 && props.visibleTabs.includes(tab)
}

function isTabToggleDisabled(tab: NotificationCenterTab) {
  const isVisible = props.visibleTabs.includes(tab)
  if (isVisible) return isLastVisibleTab(tab)
  return props.visibleTabs.length >= 3
}

function toggleSettings() {
  isSettingsOpen.value = !isSettingsOpen.value
}

function closeSettings() {
  isSettingsOpen.value = false
}

function handleResetSettings() {
  emit('resetSettings')
  closeSettings()
}
</script>

<template>
  <UCard
    class="flex flex-col overflow-hidden border border-default/80 bg-default/95 shadow-2xl"
    :class="props.isMobile
      ? 'mx-2 mb-2 h-[min(85vh,52rem)] w-[calc(100vw-1rem)] rounded-[1.5rem]'
      : 'w-[min(30rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-[1.75rem]'"
    :ui="{
      header: 'shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5',
      body: 'flex min-h-0 flex-1 flex-col px-4 pb-0 pt-0 sm:px-5',
      footer: 'shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5'
    }"
  >
    <template #header>
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div
            class="min-w-0 flex-1"
            :class="props.isMobile ? '' : 'cursor-grab select-none touch-none active:cursor-grabbing'"
            @pointerdown="!props.isMobile ? emit('dragStart', $event) : undefined"
          >
            <div
              v-if="props.isMobile"
              class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-default"
            />

            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-lg font-semibold tracking-tight text-highlighted sm:text-xl">
                  Notificaciones
                </h3>
                <p class="mt-1 text-sm text-muted">
                  {{ unreadCount ? `${unreadCount} sin leer` : 'Todo al día' }}
                </p>
              </div>

              <div v-if="!props.isMobile" class="hidden items-center gap-2 sm:flex">
                <span class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                  Arrastrar
                </span>
                <UIcon name="i-lucide-grip-horizontal" class="size-4 text-muted" />
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <UButton
              icon="i-lucide-settings-2"
              size="sm"
              color="neutral"
              :variant="isSettingsOpen || hasCustomSettings ? 'soft' : 'ghost'"
              square
              aria-label="Opciones de notificaciones"
              @click="toggleSettings"
            />

            <UButton
              icon="i-lucide-refresh-cw"
              size="sm"
              color="neutral"
              variant="ghost"
              square
              :loading="loading"
              aria-label="Recargar"
              @click="emit('refresh')"
            />

            <UButton
              icon="i-lucide-x"
              size="sm"
              color="neutral"
              variant="ghost"
              square
              aria-label="Cerrar"
              @click="emit('close')"
            />
          </div>
        </div>

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="-translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-1 opacity-0"
        >
          <div v-if="isSettingsOpen" class="rounded-2xl border border-default/70 bg-elevated/40 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-highlighted">Opciones del centro</p>
                <p class="mt-1 text-xs text-muted">
                  {{ settingsSummary }}
                </p>
              </div>

              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                square
                aria-label="Cerrar opciones"
                @click="closeSettings"
              />
            </div>

            <div class="mt-4 grid max-h-[min(24rem,45vh)] gap-4 overflow-y-auto pr-1">
              <section class="grid gap-3">
                <div>
                  <p class="text-sm font-medium text-highlighted">Pestañas visibles</p>
                  <p class="mt-1 text-xs text-muted">
                    Definí qué divisiones querés mostrar arriba del listado.
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="filter in notificationTabOptions"
                    :key="filter.key"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition sm:text-sm"
                    :class="visibleTabs.includes(filter.key)
                      ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                      : 'border-default/70 bg-default/75 text-muted hover:border-primary/15 hover:text-highlighted'"
                    :disabled="isTabToggleDisabled(filter.key)"
                    @click="emit('toggle:visible-tab', filter.key)"
                  >
                    <UIcon
                      :name="visibleTabs.includes(filter.key) ? 'i-lucide-check' : 'i-lucide-plus'"
                      class="size-3.5"
                    />
                    <span>{{ filter.label }}</span>
                  </button>
                </div>
              </section>

              <section class="grid gap-3 border-t border-default/70 pt-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-highlighted">Tipos de notificación</p>
                    <p class="mt-1 text-xs text-muted">
                      Elegí qué actividad querés recibir dentro del centro.
                    </p>
                  </div>

                  <UButton
                    v-if="hasCustomSettings"
                    size="sm"
                    color="neutral"
                    variant="outline"
                    class="rounded-xl"
                    @click="handleResetSettings"
                  >
                    Restablecer
                  </UButton>
                </div>

                <div class="grid gap-3">
                  <div
                    v-for="group in notificationTypeGroups"
                    :key="group.key"
                    class="grid gap-2"
                  >
                    <div>
                      <p class="text-sm font-medium text-highlighted">{{ group.label }}</p>
                      <p class="mt-1 text-xs text-muted">{{ group.description }}</p>
                    </div>

                    <div class="grid gap-2">
                      <button
                        v-for="option in group.options"
                        :key="option.type"
                        type="button"
                        class="flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition"
                        :class="isTypeEnabled(option.type)
                          ? 'border-primary/20 bg-primary/10 shadow-sm'
                          : 'border-default/70 bg-default/75 hover:border-primary/15 hover:bg-elevated/70'"
                        @click="emit('toggle:type', option.type)"
                      >
                        <div
                          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
                          :class="isTypeEnabled(option.type)
                            ? toneClass(option.tone)
                            : 'border-default/70 bg-elevated text-toned'"
                        >
                          <UIcon :name="option.icon" class="h-4 w-4" />
                        </div>

                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium text-highlighted">{{ option.label }}</p>
                          <p class="mt-1 text-xs text-muted">
                            {{ isTypeEnabled(option.type) ? 'Activo en tu centro de notificaciones' : 'Silenciado para tu cuenta' }}
                          </p>
                        </div>

                        <UIcon
                          :name="isTypeEnabled(option.type) ? 'i-lucide-check-circle-2' : 'i-lucide-circle-off'"
                          class="mt-0.5 size-4 shrink-0 text-toned"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section class="grid gap-3 border-t border-default/70 pt-4">
                <div>
                  <p class="text-sm font-medium text-highlighted">Vista previa</p>
                  <p class="mt-1 text-xs text-muted">
                    Elegí un tipo para ver cómo aparecería en tu centro.
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in notificationTypeOptions"
                    :key="`preview-${option.type}`"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition sm:text-sm"
                    :class="previewType === option.type
                      ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
                      : 'border-default/70 bg-default/75 text-muted hover:border-primary/15 hover:text-highlighted'"
                    @click="previewType = option.type"
                  >
                    <UIcon :name="option.icon" class="size-3.5" />
                    <span>{{ option.label }}</span>
                  </button>
                </div>

                <div class="pointer-events-none">
                  <NotificationsNotificationItem :notification="previewNotification" />
                </div>
              </section>
            </div>
          </div>
        </Transition>

        <div
          v-if="visibleFilters.length"
          class="overflow-x-auto pb-1"
        >
          <div class="flex min-w-max gap-2">
            <button
              v-for="filter in visibleFilters"
              :key="filter.key"
              type="button"
              class="rounded-full px-3 py-2 text-xs font-medium transition sm:text-sm"
              :class="activeTab === filter.key
                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                : 'bg-default/70 text-muted hover:text-highlighted'"
              @click="emit('update:active-tab', filter.key)"
            >
              {{ filter.label }}
            </button>
          </div>
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

    <div
      v-if="!notifications.length"
      class="flex min-h-[12rem] flex-1 flex-col items-center justify-center py-8 text-center sm:py-12"
    >
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-toned">
        <UIcon name="i-lucide-bell-ring" class="h-6 w-6" />
      </div>
      <p class="mt-4 text-sm font-medium text-highlighted">{{ emptyStateTitle }}</p>
      <p class="mt-1 max-w-sm text-sm text-muted">{{ emptyStateDescription }}</p>
    </div>

    <div v-else class="min-h-0 flex-1 space-y-3 overflow-y-auto pb-1 pr-1">
      <NotificationsNotificationItem
        v-for="notification in notifications"
        :key="notification.id"
        :notification="notification"
        @select="emit('select', $event)"
      />
    </div>

    <template #footer>
      <div class="grid gap-4 border-t border-default/70 pt-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="grid gap-2">
            <p class="text-sm text-muted">
              <template v-if="totalCount">
                Mostrando {{ visibleRangeStart }}-{{ visibleRangeEnd }} de {{ totalCount }}
              </template>
              <template v-else>
                Sin resultados para esta bandeja
              </template>
            </p>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="text-left text-sm font-medium text-highlighted underline decoration-default underline-offset-4 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!notifications.length || !unreadCount"
                @click="emit('markAll')"
              >
                Marcar todas como leídas
              </button>

              <button
                type="button"
                class="text-left text-sm font-medium text-highlighted underline decoration-default underline-offset-4 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="loading"
                @click="emit('deleteReadAll')"
              >
                Eliminar leídas
              </button>
            </div>
          </div>

          <UButton color="neutral" variant="outline" to="/dashboard" class="justify-center">
            Ir al panel
          </UButton>
        </div>

        <div
          v-if="totalCount > perPage"
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted">
            Página {{ page }} de {{ totalPages }}
          </p>

          <div class="overflow-x-auto">
            <UPagination
              :page="page"
              :total="totalCount"
              :items-per-page="perPage"
              show-edges
              active-color="primary"
              active-variant="solid"
              @update:page="emit('update:page', $event)"
            />
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>