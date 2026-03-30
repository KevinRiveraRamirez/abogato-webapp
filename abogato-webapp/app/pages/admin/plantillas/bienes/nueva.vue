<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })
</script>

<template>
  <AdminAssetTemplateBuilder />
</template>

