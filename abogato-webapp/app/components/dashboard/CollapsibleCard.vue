<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description?: string
  defaultCollapsed?: boolean
}>(), {
  description: '',
  defaultCollapsed: false,
})

const isCollapsed = ref(props.defaultCollapsed)

const cardUi = computed(() => ({
  header: 'px-5 py-4 sm:px-6 sm:py-5',
  body: isCollapsed.value ? 'hidden' : 'px-5 pb-5 pt-0 sm:px-6 sm:pb-6',
}))

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <UCard
    class="border border-default/80 bg-default/90 shadow-sm"
    :ui="cardUi"
  >
    <template #header>
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-semibold text-highlighted">
              {{ title }}
            </h2>
            <UBadge
              v-if="isCollapsed"
              color="neutral"
              variant="soft"
              size="sm"
            >
              Minimizado
            </UBadge>
          </div>
          <p
            v-if="description && !isCollapsed"
            class="mt-1 text-sm text-muted"
          >
            {{ description }}
          </p>
        </div>

        <div class="flex items-center justify-end gap-2">
          <slot name="header-extra" />

          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :icon="isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
            :aria-label="isCollapsed ? `Expandir ${title}` : `Minimizar ${title}`"
            @click="toggleCollapsed"
          />
        </div>
      </div>
    </template>

    <slot v-if="!isCollapsed" />
  </UCard>
</template>
