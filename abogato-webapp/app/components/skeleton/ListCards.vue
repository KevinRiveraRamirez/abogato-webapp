<script setup lang="ts">
withDefaults(defineProps<{
  items?: number
  actions?: number
  metaLines?: number
  showDescription?: boolean
}>(), {
  items: 3,
  actions: 2,
  metaLines: 3,
  showDescription: true,
})
</script>

<template>
  <div class="grid gap-4">
    <UCard
      v-for="item in items"
      :key="item"
      class="border border-default/80 bg-default/90 shadow-sm"
    >
      <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <USkeleton class="h-6 w-20 rounded-full" />
            <USkeleton class="h-6 w-16 rounded-full" />
            <USkeleton class="h-6 w-20 rounded-full" />
          </div>

          <USkeleton class="mt-4 h-6 w-full max-w-xl" />
          <USkeleton v-if="showDescription" class="mt-3 h-4 w-full max-w-3xl" />

          <div class="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <USkeleton
              v-for="line in metaLines"
              :key="`${item}-${line}`"
              class="h-4 w-full"
            />
          </div>
        </div>

        <div
          v-if="actions > 0"
          class="flex flex-wrap gap-2 xl:min-w-72 xl:justify-end"
        >
          <USkeleton
            v-for="action in actions"
            :key="`${item}-action-${action}`"
            class="h-10 w-28 rounded-xl"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
