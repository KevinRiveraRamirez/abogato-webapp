<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description?: string
  sticky?: boolean
  compact?: boolean
}>(), {
  eyebrow: undefined,
  description: undefined,
  sticky: true,
  compact: false,
})
</script>

<template>
  <AppSurface
    as="section"
    variant="glass"
    radius="xl"
    :class="[
      sticky
        ? 'max-md:static max-md:z-10 md:sticky md:top-0 md:z-20 md:pt-[env(safe-area-inset-top,0px)]'
        : '',
      compact ? 'px-4 py-4 sm:px-5 lg:px-8' : 'px-4 py-4 sm:px-5 sm:py-5 lg:px-8',
    ]"
  >
    <div
      class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between lg:gap-6"
    >
      <div class="min-w-0 flex flex-1 items-start gap-3">
        <div v-if="$slots.leading" class="shrink-0 pt-0.5">
          <slot name="leading" />
        </div>

        <div class="min-w-0">
          <div
            v-if="eyebrow || $slots.eyebrowExtra"
            class="flex flex-wrap items-center gap-3"
          >
            <p
              v-if="eyebrow"
              class="text-sm font-medium uppercase tracking-[0.22em] text-primary/80"
            >
              {{ eyebrow }}
            </p>

            <slot name="eyebrowExtra" />
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 class="text-pretty text-xl font-semibold text-highlighted sm:text-2xl md:text-3xl">
              {{ title }}
            </h1>

            <slot name="titleMeta" />
          </div>

          <p
            v-if="description"
            class="mt-2 max-w-3xl text-sm leading-6 text-muted sm:text-base"
          >
            {{ description }}
          </p>

          <div v-if="$slots.meta" class="mt-3 flex flex-wrap items-center gap-2">
            <slot name="meta" />
          </div>
        </div>
      </div>

      <div
        v-if="$slots.actions"
        class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
      >
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.footer" class="mt-4 sm:mt-6">
      <slot name="footer" />
    </div>
  </AppSurface>
</template>
