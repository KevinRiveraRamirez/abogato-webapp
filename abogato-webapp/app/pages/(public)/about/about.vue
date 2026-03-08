<script setup lang="ts">
definePageMeta({ layout: 'public' })

const valores = [
  { icon: 'i-lucide-shield-check', title: 'Integridad', description: 'Actuamos con honestidad y ética en cada caso que manejamos.' },
  { icon: 'i-lucide-zap', title: 'Eficiencia', description: 'Resolvemos tus trámites en el menor tiempo posible sin sacrificar calidad.' },
  { icon: 'i-lucide-users', title: 'Compromiso', description: 'Nuestro equipo está disponible para guiarte en cada etapa del proceso.' },
  { icon: 'i-lucide-eye', title: 'Transparencia', description: 'Seguimiento en tiempo real y comunicación clara en todo momento.' }
]

const equipo = [
  { nombre: 'Licda. Ana Rodríguez', cargo: 'Socia Fundadora · Derecho Civil', iniciales: 'AR' },
  { nombre: 'Lic. Carlos Mora', cargo: 'Derecho Comercial y Societario', iniciales: 'CM' },
  { nombre: 'Licda. Sofía Jiménez', cargo: 'Derecho Familiar y Notariado', iniciales: 'SJ' }
]
</script>

<template>
  <div>
    <UPageHero
      title="Sobre nosotros"
      description="Somos una firma de abogados comprometida con hacer el derecho accesible. Combinamos experiencia jurídica con tecnología para simplificar tus trámites legales."
      headline="Quiénes somos"
    />

    <div class="max-w-6xl mx-auto px-4 py-12 space-y-16">
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div class="space-y-4">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">Nuestra misión</p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Derecho accesible para todos</h2>
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
            Creemos que acceder a servicios legales de calidad no debería ser complicado ni exclusivo.
            Nuestra plataforma permite a cualquier persona iniciar, seguir y resolver sus trámites legales
            desde cualquier lugar, con el respaldo de profesionales especializados.
          </p>
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
            Fundada con más de 10 años de experiencia combinada, nuestra firma atiende tanto a personas
            físicas como a empresas en diversas áreas del derecho costarricense.
          </p>
        </div>
        <div class="rounded-2xl bg-primary-50 dark:bg-primary-950 p-8 space-y-4">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Abogados colegiados y especializados</p>
          </div>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Plataforma digital con seguimiento en tiempo real</p>
          </div>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Documentos con plena validez legal</p>
          </div>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-check-circle" class="text-primary-600 dark:text-primary-400 text-xl shrink-0" />
            <p class="text-gray-700 dark:text-gray-300">Atención personalizada en cada caso</p>
          </div>
        </div>
      </section>

      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">Nuestros valores</p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Lo que nos guía</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="(v, i) in valores"
            :key="i"
            class="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-3"
          >
            <div class="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center mx-auto">
              <UIcon :name="v.icon" class="text-primary-600 dark:text-primary-400 text-2xl" />
            </div>
            <h3 class="font-bold text-gray-900 dark:text-white">{{ v.title }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ v.description }}</p>
          </div>
        </div>
      </section>

      <section class="space-y-8">
        <div class="text-center space-y-2">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">El equipo</p>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Nuestros profesionales</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div
            v-for="(p, i) in equipo"
            :key="i"
            class="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center text-center space-y-3"
          >
            <div class="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xl">
              {{ p.iniciales }}
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">{{ p.nombre }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ p.cargo }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
