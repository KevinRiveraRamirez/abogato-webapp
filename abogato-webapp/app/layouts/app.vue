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
  <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,0.98))]">
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

      <main class="min-w-0 flex-1 px-3 pb-3 pt-16 lg:pt-3">
        <UContainer v-if="!isFullBleedBuilderPage" class="py-6 sm:py-8">
          <slot />
        </UContainer>

        <div v-else class="h-full py-3">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
