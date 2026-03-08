<script setup lang="ts">
definePageMeta({ layout: 'public' })

const recursos = [
  {
    categoria: 'Guías',
    icon: 'i-lucide-book-open',
    items: [
      { titulo: '¿Cómo hacer un traspaso de casa?', descripcion: 'Paso a paso del proceso notarial para traspasar una propiedad en Costa Rica.' },
      { titulo: 'Requisitos para el matrimonio civil', descripcion: 'Documentos y pasos necesarios para formalizar un matrimonio ante notario.' },
      { titulo: 'Cómo constituir una sociedad anónima', descripcion: 'Guía práctica para crear una empresa en Costa Rica de forma legal.' }
    ]
  },
  {
    categoria: 'Preguntas frecuentes',
    icon: 'i-lucide-message-circle-question',
    items: [
      { titulo: '¿Cuánto cuesta un traspaso de vehículo?', descripcion: 'Los costos varían según el valor fiscal del bien. Contactanos para un estimado.' },
      { titulo: '¿Cuánto tarda un divorcio por mutuo acuerdo?', descripcion: 'Aproximadamente 3 a 6 meses si ambas partes están de acuerdo y hay acuerdo completo.' },
      { titulo: '¿Puedo firmar documentos digitalmente?', descripcion: 'Para actos notariales se requiere firma presencial o firma digital certificada.' }
    ]
  },
  {
    categoria: 'Documentos útiles',
    icon: 'i-lucide-file-text',
    items: [
      { titulo: 'Modelo de poder notarial general', descripcion: 'Plantilla base para otorgar poderes a un representante legal.' },
      { titulo: 'Checklist traspaso de inmueble', descripcion: 'Lista de verificación de todos los documentos necesarios para una escritura.' },
      { titulo: 'Formulario de consulta inicial', descripcion: 'Descargá y completá este formulario antes de tu primera cita con un abogado.' }
    ]
  }
]
</script>

<template>
  <div>
    <UPageHero
      title="Recursos legales"
      description="Guías, preguntas frecuentes y documentos útiles para que entiendas mejor tus derechos y obligaciones legales en Costa Rica."
      headline="Recursos"
    />

    <div class="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <div v-for="(grupo, i) in recursos" :key="i" class="space-y-6">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <UIcon :name="grupo.icon" class="text-primary-600 dark:text-primary-400 text-xl" />
          </div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ grupo.categoria }}</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div
            v-for="(item, j) in grupo.items"
            :key="j"
            class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-2 hover:shadow-sm transition-shadow"
          >
            <h3 class="font-semibold text-gray-900 dark:text-white text-sm">{{ item.titulo }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{{ item.descripcion }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-2xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8 text-center space-y-4">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">¿Necesitás asesoría personalizada?</h3>
        <p class="text-gray-600 dark:text-gray-300">Nuestro equipo puede ayudarte a resolver cualquier consulta legal específica.</p>
        <div class="flex gap-3 justify-center">
          <UButton to="/contact/contact" size="lg">Contactanos</UButton>
          <UButton to="/login" variant="soft" size="lg">Crear cuenta</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
