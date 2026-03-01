<script setup lang="ts">
import type { NuxtError } from '#app'
import type { inlineConfig } from '#build/types/app.config';
import type { Text } from 'vue';

const props = defineProps<{
  error: NuxtError
}>()
</script>

<template>
  <UApp>
    <UHeader />

    <UError :error="error" 
    :clear="{

        size:'xl',
        icon: 'mdi:airplane-takeoff',
        class:'rounded-full',
        label:'Volver',

    }"
    :ui="{
    statusCode:'text-9xl front-thin',
    
    }"
    />

    <UFooter />
  </UApp>
</template>
