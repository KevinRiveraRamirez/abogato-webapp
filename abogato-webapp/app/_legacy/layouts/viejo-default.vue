<script setup lang="ts">
import HeaderPublic from '~/components/shared/HeaderPublic.vue';

</script>

<template>
  <div class="flex flex-col h-screen">
    <!-- <MainNavigation/> -->
    <!--Header-->
    <HeaderPublic/>

    <main class="container mx-auto flex-1 mt-2">
      <slot> </slot>
    </main>

    <!--Footer-->
    <SharedFooter/>
  </div>
</template>


<!-- Revertir en caso de no funcionar los nuevos navbars -->