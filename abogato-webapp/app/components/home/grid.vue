<script setup lang="ts">
const cards = ref([
  {
    title: 'Icons',
    description: 'Nuxt UI integrates with Nuxt Icon to access over 200,000+ icons from Iconify.',
    icon: '',
    to: '/docs/getting-started/integrations/icons'
  },
  {
    title: 'Fonts',
    description: 'Nuxt UI integrates with Nuxt Fonts to provide plug-and-play font optimization.',
    icon: '',
    to: '/docs/getting-started/integrations/fonts'
  },
  {
    title: 'Color Mode',
    description: 'Nuxt UI integrates with Nuxt Color Mode to switch between light and dark.',
    icon: '',
    to: '/docs/getting-started/integrations/color-mode'
  }
])
</script>

<template>
  <UPageSection
    title="Abogato"
    description="Nuestro sistema de autogestion legal te permitira inicar tus tramites legales en minutos, con un aistente virtual que te guiara en todo momento a la hota de crear la solucitud"
    headline="Quienes somos?"
  />
  <UPageGrid>
    <UPageCard
      v-for="(card, index) in cards"
      :key="index"
      v-bind="card"
    />
  </UPageGrid>
</template>

