<template>
  <UHeader>
    <template #title>
      <IconsLogo />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />

      <template v-if="user">
        <UButton color="primary" variant="ghost" to="/tickets" label="Mi panel" />
        <UButton color="error" variant="soft" :loading="loading" @click="cerrarSesion" label="Cerrar sesión" />
      </template>

      <template v-else>
        <UButton color="primary" variant="ghost" to="/login" label="Registrarte" />
        <UButton color="primary" variant="solid" to="/login" label="Iniciar sesión" />
      </template>
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const loading = ref(false);
const route = useRoute();

async function cerrarSesion() {
  loading.value = true;
  await supabase.auth.signOut();
  loading.value = false;
  await navigateTo("/login", { replace: true });
}

const items = computed<NavigationMenuItem[]>(() => [
  { label: "Servicios", to: "/servicios/servicios", active: route.path.startsWith("/servicios") },
  { label: "Sobre Nosotros", to: "/about/about", active: route.path.startsWith("/about") },
  { label: "Contacto", to: "/contact/contact", active: route.path.startsWith("/contact") },
  { label: "Recursos", to: "/recurso/recursos", active: route.path.startsWith("/recursos") },
]);
</script>
