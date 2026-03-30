<template>
  <UHeader
    mode="drawer"
    toggle-side="right"
    class="sticky top-0 z-40 border-b border-default/60 bg-default/85 pt-[max(0px,env(safe-area-inset-top))] backdrop-blur-xl supports-[backdrop-filter]:bg-default/75"
    :ui="{
      center: 'flex-1 justify-end lg:justify-center',
      right: 'flex shrink-0 items-center gap-1 sm:gap-2',
    }"
  >
    <template #title>
      <NuxtLink
        to="/"
        class="flex min-h-11 min-w-0 items-center py-1"
        aria-label="Ir al inicio de Abogato"
      >
        <IconsLogo class="max-h-8 w-auto max-w-[min(9rem,42vw)] object-contain sm:max-h-9" />
      </NuxtLink>
    </template>

    <nav aria-label="Navegación pública">
      <UNavigationMenu
        :items="items"
        highlight
        class="hidden lg:flex"
        :ui="{
          link: 'text-sm font-medium',
        }"
      />
    </nav>

    <template #right>
      <!-- Escritorio: acciones completas -->
      <div class="hidden items-center gap-2 lg:flex">
        <UColorModeButton variant="ghost" color="neutral" />

        <template v-if="user">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-layout-dashboard"
            :to="panelPath"
            label="Mi panel"
          />
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-log-out"
            :loading="loading"
            label="Cerrar sesión"
            @click="cerrarSesion"
          />
        </template>

        <template v-else>
          <UButton color="neutral" variant="ghost" icon="i-lucide-user-plus" to="/signup" label="Registrarte" />
          <UButton color="primary" variant="solid" icon="i-lucide-log-in" to="/login" label="Iniciar sesión" />
        </template>
      </div>

      <!-- Móvil: un acceso rápido; el resto va en el drawer -->
      <div class="flex items-center gap-1 lg:hidden">
        <template v-if="user">
          <UButton
            color="neutral"
            variant="ghost"
            size="md"
            square
            icon="i-lucide-layout-dashboard"
            :to="panelPath"
            aria-label="Ir a mi panel"
          />
        </template>
        <template v-else>
          <UButton
            color="primary"
            variant="solid"
            size="md"
            square
            icon="i-lucide-log-in"
            to="/login"
            aria-label="Iniciar sesión"
          />
        </template>
      </div>
    </template>

    <template #body>
      <div
        class="grid gap-5 px-1 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <nav aria-label="Navegación pública móvil">
          <UNavigationMenu
            :items="items"
            orientation="vertical"
            highlight
            class="w-full -mx-1"
            :ui="{
              root: 'w-full',
              list: 'w-full gap-0.5 sm:gap-1',
              link: 'min-h-12 justify-start rounded-2xl px-3 text-base font-medium sm:min-h-11 sm:text-sm',
            }"
          />
        </nav>
        <div class="grid gap-3 border-t border-default pt-5 lg:hidden">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Preferencias y cuenta
          </p>
          <div class="flex flex-wrap gap-2">
            <UColorModeButton
              variant="outline"
              color="neutral"
              class="min-h-11 justify-center rounded-2xl px-4"
            />
          </div>
          <template v-if="user">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-layout-dashboard"
              class="min-h-11 justify-center rounded-2xl"
              :to="panelPath"
              label="Mi panel"
            />
            <UButton
              color="error"
              variant="soft"
              icon="i-lucide-log-out"
              class="min-h-11 justify-center rounded-2xl"
              :loading="loading"
              label="Cerrar sesión"
              @click="cerrarSesion"
            />
          </template>
          <template v-else>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-user-plus"
              class="min-h-11 justify-center rounded-2xl"
              to="/signup"
              label="Registrarte"
            />
            <UButton
              icon="i-lucide-log-in"
              class="min-h-11 justify-center rounded-2xl"
              to="/login"
              label="Iniciar sesión"
            />
          </template>
        </div>
      </div>
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'
import { getDashboardPathForRole } from '~/utils/app-navigation'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { profile, cargarPerfil, limpiarPerfil } = useUsuario()
const loading = ref(false)
const route = useRoute()

const panelPath = computed(() => {
  return getDashboardPathForRole(profile.value?.role)
})

async function cerrarSesion() {
  loading.value = true
  await supabase.auth.signOut()
  limpiarPerfil()
  loading.value = false
  await navigateTo('/login', { replace: true })
}

const items = computed<NavigationMenuItem[]>(() => [
  { label: 'Servicios', to: '/servicios', active: route.path.startsWith('/servicios') },
  { label: 'Sobre nosotros', to: '/about', active: route.path.startsWith('/about') },
  { label: 'Contacto', to: '/contact', active: route.path.startsWith('/contact') },
  { label: 'Recursos', to: '/recursos', active: route.path.startsWith('/recursos') },
])

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
