<script setup lang="ts">
import { resolveDynamicComponent } from 'vue'

const props = withDefaults(defineProps<{
  as?: string
  variant?: 'panel' | 'soft' | 'floating' | 'glass' | 'muted'
  radius?: 'sm' | 'md' | 'lg' | 'xl'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}>(), {
  as: 'div',
  variant: 'panel',
  radius: 'lg',
  padding: 'none',
  interactive: false,
})

const component = computed(() => resolveDynamicComponent(props.as))

const variantClass = computed(() => ({
  panel: 'app-surface',
  soft: 'app-surface app-surface-soft',
  floating: 'app-surface app-surface-floating',
  glass: 'app-surface app-surface-glass',
  muted: 'app-surface app-surface-muted',
}[props.variant]))

const radiusClass = computed(() => ({
  sm: 'app-panel-sm',
  md: 'app-panel-md',
  lg: 'app-panel-lg',
  xl: 'app-panel-xl',
}[props.radius]))

const paddingClass = computed(() => ({
  none: '',
  sm: 'p-4 sm:p-5',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-7',
}[props.padding]))
</script>

<template>
  <component
    :is="component"
    :class="[
      variantClass,
      radiusClass,
      paddingClass,
      interactive ? 'transition-transform duration-200 hover:-translate-y-px' : '',
    ]"
  >
    <slot />
  </component>
</template>
