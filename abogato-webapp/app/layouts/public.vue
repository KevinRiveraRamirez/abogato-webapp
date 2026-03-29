<!-- Layout para landing y páginas públicas. -->
<template>
  <div class="flex min-h-screen flex-col">
    <AppSkipLink />
    <PublicHeader />
    <main id="main-content" class="flex-1">
      <div class="px-4 sm:px-5">
        <UContainer class="app-page-shell py-8 sm:py-10 lg:py-12">
          <slot />
        </UContainer>
      </div>
    </main>
    <PublicFooter />
  </div>
</template>

<script setup lang="ts">
import PublicFooter from '~/components/layout/PublicFooter.vue'
import PublicHeader from '~/components/layout/PublicHeader.vue'
</script>
