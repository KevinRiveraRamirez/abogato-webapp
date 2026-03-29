<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <img
        :src="img1"
        alt="Equipo legal revisando un caso en una reunión"
        class="w-full h-72 rounded-2xl object-cover"
      />
      <img
        :src="img2"
        alt="Documentos legales organizados sobre una mesa de trabajo"
        class="w-full h-72 rounded-2xl object-cover"
      />
    </div>
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
