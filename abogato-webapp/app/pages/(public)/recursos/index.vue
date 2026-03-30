<script setup lang="ts">
definePageMeta({ layout: 'public' })

const categorias = [
  'Todos',
  'Notarial',
  'Familia',
  'Empresas',
  'Propiedades',
  'Documentos'
]

const posts = [
  {
    titulo: '¿Cómo hacer un traspaso de casa en Costa Rica?',
    descripcion: 'Conocé los pasos básicos, documentos requeridos y el papel del notario en el proceso de traspaso de una propiedad.',
    categoria: 'Propiedades',
    fecha: '25 marzo 2026',
    imagen: '/img/blog/traspaso-casa.jpg',
    to: '/blog/traspaso-casa'
  },
  {
    titulo: 'Requisitos para el matrimonio civil ante notario',
    descripcion: 'Te explicamos qué documentos necesitás, cuánto tiempo toma y qué aspectos debés prever antes de iniciar el trámite.',
    categoria: 'Familia',
    fecha: '20 marzo 2026',
    imagen: '/img/blog/matrimonio-civil.jpg',
    to: '/blog/requisitos-matrimonio-civil'
  },
  {
    titulo: 'Cómo constituir una sociedad anónima paso a paso',
    descripcion: 'Una guía clara para quienes desean formalizar una empresa en Costa Rica de manera legal y ordenada.',
    categoria: 'Empresas',
    fecha: '18 marzo 2026',
    imagen: '/img/blog/sociedad-anonima.jpg',
    to: '/blog/constituir-sociedad-anonima'
  },
  {
    titulo: '¿Cuánto cuesta un traspaso de vehículo?',
    descripcion: 'Revisamos los factores que influyen en el costo, impuestos y gastos notariales del proceso.',
    categoria: 'Notarial',
    fecha: '15 marzo 2026',
    imagen: '/img/blog/traspaso-vehiculo.jpg',
    to: '/blog/costo-traspaso-vehiculo'
  },
  {
    titulo: 'Divorcio por mutuo acuerdo: tiempos y consideraciones',
    descripcion: 'Te contamos cuánto puede tardar, qué debe existir entre las partes y qué revisar antes de empezar.',
    categoria: 'Familia',
    fecha: '10 marzo 2026',
    imagen: '/img/blog/divorcio-mutuo-acuerdo.jpg',
    to: '/blog/divorcio-mutuo-acuerdo'
  },
  {
    titulo: 'Firma digital en trámites legales: cuándo sí y cuándo no',
    descripcion: 'Una explicación simple sobre el uso de firma digital certificada y sus limitaciones en actos notariales.',
    categoria: 'Documentos',
    fecha: '05 marzo 2026',
    imagen: '/img/blog/firma-digital.jpg',
    to: '/blog/firma-digital-tramites-legales'
  }
]
</script>

<template>
  <div>
    <UPageHero
      title="Blog legal"
      description="Artículos, guías y explicaciones prácticas para entender mejor trámites, documentos y procesos legales en Costa Rica."
      headline="Blog"
    >
      <template #links>
        <div class="w-full max-w-xl">
          <UInput
            icon="i-lucide-search"
            size="xl"
            placeholder="Buscar artículos, temas o trámites..."
          />
        </div>
      </template>
    </UPageHero>

    <div class="max-w-6xl mx-auto px-4 py-12 space-y-10">
      <section class="flex flex-wrap gap-3">
        <UButton
          v-for="(categoria, i) in categorias"
          :key="i"
          variant="soft"
          color="neutral"
          class="rounded-full"
        >
          {{ categoria }}
        </UButton>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <article
          v-for="(post, i) in posts"
          :key="i"
          class="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
        >
          <img
            :src="post.imagen"
            :alt="post.titulo"
            class="w-full h-52 object-cover"
          >

          <div class="p-5 space-y-3">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span class="inline-flex rounded-full bg-primary-100 dark:bg-primary-900 px-3 py-1 text-primary-700 dark:text-primary-300 font-medium">
                {{ post.categoria }}
              </span>
              <span class="text-gray-500 dark:text-gray-400">{{ post.fecha }}</span>
            </div>

            <h2 class="text-lg font-bold text-gray-900 dark:text-white leading-snug">
              {{ post.titulo }}
            </h2>

            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {{ post.descripcion }}
            </p>

            <div class="pt-2">
              <UButton
                :to="post.to"
                variant="ghost"
                trailing-icon="i-lucide-arrow-right"
                class="px-0"
              >
                Leer artículo
              </UButton>
            </div>
          </div>
        </article>
      </section>

      <section class="rounded-2xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8 text-center space-y-4">
        <h3 class="text-2xl font-bold text-gray-900 dark:text-white">
          ¿Necesitás ayuda con tu caso?
        </h3>
        <p class="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Nuestro equipo puede orientarte si necesitás asesoría más allá del contenido del blog.
        </p>
        <div class="flex gap-3 justify-center flex-wrap">
          <UButton to="/contact" size="lg">Contactanos</UButton>
          <UButton to="/signup" variant="soft" size="lg">Crear cuenta</UButton>
        </div>
      </section>
    </div>
  </div>
</template>