<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'es',
  },
})
</script>

<template>
  <UApp>
    <AuthSessionLoadingScreen />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
