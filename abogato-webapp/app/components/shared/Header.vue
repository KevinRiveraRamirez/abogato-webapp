<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "Productos",
    to: "/products",
    icon: "i-lucide-book-open",
    active: route.path.startsWith("/products"),
  },
  {
    label: "Preciso",
    to: "/pricing",
    icon: "i-lucide-box",
    active: route.path.startsWith("/princing"),
  },
  {
    label: "Nosotros",
    icon: "i-simple-icons-figma",
    to: "/about",
  },
  {
    label: "Contacto",
    icon: "i-lucide-rocket",
    to: "/contact",
  },
]);
</script>

<template>
  <UHeader>
    <template #title>
      <IconsNuxtui />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />

      <UTooltip text="Open on GitHub" :kbds="['meta', 'G']">
        <UButton
          color="neutral"
          variant="ghost"
          to="https://github.com/nuxt/ui"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
        />
      </UTooltip>
      <UButton color="primary"variant="solid"icon="i-simple-icons-github"to="/login"label="Login"/>
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>
