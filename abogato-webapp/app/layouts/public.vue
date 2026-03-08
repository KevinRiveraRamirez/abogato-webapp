<!-- DashboardDespuesDeLogin
Este layout se usa para landing y páginas públicas.
-->
<template>
  <div class="flex flex-col min-h-screen">
    <HeaderPublic />
    <main class="flex-1">
      <slot />
    </main>
    <FooterPublic />
  </div>
</template>

<script setup lang="ts">
import HeaderPublic from '~/components/shared/HeaderPublic.vue'
import FooterPublic from '~/components/shared/FooterPublic.vue'
</script>
