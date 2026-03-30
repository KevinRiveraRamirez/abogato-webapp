<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

const links = [
  { label: 'Ir al inicio', to: '/' },
  { label: 'Contáctanos', to: '/contacto' },
  { label: 'Ver servicios', to: '/servicios' }
]
</script>

<template>
  <UApp>
    <UHeader />

    <main class="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div class="max-w-3xl w-full text-center space-y-8">
        <div class="space-y-4">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Error {{ error.statusCode || 404 }}
          </p>

          <h1 class="text-5xl md:text-7xl font-thin text-gray-900 dark:text-white">
            {{ error.statusCode === 404 ? 'Página no encontrada' : 'Ha ocurrido un error' }}
          </h1>

          <p class="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {{
              error.statusCode === 404
                ? 'La página que intentaste abrir no existe, fue movida o la dirección escrita no es correcta.'
                : error.message || 'Ocurrió un problema inesperado. Intenta de nuevo o vuelve al inicio.'
            }}
          </p>
        </div>

        <div class="flex justify-center">
          <img
            src="/img/404/404-illustration.svg"
            alt="Ilustración de página no encontrada"
            class="max-w-xs md:max-w-md w-full"
          >
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <UButton
            to="/"
            icon="i-lucide-house"
            size="lg"
            class="rounded-full"
          >
            Volver al inicio
          </UButton>

          <UButton
            to="/contacto"
            variant="outline"
            icon="i-lucide-mail"
            size="lg"
            class="rounded-full"
          >
            Contacto
          </UButton>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
          >
            {{ link.label }}
          </NuxtLink>
        </div>

        <div class="max-w-xl mx-auto pt-2">
          <UInput
            icon="i-lucide-search"
            size="xl"
            placeholder="Buscar contenido o página..."
          />
        </div>
      </div>
    </main>

    <UFooter />
  </UApp>
</template>