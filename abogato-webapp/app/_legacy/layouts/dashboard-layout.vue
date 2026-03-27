<!-- Login
Este layout se usa para paginas de login 
-->

<script setup lang="ts">
import { dashboardNavbar, dashboardSidebar } from "#build/ui";
</script>

<template>
  <UDashboardGroup
    storage="local"
    storage-key="dashboard-sidebar"
    :persistent="true"
  >
    <DashboardSidebar />
    <div class="flex-1 overflow-auto p-6">
      <slot> </slot>
    </div>

    <UDashboardPanel>
      <dashboardNavbar />
    </UDashboardPanel>
  </UDashboardGroup>
</template>
