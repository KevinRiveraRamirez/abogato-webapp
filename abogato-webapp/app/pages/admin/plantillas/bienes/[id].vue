<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const route = useRoute()
const templateId = computed(() => String(route.params.id ?? ''))
</script>

<template>
  <AdminAssetTemplateBuilder :template-id="templateId" />
</template>

