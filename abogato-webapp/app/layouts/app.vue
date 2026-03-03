<!-- DashboardDespuesDeLogin 
Este layout se usa para todo lo que requiera estar DESPUES de un login 
-->

<template>
  <div class="flex flex-col h-screen">
    <HeaderApp />
    <main class="container mx-auto flex-1 mt-2">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import HeaderApp from '~/components/shared/HeaderApp.vue'
</script>



<!-- <template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style></style>  -->
