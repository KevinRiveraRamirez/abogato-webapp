<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

await navigateTo('/admin/dashboard', { replace: true })
</script>

<template>
  <div />
</template>
