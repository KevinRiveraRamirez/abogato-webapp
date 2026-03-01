<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <img
      :src="img1"
      alt="Imagen 1"
      class="w-full h-auto rounded-lg object-cover"
    />
    <img
      :src="img2"
      alt="Imagen 2"
      class="w-full h-auto rounded-lg object-cover"
    />
  </div>
</template>

<script setup>
defineProps({
  img1: {
    type: String,
    required: true
  },
  img2: {
    type: String,
    required: true
  }
})
</script>