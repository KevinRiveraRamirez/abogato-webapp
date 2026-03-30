<script setup lang="ts">
type SelectOption = {
  label: string
  value: number
}

const props = withDefaults(defineProps<{
  title: string
  description?: string
  searchTerm: string
  searchPlaceholder?: string
  resultsLabel?: string
  perPage: number
  perPageOptions: SelectOption[]
  hasActiveFilters?: boolean
  activeFilterCount?: number
  clearLabel?: string
}>(), {
  description: undefined,
  searchPlaceholder: 'Buscar',
  resultsLabel: '',
  hasActiveFilters: false,
  activeFilterCount: 0,
  clearLabel: 'Limpiar filtros',
})

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:perPage': [value: number]
  clearFilters: []
}>()

const root = ref<HTMLElement | null>(null)
const filterTriggerRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const viewportPadding = 12
const gap = 8

function panelBesideTrigger(panelRect: DOMRect, trigger: DOMRect | undefined) {
  const margin = viewportPadding
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
  storageKey: 'floating-panel:filters',
  viewportMargin: viewportPadding,
  getBaseStyle: () => {
    const rect = root.value?.getBoundingClientRect()
    const preferredWidth = 672
    const maxWidth = Math.min(preferredWidth, window.innerWidth - viewportPadding * 2)
    const width = Math.min(Math.max(rect?.width ?? 320, 320), maxWidth)

    return {
      width: `${width}px`,
      maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
    }
  },
  getDefaultPosition: (panelRect) =>
    panelBesideTrigger(panelRect, filterTriggerRef.value?.getBoundingClientRect()),
})

const searchModel = computed({
  get: () => props.searchTerm,
  set: (value: string) => emit('update:searchTerm', value),
})

const perPageModel = computed({
  get: () => props.perPage,
  set: (value: number | string) => emit('update:perPage', Number(value)),
})

function closePanel() {
  isOpen.value = false
}

async function openPanel() {
  isOpen.value = true
  await nextTick()
  updatePanelPosition()
}

async function togglePanel() {
  if (isOpen.value) {
    closePanel()
    return
  }

  await openPanel()
}

function handleClickOutside(event: MouseEvent) {
  if (!isOpen.value || !root.value) return
  if (shouldIgnoreOutsideClick()) return

  const target = event.target as Node | null
  if (target && (root.value.contains(target) || panel.value?.contains(target))) return

  closePanel()
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closePanel()
}

onMounted(() => {
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

watch(isOpen, async (open) => {
  if (!open) return
  await nextTick()
  updatePanelPosition()
  requestAnimationFrame(() => {
    updatePanelPosition()
  })
})
</script>

<template>
  <div ref="root" class="relative grid gap-4">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="grid gap-3 xl:min-w-[340px] xl:max-w-xl">
        <div class="flex flex-wrap items-center gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-sm text-muted">
              {{ description }}
            </p>
          </div>

          <slot name="titleMeta" />
        </div>

        <div class="flex items-center gap-2">
          <UInput
            v-model="searchModel"
            icon="i-lucide-search"
            class="flex-1"
            :placeholder="searchPlaceholder"
          />

          <div ref="filterTriggerRef" class="relative">
            <UButton
              icon="i-lucide-sliders-horizontal"
              color="neutral"
              :variant="isOpen || activeFilterCount ? 'soft' : 'outline'"
              square
              class="rounded-xl border-default/80 bg-default/90 shadow-sm"
              :aria-expanded="isOpen"
              aria-label="Abrir filtros"
              @click="togglePanel"
            />

            <span
              v-if="activeFilterCount"
              class="pointer-events-none absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white shadow-sm"
            >
              {{ activeFilterCount }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 xl:justify-end">
        <p v-if="resultsLabel" class="text-sm text-muted">
          {{ resultsLabel }}
        </p>

        <slot name="summaryExtra" />

        <USelect
          v-model="perPageModel"
          class="min-w-40"
          value-key="value"
          :items="perPageOptions"
        />

        <UButton
          v-if="hasActiveFilters"
          size="sm"
          color="neutral"
          variant="outline"
          class="rounded-xl"
          @click="emit('clearFilters')"
        >
          {{ clearLabel }}
        </UButton>
      </div>
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
          <AppSurface variant="floating" radius="xl" padding="sm">
            <div class="flex items-start justify-between gap-3">
              <div
                class="flex flex-1 items-start justify-between gap-3 cursor-grab select-none touch-none active:cursor-grabbing"
                @pointerdown="startDragging"
              >
                <div>
                  <p class="text-sm font-semibold text-highlighted">Filtros</p>
                  <p class="mt-1 text-xs text-muted">
                    {{ activeFilterCount ? `${activeFilterCount} aplicados` : 'Sin filtros adicionales aplicados' }}
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                    Arrastrar
                  </span>
                  <UIcon name="i-lucide-grip-horizontal" class="size-4 text-muted" />
                </div>
              </div>

              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                square
                aria-label="Cerrar filtros"
                @click="closePanel"
              />
            </div>

            <div class="mt-4 grid gap-4">
              <slot name="filters" />
            </div>
          </AppSurface>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
