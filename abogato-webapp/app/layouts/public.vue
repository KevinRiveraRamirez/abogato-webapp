<!-- Layout para landing y páginas públicas. -->
<template>
  <div class="flex min-h-dvh min-h-screen flex-col">
    <AppSkipLink />
    <PublicHeader />
    <main
      id="main-content"
      class="flex-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div
        class="pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pl-5 sm:pr-5"
      >
        <UContainer class="app-page-shell max-w-[var(--app-content-max)] py-5 sm:py-8 lg:py-12">
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
