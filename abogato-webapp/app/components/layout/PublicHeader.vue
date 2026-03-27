<template>
  <UHeader
    mode="drawer"
    toggle-side="right"
    class="border-b border-default/60 bg-default/80 backdrop-blur-xl"
  >
    <template #title>
      <IconsLogo />
    </template>

    <UNavigationMenu :items="items" highlight class="hidden lg:flex" />

    <template #right>
      <UColorModeButton variant="ghost" color="neutral" />

      <template v-if="user">
        <UButton color="neutral" variant="ghost" :to="panelPath" label="Mi panel" />
        <UButton color="error" variant="soft" :loading="loading" @click="cerrarSesion" label="Cerrar sesión" />
      </template>

      <template v-else>
        <UButton color="neutral" variant="ghost" to="/signup" label="Registrarte" />
        <UButton color="primary" variant="solid" to="/login" label="Iniciar sesión" />
      </template>
    </template>

    <template #body>
      <div class="grid gap-4 px-1 py-3">
        <UNavigationMenu :items="items" orientation="vertical" highlight class="-mx-2.5" />
        <div class="flex items-center gap-3 border-t border-default pt-4 lg:hidden">
          <UColorModeButton variant="ghost" color="neutral" />
          <template v-if="user">
            <UButton color="neutral" variant="ghost" :to="panelPath" label="Mi panel" />
            <UButton color="error" variant="soft" :loading="loading" @click="cerrarSesion" label="Cerrar sesión" />
          </template>
          <template v-else>
            <UButton color="neutral" variant="ghost" to="/signup" label="Registrarte" />
            <UButton to="/login" label="Iniciar sesión" />
          </template>
        </div>
      </div>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "#ui/types";

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { profile, cargarPerfil } = useUsuario()
const loading = ref(false);
const route = useRoute();

const panelPath = computed(() => {
  if (profile.value?.role === 'admin') return '/admin/dashboard'
  if (profile.value?.role === 'abogado') return '/lawyer/tickets'
  return '/tickets'
})

async function cerrarSesion() {
  loading.value = true;
  await supabase.auth.signOut();
  loading.value = false;
  await navigateTo("/login", { replace: true });
}

const items = computed<NavigationMenuItem[]>(() => [
  { label: "Servicios", to: "/servicios", active: route.path.startsWith("/servicios") },
  { label: "Sobre Nosotros", to: "/about", active: route.path.startsWith("/about") },
  { label: "Contacto", to: "/contact", active: route.path.startsWith("/contact") },
  { label: "Recursos", to: "/recursos", active: route.path.startsWith("/recursos") },
]);

onMounted(() => {
  if (user.value) {
    cargarPerfil()
  }
})

watch(user, async (currentUser) => {
  if (currentUser) {
    await cargarPerfil()
    return
  }

  profile.value = null
})
</script>
