<template>
  <UNavigationMenu :items="items" highlight />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  { label: 'Inicio', to: '/', active: route.path === '/' },
  { label: 'Servicios', to: '/servicios/servicios', active: route.path.startsWith('/servicios') },
  { label: 'Sobre nosotros', to: '/about/about', active: route.path.startsWith('/about') },
  { label: 'Contacto', to: '/contact/contact', active: route.path.startsWith('/contact') },
  { label: 'Dashboard', to: '/dashboard', active: route.path.startsWith('/dashboard') },
])
</script>
