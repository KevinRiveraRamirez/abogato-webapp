<script setup lang="ts">
definePageMeta({ layout: 'public' })

const servicios = [
  {
    icon: 'i-lucide-home',
    title: 'Traspaso de Inmuebles',
    description: 'Gestión completa del traspaso de propiedades ante notario: redacción de escritura, validación registral y presentación ante el Registro Nacional.'
  },
  {
    icon: 'i-lucide-car',
    title: 'Traspaso de Vehículos',
    description: 'Formalización legal del cambio de propietario, verificación de gravámenes y presentación del trámite ante las autoridades correspondientes.'
  },
  {
    icon: 'i-lucide-heart-handshake',
    title: 'Derecho Familiar',
    description: 'Asesoría en matrimonio civil, divorcios, pensiones alimentarias y guarda y crianza de menores.'
  },
  {
    icon: 'i-lucide-landmark',
    title: 'Trámites Notariales',
    description: 'Autenticación de documentos, poderes notariales, protestos y todo tipo de actos ante notario público.'
  },
  {
    icon: 'i-lucide-receipt',
    title: 'Asesoría Tributaria',
    description: 'Cumplimiento de obligaciones fiscales, declaración de impuestos y asesoría para personas físicas y jurídicas.'
  },
  {
    icon: 'i-lucide-building-2',
    title: 'Derecho Comercial',
    description: 'Constitución de sociedades, contratos mercantiles, due diligence y representación legal empresarial.'
  }
]
</script>

<template>
  <div>
    <UPageHero
      title="Nuestros servicios legales"
      description="Ofrecemos soluciones jurídicas integrales para personas y empresas, con transparencia, rapidez y respaldo profesional en cada trámite."
      headline="Servicios"
    />

    <div class="max-w-6xl mx-auto px-4 py-12">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(s, i) in servicios"
          :key="i"
          class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4 hover:shadow-md transition-shadow"
        >
          <div class="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <UIcon :name="s.icon" class="text-primary-600 dark:text-primary-400 text-2xl" />
          </div>
          <h3 class="font-bold text-gray-900 dark:text-white text-lg">{{ s.title }}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{{ s.description }}</p>
        </div>
      </div>

      <div class="mt-12 text-center space-y-3">
        <p class="text-gray-600 dark:text-gray-300">¿No encontrás lo que buscás?</p>
        <UButton to="/contact/contact" color="primary" size="lg">Contactanos</UButton>
      </div>
    </div>
  </div>
</template>
