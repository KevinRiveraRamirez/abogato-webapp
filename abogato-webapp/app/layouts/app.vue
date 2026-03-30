<script setup lang="ts">
import AppSidebar from '~/components/layout/AppSidebar.vue'

const { cargarPerfil } = useUsuario()
const { toggleMobile } = useAppShell()
const route = useRoute()

// Inactividad: cerrar sesión automática en áreas protegidas (layout `app`).
// Se inicializa una sola vez por layout y escucha eventos globales.
useInactivityLogout()

const isFullBleedBuilderPage = computed(() => route.path.startsWith('/admin/plantillas/'))

onMounted(() => {
  cargarPerfil()
})
</script>

<template>
  <div class="flex min-h-dvh min-h-screen flex-col">
    <AppSkipLink />
    <UButton
      class="fixed z-50 rounded-2xl shadow-lg lg:hidden"
      style="
        left: max(1rem, env(safe-area-inset-left, 0px));
        top: max(1rem, env(safe-area-inset-top, 0px));
      "
      size="lg"
      icon="i-lucide-panel-left-open"
      color="neutral"
      variant="outline"
      square
      aria-label="Abrir navegacion"
      @click="toggleMobile"
    />

    <div class="flex min-h-dvh min-h-screen flex-1">
      <AppSidebar />

      <main
        id="main-content"
        class="min-w-0 flex-1 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(4.25rem,calc(1rem+env(safe-area-inset-top)))] sm:px-4 lg:px-5 lg:pb-5 lg:pt-4"
      >
        <UContainer
          v-if="!isFullBleedBuilderPage"
          class="app-page-shell py-5 sm:py-8 lg:py-10"
        >
          <slot />
        </UContainer>

        <div v-else class="h-full py-3 sm:py-4">
          <slot />
        </div>
      </main>
    </div>
  </div>
  <AiChatPopup />
</template>
