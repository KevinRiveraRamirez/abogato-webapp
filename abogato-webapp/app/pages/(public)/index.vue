<!-- pages/index.vue -->
<template>
  <MarketingHeroSection
    badge="Asesoría legal clara y digital"
    title="Resuelve tus trámites legales con más claridad, menos fricción y respaldo profesional"
    description="Te ayudamos con traspasos, matrimonio civil, documentos notariales y otros procesos legales en Costa Rica, con acompañamiento humano y una experiencia más simple."
    primaryCtaText="Solicitar asesoría"
    primaryCtaHref="/contacto"
    secondaryCtaText="Ver servicios"
    secondaryCtaHref="/servicios"
  />

  <UPageSection class="pt-0">
    <div class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <p class="font-semibold text-gray-900 dark:text-white">Proceso claro</p>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Te explicamos requisitos, pasos y documentos antes de iniciar.
        </p>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <p class="font-semibold text-gray-900 dark:text-white">Respaldo profesional</p>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Cada trámite se gestiona con criterio legal y seguimiento responsable.
        </p>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <p class="font-semibold text-gray-900 dark:text-white">Experiencia más simple</p>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Menos confusión, mejor comunicación y una ruta más ordenada para cada caso.
        </p>
      </div>
    </div>
  </UPageSection>

  <MarketingImageShowcase
    img1="https://images.unsplash.com/photo-1761839258045-6ef373ab82a7?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    img2="https://images.unsplash.com/photo-1772306105241-fc51849ab40d?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8fGhvdG8tcGFnZXx8fGVufDB8fHx8fA%3D%3D"
  />

  <MarketingBenefitsGrid
    title="Por qué elegirnos"
    description="No solo gestionamos trámites. Buscamos que entiendas qué estás haciendo, qué sigue y qué necesitás para avanzar con seguridad."
  />

  <MarketingServiceCardsSection
    title="Servicios legales que resolvemos con frecuencia"
    description="Atendemos necesidades legales comunes para personas y empresas, con un enfoque práctico, profesional y fácil de seguir."
    ctaText="Ver todos los servicios"
    ctaHref="/servicios"
    :cards="cards"
  />

  <UPageSection
    title="Cómo funciona"
    description="Una ruta simple para que sepas qué esperar desde el inicio."
  >
    <div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
      <div class="rounded-2xl border border-gray-200 p-4 sm:p-6 dark:border-gray-800">
        <p class="text-sm font-semibold text-primary">01</p>
        <h3 class="mt-2 font-bold text-gray-900 dark:text-white">Contanos tu caso</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Nos compartís tu necesidad o trámite para entender qué tipo de apoyo requerís.
        </p>
      </div>

      <div class="rounded-2xl border border-gray-200 p-4 sm:p-6 dark:border-gray-800">
        <p class="text-sm font-semibold text-primary">02</p>
        <h3 class="mt-2 font-bold text-gray-900 dark:text-white">Definimos la ruta</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Revisamos requisitos, documentos y alcance para orientarte con claridad.
        </p>
      </div>

      <div class="rounded-2xl border border-gray-200 p-4 sm:p-6 dark:border-gray-800">
        <p class="text-sm font-semibold text-primary">03</p>
        <h3 class="mt-2 font-bold text-gray-900 dark:text-white">Gestionamos el trámite</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Ejecutamos el proceso y te mantenemos informado en cada etapa importante.
        </p>
      </div>
    </div>
  </UPageSection>

  <UPageSection
    title="Preguntas frecuentes"
    description="Algunas dudas comunes sobre nuestros servicios y cómo funciona la plataforma."
  />
  <MarketingFaqAccordion />

  <UPageSection>
    <div
      class="rounded-3xl border border-primary-200 bg-primary-50 p-5 text-center dark:border-primary-800 dark:bg-primary-950 sm:p-8 md:p-10"
    >
      <h2 class="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl dark:text-white">
        ¿Necesitás orientación para empezar?
      </h2>
      <p class="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base dark:text-gray-300">
        Si no tenés claro qué trámite aplica a tu caso, te ayudamos a identificar el camino correcto.
      </p>
      <div
        class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3"
      >
        <UButton
          to="/contacto"
          size="lg"
          class="w-full justify-center sm:w-auto"
        >
          Solicitar asesoría
        </UButton>
        <UButton
          to="/servicios"
          size="lg"
          variant="soft"
          class="w-full justify-center sm:w-auto"
        >
          Explorar servicios
        </UButton>
      </div>
    </div>
  </UPageSection>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'public' })

const cards = [
  {
    title: 'Traspaso de inmueble',
    description:
      'Estudio registral, redacción de escritura y presentación del trámite con respaldo notarial.'
  },
  {
    title: 'Traspaso de vehículo',
    description:
      'Cambio de propietario con validación documental, revisión de gravámenes y gestión formal.'
  },
  {
    title: 'Matrimonio civil',
    description:
      'Acompañamiento legal, revisión de requisitos y formalización del acto notarial.'
  },
  {
    title: 'Poderes y documentos notariales',
    description:
      'Redacción y formalización de poderes, autenticaciones y otros actos notariales frecuentes.'
  },
  {
    title: 'Derecho familiar',
    description:
      'Apoyo en divorcio por mutuo acuerdo, pensión alimentaria y otros procesos familiares.'
  },
  {
    title: 'Asesoría tributaria y comercial',
    description:
      'Orientación para personas y empresas en obligaciones fiscales, contratos y estructura societaria.'
  }
]
</script>