<script setup lang="ts">
withDefaults(defineProps<{
  targetId?: string
  label?: string
}>(), {
  targetId: 'main-content',
  label: 'Saltar al contenido principal',
})
</script>

<template>
  <a :href="`#${targetId}`" class="app-skip-link">
    {{ label }}
  </a>
</template>
