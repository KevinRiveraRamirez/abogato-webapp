<script setup lang="ts">
const { profile, cargarPerfil } = useUsuario()
const logout = useLogout()
const loading = ref(false)

onMounted(() => cargarPerfil())

const itemsCliente = [
  { label: 'Mis tickets', to: '/tickets' },
  { label: 'Mi perfil', to: '/account/profile' },
]

const itemsAbogado = [
  { label: 'Mis casos', to: '/lawyer/tickets' },
  { label: 'Mi perfil', to: '/account/profile' },
]

const itemsAdmin = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Tickets', to: '/lawyer/tickets' },
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
  <UHeader>
    <template #title>
      <IconsLogo />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />
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
  </UHeader>
</template>
