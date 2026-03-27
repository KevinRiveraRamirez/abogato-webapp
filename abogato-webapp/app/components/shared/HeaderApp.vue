<script setup lang="ts">
import NotificationsNotificationBell from '~/components/notifications/NotificationBell.vue'

const { profile, cargarPerfil } = useUsuario()
const logout = useLogout()
const loading = ref(false)

onMounted(() => cargarPerfil())

const itemsCliente = [
  { label: 'Mis tickets', to: '/tickets' },
  { label: 'Traspaso de carro', to: '/traspaso-carro' },
  { label: 'Mi perfil', to: '/account/profile' },
]

const itemsAbogado = [
  { label: 'Mis casos', to: '/lawyer/tickets' },
  { label: 'Traspaso de carro', to: '/traspaso-carro' },
  { label: 'Mi perfil', to: '/account/profile' },
]

const itemsAdmin = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Tickets', to: '/admin/tickets' },
  { label: 'Traspaso de carro', to: '/traspaso-carro' },
  { label: 'Usuarios', to: '/admin/usuarios' },
  { label: 'Mi perfil', to: '/account/profile' },
]

const items = computed(() => {
  if (profile.value?.role === 'admin') return itemsAdmin
  if (profile.value?.role === 'abogado') return itemsAbogado
  return itemsCliente
})

async function signOut() {
  loading.value = true
  try {
    await logout()
  } finally {
    loading.value = false
  }
}
</script>

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
      <NotificationsNotificationBell />
      <UButton
        icon="i-lucide-log-out"
        color="error"
        variant="soft"
        :loading="loading"
        :disabled="loading"
        @click="signOut"
      >
        Cerrar sesión
      </UButton>
    </template>

    <template #body>
      <div class="grid gap-4 px-1 py-3">
        <UNavigationMenu :items="items" orientation="vertical" highlight class="-mx-2.5" />
        <div class="flex items-center gap-3 border-t border-default pt-4 lg:hidden">
          <UColorModeButton variant="ghost" color="neutral" />
          <UButton
            icon="i-lucide-log-out"
            color="error"
            variant="soft"
            :loading="loading"
            :disabled="loading"
            @click="signOut"
          >
            Cerrar sesión
          </UButton>
        </div>
      </div>
    </template>
  </UHeader>
</template>
