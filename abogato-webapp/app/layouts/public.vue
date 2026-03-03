<!-- DashboardDespuesDeLogin 
Este layout se usa para landing y páginas públicas.
-->
<template>
  <div>
    <HeaderPublic />
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import HeaderPublic from '~/components/shared/HeaderPublic.vue'
</script>