<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const route = useRoute()
const templateId = computed(() => String(route.params.id ?? ''))
</script>

<template>
  <AdminDocumentTemplateBuilder :template-id="templateId" />
</template>
