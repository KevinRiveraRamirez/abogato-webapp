<!-- Layout para landing y páginas públicas. -->
<template>
  <div class="flex min-h-screen flex-col">
    <PublicHeader />
    <main class="flex-1">
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </main>
    <PublicFooter />
  </div>
</template>

<script setup lang="ts">
import PublicFooter from '~/components/layout/PublicFooter.vue'
import PublicHeader from '~/components/layout/PublicHeader.vue'
</script>
