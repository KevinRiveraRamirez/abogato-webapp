<!-- Layout para el panel autenticado. -->

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1">
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'
</script>
