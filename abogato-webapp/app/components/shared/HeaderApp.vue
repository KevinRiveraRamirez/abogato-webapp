<!-- Header que se usa para las vistas DESPUES de LogIn -->

<script setup lang="ts">
const items = [
  { label: "Tickets", to: "/app/tickets" },
  { label: "Clientes", to: "/app/clientes" },
  { label: "Documentos", to: "/app/documentos" },
];
const logout = useLogout();
const loading = ref(false);
async function signOut() {
  loading.value = true;
  try {
    await logout();
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <UHeader>
    <template #title> <IconsLogo /> </template>
    <UNavigationMenu :items="items" />
    <template #right>
      <UColorModeButton />
      <UButton to="/dashboard" variant="ghost">Dashboard</UButton>
      <UButton
        icon="i-lucide-log-out"
        color="error"
        variant="soft"
        :loading="loading"
        :disabled="loading"
        @click="signOut", to="/login"
      >
        Cerrar sesión
      </UButton>
    </template>
  </UHeader>
</template>
