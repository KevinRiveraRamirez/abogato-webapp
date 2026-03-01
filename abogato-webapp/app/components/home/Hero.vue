<template>
  <UPageHero
    title="Soluciones guiadas para tus tramites legales. Rapido, sencillo y transparente"
    description="Nuestro sistema de autogestion legal te permitira iniicar tus tramites legales en minutos, con un aistente virtual que te guiara en todo momento a la hota de crear la solucitud"
    headline="Eficiencia en sus tramites legales"
    :links="links"
  />
</template>

<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";

const links = ref<ButtonProps[]>([
  {
    label: "Servicios",
    to: "/docs/getting-started",
    icon: "",
  },
  {
    label: "Conoce mas",
    to: "/docs/getting-started/theme/design-system",
    color: "neutral",
    variant: "subtle",
    trailingIcon: "i-lucide-arrow-right",
  },
]);
</script>
