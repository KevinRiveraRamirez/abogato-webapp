<script setup lang="ts">
definePageMeta({ layout: 'public' })

const beneficios = [
  {
    icon: 'i-lucide-badge-check',
    title: 'Respaldo profesional',
    description: 'Cada trámite es gestionado con criterio legal y acompañamiento especializado.'
  },
  {
    icon: 'i-lucide-timer-reset',
    title: 'Procesos más claros',
    description: 'Te explicamos requisitos, tiempos y pasos para que sepas exactamente qué sigue.'
  },
  {
    icon: 'i-lucide-eye',
    title: 'Seguimiento transparente',
    description: 'Mantenemos comunicación clara durante todo el proceso.'
  }
]

const servicios = [
  {
    icon: 'i-lucide-home',
    title: 'Traspaso de Inmuebles',
    description: 'Gestión integral del traspaso de propiedades: estudio registral, redacción de escritura, revisión documental y presentación ante el Registro Nacional.',
    tag: 'Notarial'
  },
  {
    icon: 'i-lucide-car',
    title: 'Traspaso de Vehículos',
    description: 'Formalización del cambio de propietario con revisión de gravámenes, validación de información y presentación del trámite ante las autoridades correspondientes.',
    tag: 'Notarial'
  },
  {
    icon: 'i-lucide-heart-handshake',
    title: 'Derecho Familiar',
    description: 'Acompañamiento en matrimonio civil, divorcio por mutuo acuerdo, pensión alimentaria, guarda, crianza y otros procesos de familia.',
    tag: 'Familia'
  },
  {
    icon: 'i-lucide-landmark',
    title: 'Trámites Notariales',
    description: 'Autenticaciones, certificaciones, declaraciones, protocolizaciones, poderes y otros actos notariales realizados con seguridad jurídica.',
    tag: 'Notarial'
  },
  {
    icon: 'i-lucide-scroll-text',
    title: 'Poderes Notariales',
    description: 'Redacción y formalización de poderes generalísimos, generales y especiales según la necesidad del trámite o representación requerida.',
    tag: 'Documentos'
  },
  {
    icon: 'i-lucide-receipt',
    title: 'Asesoría Tributaria',
    description: 'Orientación para personas físicas y jurídicas sobre obligaciones fiscales, cumplimiento tributario y revisión de situaciones específicas.',
    tag: 'Fiscal'
  },
  {
    icon: 'i-lucide-building-2',
    title: 'Derecho Comercial',
    description: 'Constitución de sociedades, elaboración y revisión de contratos, apoyo societario y acompañamiento legal para empresas y emprendimientos.',
    tag: 'Empresas'
  }
]

const proceso = [
  {
    step: '01',
    title: 'Contanos tu necesidad',
    description: 'Explicanos el trámite o situación legal para entender qué tipo de apoyo necesitás.'
  },
  {
    step: '02',
    title: 'Revisamos tu caso',
    description: 'Analizamos requisitos, documentos y alcance del servicio para darte una ruta clara.'
  },
  {
    step: '03',
    title: 'Ejecutamos el trámite',
    description: 'Preparamos, gestionamos y damos seguimiento al proceso correspondiente.'
  },
  {
    step: '04',
    title: 'Te mantenemos informado',
    description: 'Recibís acompañamiento y claridad sobre avances, pendientes y próximos pasos.'
  }
]
</script>

<template>
  <div>
    <UPageHero
      title="Servicios legales para personas y empresas"
      description="Ofrecemos acompañamiento jurídico claro, profesional y confiable en trámites notariales, asuntos familiares, temas societarios y otras gestiones legales en Costa Rica."
      headline="Servicios"
      :ui="{
        container:
          'max-w-6xl mx-auto flex flex-col items-center px-4 py-16 text-center',
        headline:
          'text-primary-600 dark:text-primary-400 mx-auto text-center text-xs font-bold uppercase tracking-[0.2em]',
        title:
          'mx-auto max-w-4xl text-center text-4xl font-bold text-gray-900 dark:text-white md:text-5xl',
        description:
          'mx-auto max-w-3xl text-center text-base text-gray-600 dark:text-gray-300 md:text-lg',
        links: 'flex w-full justify-center',
      }"
    >
      <template #links>
        <div class="flex flex-wrap justify-center gap-3">
          <UButton to="/contact" size="lg" color="primary">
            Solicitar asesoría
          </UButton>
          <UButton to="/recursos" size="lg" variant="soft" color="neutral">
            Ver recursos
          </UButton>
        </div>
      </template>
    </UPageHero>

    <div class="max-w-6xl mx-auto px-4 py-12 space-y-20">
      <!-- BENEFICIOS -->
      <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="(item, i) in beneficios"
          :key="i"
          class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4"
        >
          <div class="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <UIcon :name="item.icon" class="text-primary-600 dark:text-primary-400 text-2xl" />
          </div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ item.title }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {{ item.description }}
          </p>
        </div>
      </section>

      <!-- SERVICIOS -->
      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            Áreas de servicio
          </p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            Soluciones legales según tu necesidad
          </h2>
          <p class="max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
            Atendemos trámites frecuentes y necesidades jurídicas tanto personales como empresariales, con un enfoque claro, ordenado y profesional.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <article
            v-for="(s, i) in servicios"
            :key="i"
            class="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0">
                <UIcon :name="s.icon" class="text-primary-600 dark:text-primary-400 text-2xl" />
              </div>

              <span class="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                {{ s.tag }}
              </span>
            </div>

            <div class="space-y-2">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                {{ s.title }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {{ s.description }}
              </p>
            </div>

            <div class="pt-2">
              <UButton
                to="/contact"
                variant="ghost"
                trailing-icon="i-lucide-arrow-right"
                class="px-0"
              >
                Consultar este servicio
              </UButton>
            </div>
          </article>
        </div>
      </section>

      <!-- PROCESO -->
      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            Cómo trabajamos
          </p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            Un proceso simple y acompañado
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div
            v-for="(item, i) in proceso"
            :key="i"
            class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4"
          >
            <div class="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {{ item.step }}
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ item.title }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {{ item.description }}
            </p>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="rounded-3xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8 md:p-10">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div class="space-y-3">
            <p class="text-sm font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">
              Atención personalizada
            </p>
            <h2 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              ¿No estás seguro de cuál servicio necesitás?
            </h2>
            <p class="text-gray-600 dark:text-gray-300 max-w-2xl">
              Podemos orientarte según tu caso y ayudarte a identificar el trámite, documento o proceso legal más adecuado.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton to="/contact" color="primary" size="lg">
              Contactanos
            </UButton>
            <UButton to="/signup" variant="soft" size="lg">
              Crear cuenta
            </UButton>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>