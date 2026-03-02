<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

const items = ref<AccordionItem[]>([
  {
    label: 'Como funciona?',
    icon: '',
    content: 'You have nothing to do, @nuxt/icon will handle it automatically.'
  },
  {
    label: 'Tiene valides legal?',
    icon: '',
    content: 'Choose a primary and a neutral color from your Tailwind CSS theme.'
  },
  {
    label: 'Cuanto dura en resolver un caso?',
    icon: '',
    content: 'You can customize components by using the `class` / `ui` props or in your app.config.ts.'
  }
])
</script>

<template>
  <UAccordion :unmount-on-hide="false" :items="items" />
</template>
