<!-- DashboardDespuesDeLogin 
Este layout se usa para todo lo que requiera estar DESPUES de un login 
-->

<template>
  <div class="flex min-h-screen flex-col">
    <HeaderApp />
    <main class="flex-1">
      <UContainer class="py-6 sm:py-8">
        <slot />
      </UContainer>
    </main>
  </div>
</template>

<script setup lang="ts">
import HeaderApp from '~/components/shared/HeaderApp.vue'
</script>
