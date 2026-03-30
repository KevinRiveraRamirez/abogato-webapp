<script setup lang="ts">
definePageMeta({ layout: 'public' })

const personalidad = {
  headline: 'Nuestra esencia',
  title: 'Una firma cercana, clara y profesional',
  description:
    'Creemos que el derecho debe sentirse accesible, humano y confiable. Nuestro tono combina profesionalismo con cercanía, para que cada persona entienda su trámite, se sienta acompañada y tenga claridad en cada paso.'
}

const valores = [
  {
    icon: 'i-lucide-shield-check',
    title: 'Integridad',
    description: 'Actuamos con honestidad, ética y responsabilidad en cada caso.'
  },
  {
    icon: 'i-lucide-zap',
    title: 'Eficiencia',
    description: 'Optimizamos tiempos y procesos sin comprometer la calidad jurídica.'
  },
  {
    icon: 'i-lucide-users',
    title: 'Acompañamiento',
    description: 'Guiamos a cada cliente con atención clara, cercana y personalizada.'
  },
  {
    icon: 'i-lucide-eye',
    title: 'Transparencia',
    description: 'Mantenemos comunicación abierta y seguimiento visible durante todo el proceso.'
  }
]

const cultura = [
  {
    title: 'Atención humana',
    description: 'Escuchamos primero, proponemos después. Cada caso merece contexto y cuidado.',
    icon: 'i-lucide-heart-handshake'
  },
  {
    title: 'Trabajo colaborativo',
    description: 'Nuestros equipos legales y operativos trabajan conectados para dar mejores respuestas.',
    icon: 'i-lucide-briefcase-business'
  },
  {
    title: 'Innovación útil',
    description: 'Usamos tecnología para simplificar trámites, no para complicar la experiencia.',
    icon: 'i-lucide-sparkles'
  }
]

const areas = [
  {
    nombre: 'Dirección y estrategia',
    descripcion: 'Liderazgo del despacho, visión de servicio y supervisión legal.',
    miembros: [
      {
        nombre: 'Licda. Ana Rodríguez',
        cargo: 'Socia Fundadora · Derecho Civil',
        iniciales: 'AR'
      }
    ]
  },
  {
    nombre: 'Área legal',
    descripcion: 'Especialistas que acompañan, validan y ejecutan cada trámite.',
    miembros: [
      {
        nombre: 'Lic. Carlos Mora',
        cargo: 'Derecho Comercial y Societario',
        iniciales: 'CM'
      },
      {
        nombre: 'Licda. Sofía Jiménez',
        cargo: 'Derecho Familiar y Notariado',
        iniciales: 'SJ'
      }
    ]
  },
  {
    nombre: 'Operaciones y experiencia',
    descripcion: 'Seguimiento, coordinación y acompañamiento al cliente durante el proceso.',
    miembros: [
      {
        nombre: 'Equipo de atención',
        cargo: 'Seguimiento y soporte al cliente',
        iniciales: 'EA'
      }
    ]
  }
]

const recursosVisuales = [
  {
    title: 'Nuestro equipo',
    description: 'Puedes usar fotografías del equipo o retratos profesionales con una estética consistente.',
    image: '/img/about/team-stock-1.jpg',
    alt: 'Equipo de trabajo en reunión'
  },
  {
    title: 'Espacios y cultura',
    description: 'Muestra oficina, salas de atención o escenas que transmitan orden, confianza y colaboración.',
    image: '/img/about/office-stock-1.jpg',
    alt: 'Oficina legal moderna'
  },
  {
    title: 'Forma de trabajar',
    description: 'También puedes combinar ilustraciones, mockups o escenas de atención digital.',
    image: '/img/about/culture-stock-1.jpg',
    alt: 'Cultura de trabajo y colaboración'
  }
]

const metricas = [
  { value: '+10', label: 'Años de experiencia combinada' },
  { value: '100%', label: 'Enfoque en claridad y seguimiento' },
  { value: '24/7', label: 'Acceso digital a tu proceso' }
]
</script>

