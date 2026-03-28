<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })
</script>

<template>
  <AdminDocumentTemplateBuilder />
</template>
