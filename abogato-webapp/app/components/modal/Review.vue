<script setup lang="ts">
defineProps<{
  buttonLabel: string;
}>();
const reviewText = ref('');
const rating = ref(0);
const isOpen = ref(false);
const submitReview = () => {
  console.log('submitReview');
  isOpen.value = false;
};
</script>

<template>
  <UModal
    :open="isOpen"
    @close="isOpen = false"
    title="Añadir reseña"
    description="Deja tu reseña sobre el producto."
  >
    <UButton
      :label="buttonLabel"
      color="primary"
      variant="subtle"
      @click="isOpen = true"
    />

    <template #content>
      <UCard :ui="{ body: 'grid gap-5 p-6' }">
        <div>
          <h2 class="text-xl font-semibold text-highlighted">Añadir reseña</h2>
          <p class="mt-1 text-sm text-muted">
            Deja tu reseña sobre el producto.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            v-for="star in 5"
            :key="star"
            color="neutral"
            variant="ghost"
            size="xl"
            square
            :aria-label="`Seleccionar ${star} estrellas`"
            @click="rating = star"
          >
            <UIcon
              name="i-lucide-star"
              class="text-xl"
              :class="rating >= star ? 'text-amber-500' : 'text-muted'"
            />
          </UButton>
        </div>

        <UFormField label="Comentario" required>
          <UTextarea
            v-model="reviewText"
            placeholder="Escribe tu reseña"
            class="w-full"
            :rows="6"
          />
        </UFormField>

        <div class="flex flex-1 items-end">
          <UButton
            color="primary"
            variant="solid"
            block
            label="Enviar reseña"
            :disabled="!reviewText || rating === 0"
            @click="submitReview"
          />
          </div>
      </UCard>
    </template>
  </UModal>
</template>
