<script setup lang="ts">
import AppSidebar from '~/components/layout/AppSidebar.vue'

const { cargarPerfil } = useUsuario()
const { toggleMobile } = useAppShell()
const route = useRoute()

const isFullBleedBuilderPage = computed(() => route.path.startsWith('/admin/plantillas/'))

onMounted(() => {
  cargarPerfil()
})
</script>

<template>
  <div class="min-h-screen">
    <UButton
      class="fixed left-4 top-4 z-50 rounded-2xl shadow-lg lg:hidden"
      icon="i-lucide-panel-left-open"
      color="neutral"
      variant="outline"
      square
      aria-label="Abrir navegacion"
      @click="toggleMobile"
    />

    <div class="flex min-h-screen">
      <AppSidebar />

      <main class="min-w-0 flex-1 px-3 pb-3 pt-16 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5 lg:pt-4">
        <UContainer v-if="!isFullBleedBuilderPage" class="app-page-shell py-6 sm:py-8 lg:py-10">
          <slot />
        </UContainer>

        <div v-else class="h-full py-3 sm:py-4">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
