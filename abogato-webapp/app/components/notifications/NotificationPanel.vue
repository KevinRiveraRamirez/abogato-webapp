<script setup lang="ts">
import NotificationsNotificationItem from '~/components/notifications/NotificationItem.vue'
import {
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
}>(), {
  hasCustomSettings: false,
  error: null,
})

const emit = defineEmits<{
  dragStart: [event: PointerEvent]
  select: [notification: NotificationRecord]
  markAll: []
  refresh: []
  'update:page': [page: number]
  'update:active-tab': [tab: NotificationCenterTab]
  'toggle:type': [type: NotificationType]
  'toggle:visible-tab': [tab: NotificationCenterTab]
  resetSettings: []
}>()

const settingsButton = ref<HTMLElement | null>(null)
const settingsPanel = ref<HTMLElement | null>(null)
const isSettingsOpen = ref(false)

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

const notificationTypeGroups = computed(() => [
  {
    key: 'tickets',
    label: 'Casos',
    description: 'Avisos sobre tickets, comentarios y cambios de estado.',
    options: notificationTypeOptions.filter(option => option.group === 'tickets'),
  },
  {
    key: 'documents',
    label: 'Documentos',
    description: 'Aprobaciones o rechazos de archivos vinculados al caso.',
    options: notificationTypeOptions.filter(option => option.group === 'documents'),
  },
])

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

const activeTabHasEnabledTypes = computed(() => {
  if (props.activeTab === 'all') {
    return props.enabledTypes.length > 0
  }

  return props.enabledTypes.some(type => getNotificationGroup(type) === props.activeTab)
})

const emptyStateTitle = computed(() => {
  if (!props.enabledTypes.length) {
    return 'No hay categorias activas'
  }

  if (props.activeTab === 'tickets') {
    return 'Sin actividad de casos'
  }

  if (props.activeTab === 'documents') {
    return 'Sin actividad documental'
  }

  return 'No hay notificaciones por ahora'
})

const emptyStateDescription = computed(() => {
  if (!props.enabledTypes.length) {
    return 'Activá al menos un tipo de notificacion desde el engranaje para volver a llenar esta bandeja.'
  }

  if (!activeTabHasEnabledTypes.value && props.activeTab !== 'all') {
    return 'No hay tipos activos dentro de esta division. Podés habilitarlos desde el engranaje.'
  }

  if (props.activeTab === 'tickets') {
    return 'Todavía no hay movimiento de casos en esta bandeja.'
  }

  if (props.activeTab === 'documents') {
    return 'Todavía no hay actividad documental en esta bandeja.'
  }

  return 'Cuando ocurra algo importante en tus casos, lo vas a ver acá.'
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

function closeSettings() {
  isSettingsOpen.value = false
}

function toggleSettings() {
  isSettingsOpen.value = !isSettingsOpen.value
}

function handleSettingsClickOutside(event: MouseEvent) {
  if (!isSettingsOpen.value) return

  const target = event.target
  if (!(target instanceof Node)) return
  if (settingsButton.value?.contains(target)) return
  if (settingsPanel.value?.contains(target)) return

  closeSettings()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeSettings()
  }
}

function handleResetSettings() {
  emit('resetSettings')
  closeSettings()
}

onMounted(() => {
  document.addEventListener('click', handleSettingsClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleSettingsClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <SkeletonNotificationPanel v-if="loading && !notifications.length && !error" />

  <UCard
    v-else
    class="app-floating-panel app-panel-xl flex w-[clamp(20rem,32vw,30rem)] max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col sm:max-h-[calc(100vh-2rem)] sm:max-w-[calc(100vw-2rem)]"
    :ui="{
      header: 'shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pt-5',
      body: 'flex min-h-0 flex-1 flex-col px-4 pb-0 pt-0 sm:px-5',
      footer: 'shrink-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5'
    }"
  >
    <template #header>
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div
            class="flex min-w-0 flex-1 items-start justify-between gap-3 cursor-grab select-none touch-none active:cursor-grabbing"
            @pointerdown="emit('dragStart', $event)"
          >
            <div class="min-w-0">
              <h3 class="text-xl font-semibold tracking-tight text-highlighted">Notificaciones</h3>
              <p class="mt-1 text-sm text-muted">
                {{ unreadCount ? `${unreadCount} sin leer` : 'Todo al dia' }}
              </p>
            </div>

            <div class="hidden items-center gap-2 sm:flex">
              <span class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Arrastrar
              </span>
              <UIcon name="i-lucide-grip-horizontal" class="size-4 text-muted" />
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <div ref="settingsButton" class="relative">
              <UButton
                icon="i-lucide-settings-2"
                size="sm"
                color="neutral"
                :variant="isSettingsOpen || hasCustomSettings ? 'soft' : 'ghost'"
                square
                aria-label="Opciones de notificaciones"
                @click.stop="toggleSettings"
              />

              <span
                v-if="hasCustomSettings"
                class="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary shadow-sm"
              />
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
        </div>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="-translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-1 opacity-0"
        >
          <div v-if="isSettingsOpen" ref="settingsPanel">
            <AppSurface variant="floating" radius="xl" padding="sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-highlighted">Opciones del centro</p>
                  <p class="mt-1 text-xs text-muted">
                    Se guardan en este navegador. {{ settingsSummary }}
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

              <div class="mt-4 grid max-h-[min(24rem,50vh)] gap-4 overflow-y-auto pr-1">
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
                      :disabled="isLastVisibleTab(filter.key)"
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

                  <div class="grid gap-4">
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
                          class="flex items-start gap-3 rounded-[1.15rem] border px-3 py-3 text-left transition"
                          :class="isTypeEnabled(option.type)
                            ? 'border-primary/20 bg-primary/8 shadow-sm'
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
                              {{ isTypeEnabled(option.type) ? 'Activo en la bandeja' : 'Oculto en la bandeja' }}
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
              </div>
            </AppSurface>
          </div>
        </Transition>

        <div
          v-if="visibleFilters.length > 1"
          class="app-subtle-panel app-panel-sm p-1"
        >
          <div
            class="grid gap-1"
            :class="visibleFilters.length === 2 ? 'grid-cols-2' : 'grid-cols-3'"
          >
            <button
              v-for="filter in visibleFilters"
              :key="filter.key"
              type="button"
              class="rounded-[1rem] px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm"
              :class="activeTab === filter.key
                ? 'bg-default text-highlighted shadow-sm ring-1 ring-default'
                : 'text-muted hover:text-highlighted'"
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
      <p class="mt-1 text-sm text-muted">{{ emptyStateDescription }}</p>
    </div>

    <div v-else class="scrollbar-none min-h-0 flex-1 space-y-3 overflow-y-auto pb-1 pr-1">
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
          <div class="grid gap-1">
            <p class="text-sm text-muted">
              <template v-if="totalCount">
                Mostrando {{ visibleRangeStart }}-{{ visibleRangeEnd }} de {{ totalCount }}
              </template>
              <template v-else>
                Sin resultados para esta bandeja
              </template>
            </p>

            <button
              type="button"
              class="text-left text-sm font-medium text-highlighted underline decoration-default underline-offset-4 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!notifications.length || !unreadCount"
              @click="emit('markAll')"
            >
              Marcar todas como leidas
            </button>
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
    </template>
  </UCard>
</template>
