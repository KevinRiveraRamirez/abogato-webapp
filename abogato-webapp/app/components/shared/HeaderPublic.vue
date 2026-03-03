<!-- Header que se usa para las vistas SIN LogIn -->

<template>
  <UHeader>
    <template #title>
      <IconsLogo />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />

      <UButton
        color="primary"
        variant="ghost"
        icon="mdi:account"
        to="/sigin"
        label="Registrarte"
      />

      <UButton
        color="primary"
        variant="solid"
        icon="mdi:login"
        to="/login"
        label="Inicia sesion"
      />
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "Servicios",
    to: "/servicios/servicios",
    active: route.path.startsWith("/servicios"),
  },
  {
    label: "Sobre Nosotros",
    to: "/about/about",
    active: route.path.startsWith("/about"),
  },
  {
    label: "Contacto",
    to: "/contact/contact",
    active: route.path.startsWith("/contact"),
  },
  {
    label: "Recursos",
    to: "/recurso/recursos",
    active: route.path.startsWith("/recursos"),
  },
  {
    label: "Prueba componentes",
    to: "/pruebaComponentes",
    active: route.path.startsWith("/pruebasComponentest"),
  },
]);
</script>
