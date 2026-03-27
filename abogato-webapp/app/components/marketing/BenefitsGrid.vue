<script setup lang="ts">
const cards = ref([
  {
    title: 'Asesoría Legal',
    description: 'Consultoría personalizada en derecho civil, familiar y comercial con abogados especializados.',
    icon: 'i-lucide-scale',
    to: '/servicios'
  },
  {
    title: 'Trámites Notariales',
    description: 'Gestión completa de escrituras, traspasos y documentos con validez legal ante notario.',
    icon: 'i-lucide-file-text',
    to: '/servicios'
  },
  {
    title: 'Seguimiento Digital',
    description: 'Revisá el estado de tus trámites en tiempo real desde cualquier dispositivo.',
    icon: 'i-lucide-monitor-check',
    to: '/tickets'
  }
])
</script>

<template>
  <UPageSection
    title="¿Por qué elegirnos?"
    description="Combinamos experiencia jurídica con tecnología para ofrecerte un servicio legal ágil, transparente y accesible."
    headline="¿Quiénes somos?"
  />
  <UPageGrid>
    <UPageCard
      v-for="(card, index) in cards"
      :key="index"
      v-bind="card"
    />
  </UPageGrid>
</template>
