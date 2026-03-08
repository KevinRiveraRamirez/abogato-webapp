<template>
  <div>
  <section class="max-w-6xl mx-auto px-4 py-16">
    <!-- 1 columna en móvil, 2 columnas en desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      <!-- HERO lateral -->
      <div class="space-y-4">
        <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
          {{ eyebrow }}
        </p>

        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          {{ title }}
        </h2>

        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ description }}
        </p>

        <div>
          <NuxtLink
            :to="ctaHref"
            class="inline-flex items-center gap-2 font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {{ ctaText }} <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </div>

      <!-- GRID de 4 cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <article
          v-for="(card, idx) in cards"
          :key="idx"
          class="rounded-2xl bg-gray-100 dark:bg-gray-800 p-6"
        >
          <div class="flex items-start gap-4">
            <div class="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-file-check" class="text-primary-600 dark:text-primary-400 text-xl" />
            </div>

            <div class="space-y-2">
              <h3 class="font-bold text-gray-900 dark:text-white">
                {{ card.title }}
              </h3>

              <p class="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                {{ card.description }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</div>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: 'Nuestros servicios' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  ctaText: { type: String, default: 'Ver todos los trámites' },
  ctaHref: { type: String, default: '/tramites' },
  cards: {
    type: Array,
    required: true,
    // [{ title: string, description: string }]
    validator: (arr) =>
      Array.isArray(arr) &&
      arr.every((c) => typeof c?.title === 'string' && typeof c?.description === 'string')
  }
})
</script>