<template>
  <div>
    <UPageHero
      headline="Quiénes somos"
      title="Conoce al equipo detrás de tu experiencia legal"
      description="Somos una firma que combina experiencia jurídica, atención humana y herramientas digitales para hacer los trámites legales más claros, accesibles y confiables."
      :ui="{
        container:
          'max-w-6xl mx-auto flex flex-col items-center px-4 py-16 text-center',
        headline:
          'mx-auto text-center text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400',
        title:
          'mx-auto max-w-4xl text-center text-4xl font-bold text-gray-900 dark:text-white md:text-5xl',
        description:
          'mx-auto max-w-3xl text-center text-base text-gray-600 dark:text-gray-300 md:text-lg',
      }"
    />

    <div class="max-w-6xl mx-auto px-4 py-12 space-y-20">
      <!-- PERSONALIDAD Y MARCA -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div class="space-y-5">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            {{ personalidad.headline }}
          </p>
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {{ personalidad.title }}
          </h2>
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
            {{ personalidad.description }}
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div
              v-for="(m, i) in metricas"
              :key="i"
              class="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900"
            >
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ m.value }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ m.label }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
          <img
            src="/img/about/hero-team-stock.jpg"
            alt="Equipo profesional colaborando"
            class="w-full h-full object-cover min-h-[320px]"
          >
        </div>
      </section>

      <!-- MISION + DIFERENCIAL -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div class="space-y-4">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            Nuestra misión
          </p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            Derecho accesible para personas y empresas
          </h2>
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
            Buscamos que acceder a servicios legales de calidad no sea complejo ni distante.
            Nuestra forma de trabajar une criterio jurídico, acompañamiento profesional y
            herramientas digitales que facilitan el inicio, seguimiento y resolución de trámites.
          </p>
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
            Atendemos a personas físicas y empresas, con un enfoque en claridad, confianza
            y soluciones prácticas adaptadas a cada necesidad.
          </p>
        </div>

        <div class="rounded-3xl bg-primary-50 dark:bg-primary-950 p-8 space-y-5 border border-primary-100 dark:border-primary-900">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl mt-0.5 shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Profesionales especializados y atención personalizada.</p>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl mt-0.5 shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Procesos digitales para una experiencia más simple y ordenada.</p>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl mt-0.5 shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Comunicación clara y seguimiento visible en cada etapa.</p>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl mt-0.5 shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Combinación de experiencia legal y visión moderna del servicio.</p>
          </div>
        </div>
      </section>

      <!-- VALORES -->
      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            Nuestros valores
          </p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            Lo que guía cada decisión
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="(v, i) in valores"
            :key="i"
            class="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-3 bg-white dark:bg-gray-900"
          >
            <div class="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center mx-auto">
              <UIcon :name="v.icon" class="text-primary-600 dark:text-primary-400 text-2xl" />
            </div>
            <h3 class="font-bold text-gray-900 dark:text-white">{{ v.title }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ v.description }}</p>
          </div>
        </div>
      </section>

      <!-- CULTURA -->
      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            Nuestra cultura
          </p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            Cómo trabajamos como equipo
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="(item, i) in cultura"
            :key="i"
            class="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 bg-white dark:bg-gray-900"
          >
            <div class="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <UIcon :name="item.icon" class="text-primary-600 dark:text-primary-400 text-2xl" />
            </div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ item.title }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </section>

      <!-- RECURSOS VISUALES -->
      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            Nuestra identidad visual
          </p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            Imágenes que refuerzan confianza y cercanía
          </h2>
          <p class="max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
            Puedes combinar fotografías reales del equipo con imágenes de stock bien seleccionadas,
            manteniendo una línea visual consistente con la marca.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="(item, i) in recursosVisuales"
            :key="i"
            class="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <img
              :src="item.image"
              :alt="item.alt"
              class="w-full h-56 object-cover"
            >
            <div class="p-5 space-y-2">
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ item.title }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">{{ item.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- EQUIPO AGRUPADO POR ÁREA -->
      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
            Nuestro equipo
          </p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            Personas organizadas por área
          </h2>
          <p class="max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
            En lugar de mostrar solo nombres, organizamos el talento por áreas para facilitar la lectura
            y transmitir mejor cómo se estructura el trabajo dentro de la firma.
          </p>
        </div>

        <div class="space-y-8">
          <div
            v-for="(area, areaIndex) in areas"
            :key="areaIndex"
            class="rounded-3xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 bg-white dark:bg-gray-900"
          >
            <div class="mb-6">
              <h3 class="text-2xl font-bold text-gray-900 dark:text-white">{{ area.nombre }}</h3>
              <p class="text-gray-600 dark:text-gray-300 mt-2">{{ area.descripcion }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                v-for="(persona, i) in area.miembros"
                :key="i"
                class="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-center gap-4"
              >
                <div class="h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-lg shrink-0">
                  {{ persona.iniciales }}
                </div>
                <div>
                  <p class="font-semibold text-gray-900 dark:text-white">{{ persona.nombre }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ persona.cargo }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA VACANTES -->
      <section class="rounded-3xl bg-gray-900 dark:bg-black px-6 py-10 md:px-10 md:py-12 text-white">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div class="space-y-3">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary-300">
              Oportunidades
            </p>
            <h2 class="text-3xl font-bold">
              ¿Te gustaría formar parte del equipo?
            </h2>
            <p class="text-gray-300 max-w-2xl">
              Si conectas con nuestra forma de trabajar, nuestra cultura y nuestra visión del servicio legal,
              conoce las oportunidades disponibles y crece con nosotros.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton
              to="/vacantes"
              size="lg"
              color="primary"
              label="Ver vacantes"
            />
            <UButton
              to="/contacto"
              size="lg"
              variant="outline"
              color="neutral"
              label="Contáctanos"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>