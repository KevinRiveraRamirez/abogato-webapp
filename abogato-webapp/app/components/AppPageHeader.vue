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
  <section
    class="rounded-[34px] border border-white/45 bg-default/64 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.5)] backdrop-blur-3xl backdrop-brightness-105 backdrop-saturate-150 dark:border-white/10"
    :class="[
      sticky ? 'sticky top-0 z-20' : '',
      compact ? 'px-5 py-4 lg:px-8' : 'px-5 py-5 lg:px-8',
    ]"
  >
    <div class="flex flex-wrap items-start justify-between gap-4 lg:gap-6">
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

          <div class="mt-2 flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold text-highlighted sm:text-3xl">
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
        class="flex shrink-0 flex-wrap items-center justify-end gap-2"
      >
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.footer" class="mt-6">
      <slot name="footer" />
    </div>
  </section>
</template>
