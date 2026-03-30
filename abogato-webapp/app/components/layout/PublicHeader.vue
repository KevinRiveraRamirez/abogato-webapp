<template>
  <UHeader
    mode="drawer"
    toggle-side="right"
    class="border-b border-default/60 bg-default/80 backdrop-blur-xl"
    :ui="{
      right: 'flex items-center gap-2',
    }"
  >
    <template #title>
      <NuxtLink to="/" aria-label="Ir al inicio de Abogato">
        <IconsLogo />
      </NuxtLink>
    </template>

    <nav aria-label="Navegación pública">
      <UNavigationMenu :items="items" highlight class="hidden lg:flex" />
    </nav>

    <template #right>
      <UColorModeButton variant="ghost" color="neutral" />

      <template v-if="user">
        <UButton color="neutral" variant="ghost" icon="i-lucide-layout-dashboard" :to="panelPath" label="Mi panel" />
        <UButton color="error" variant="soft" icon="i-lucide-log-out" :loading="loading" @click="cerrarSesion" label="Cerrar sesión" />
      </template>

      <template v-else>
        <UButton color="neutral" variant="ghost" icon="i-lucide-user-plus" to="/signup" label="Registrarte" />
        <UButton color="primary" variant="solid" icon="i-lucide-log-in" to="/login" label="Iniciar sesión" />
      </template>
    </template>

    <template #body>
      <div class="grid gap-4 px-1 py-3">
        <nav aria-label="Navegación pública móvil">
          <UNavigationMenu :items="items" orientation="vertical" highlight class="-mx-2.5" />
        </nav>
        <div class="grid gap-3 border-t border-default pt-4 lg:hidden">
          <UColorModeButton variant="ghost" color="neutral" />
          <template v-if="user">
            <UButton color="neutral" variant="ghost" icon="i-lucide-layout-dashboard" :to="panelPath" label="Mi panel" />
            <UButton color="error" variant="soft" icon="i-lucide-log-out" :loading="loading" @click="cerrarSesion" label="Cerrar sesión" />
          </template>
          <template v-else>
            <UButton color="neutral" variant="ghost" icon="i-lucide-user-plus" to="/signup" label="Registrarte" />
            <UButton icon="i-lucide-log-in" to="/login" label="Iniciar sesión" />
          </template>
        </div>
      </div>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "#ui/types";
import { getDashboardPathForRole } from '~/utils/app-navigation'

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { profile, cargarPerfil, limpiarPerfil } = useUsuario()
const loading = ref(false);
const route = useRoute();

const panelPath = computed(() => {
  return getDashboardPathForRole(profile.value?.role)
})

async function cerrarSesion() {
  loading.value = true;
  await supabase.auth.signOut();
  limpiarPerfil()
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

  limpiarPerfil()
})
</script>
