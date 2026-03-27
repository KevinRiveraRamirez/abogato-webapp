<template>
  <UPageHero
    title="Soluciones legales para tus trámites. Rápido, sencillo y transparente."
    description="Nuestro sistema de autogestión legal te permite iniciar tus trámites en minutos, con el respaldo de abogados profesionales que te guiarán en cada paso."
    headline="Eficiencia en tus trámites legales"
    :links="links"
  />
</template>

<script setup lang="ts">
import type { ButtonProps } from "#ui/types";

const links = ref<ButtonProps[]>([
  {
    label: "Ver servicios",
    to: "/servicios",
    icon: "i-lucide-scale",
  },
  {
    label: "Crear cuenta",
    to: "/signup",
    color: "neutral",
    variant: "subtle",
    trailingIcon: "i-lucide-arrow-right",
  },
]);
</script>
