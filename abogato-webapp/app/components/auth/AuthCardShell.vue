<script setup lang="ts">
const props = withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description?: string
  contentWidth?: 'sm' | 'md' | 'lg' | 'full'
  cardWidth?: 'sm' | 'md' | 'lg'
  backTo?: string
  backLabel?: string
  showBack?: boolean
}>(), {
  eyebrow: undefined,
  description: undefined,
  contentWidth: 'md',
  cardWidth: 'md',
  backTo: '/',
  backLabel: 'Volver al inicio',
  showBack: true,
})

const contentWidthClass = computed(() => ({
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  full: 'max-w-none',
}[props.contentWidth ?? 'md']))

const cardWidthClass = computed(() => ({
  sm: 'max-w-xl',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
}[props.cardWidth ?? 'md']))
</script>

<template>
  <div class="app-auth-shell">
    <AppSurface
      as="section"
      variant="floating"
      radius="xl"
      padding="lg"
      class="w-full overflow-hidden"
      :class="cardWidthClass"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-2 text-center sm:text-left">
          <p
            v-if="eyebrow"
            class="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80"
          >
            {{ eyebrow }}
          </p>
          <h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
            {{ title }}
          </h1>
          <p
            v-if="description"
            class="max-w-2xl text-sm leading-6 text-muted sm:text-base"
          >
            {{ description }}
          </p>
        </div>

        <div v-if="$slots.headerAside" class="flex shrink-0 justify-end">
          <slot name="headerAside" />
        </div>
      </div>

      <div class="mt-6">
        <div class="mx-auto grid w-full gap-5" :class="contentWidthClass">
          <slot />
        </div>
      </div>

      <div
        v-if="$slots.footer"
        class="mt-6 border-t border-default/70 pt-5"
      >
        <div class="mx-auto" :class="contentWidthClass">
          <slot name="footer" />
        </div>
      </div>
    </AppSurface>

    <div v-if="showBack" class="text-center">
      <NuxtLink :to="backTo" class="app-auth-link">
        {{ backLabel }}
      </NuxtLink>
    </div>
  </div>
</template>
