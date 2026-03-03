<!-- Header que se usa para las vistas DESPUES de LogIn -->

<template>
  <UHeader>
    <template #title>
      <IconsLogo />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />
      <UButton to="/dashboard" variant="ghost">Dashboard</UButton>
      <UButton color="warning" variant="soft" @click="logout">Salir</UButton>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import { useSupabaseClient } from "#imports";

const supabase = useSupabaseClient();

const items = [
  { label: "Tickets", to: "/app/tickets" },
  { label: "Clientes", to: "/app/clientes" },
  { label: "Documentos", to: "/app/documentos" },
];

async function logout() {
  await supabase.auth.signOut();
  await navigateTo("/");
}
</script>

<style scoped>
:deep(a) {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
  opacity: 0.85;
}
:deep(a:hover) {
  opacity: 1;
  transform: translateY(-2px);
}
</style>
