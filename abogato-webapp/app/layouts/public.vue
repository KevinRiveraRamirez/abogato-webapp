<!-- DashboardDespuesDeLogin
Este layout se usa para landing y páginas públicas.
-->
<template>
  <div class="flex min-h-screen flex-col">
    <HeaderPublic />
    <main class="flex-1">
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </main>
    <FooterPublic />
  </div>
</template>

<script setup lang="ts">
import HeaderPublic from '~/components/shared/HeaderPublic.vue'
import FooterPublic from '~/components/shared/FooterPublic.vue'
</script>
