<script setup lang="ts">
definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Requisitos para el matrimonio civil ante notario | Abogato',
  description: 'Qué documentos suelen pedirse, cómo prepararte y qué conviene revisar antes de iniciar un matrimonio civil ante notario.'
})

async function copyLink() {
  if (!import.meta.client) return
  await navigator.clipboard.writeText(window.location.href)
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <section class="border-b border-default/60 bg-default/20">
      <div class="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <NuxtLink to="/recursos" class="inline-flex items-center text-sm font-medium text-primary transition hover:underline">
          ← Volver al blog
        </NuxtLink>

        <div class="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span class="inline-flex rounded-full bg-primary-100 dark:bg-primary-900 px-3 py-1 text-primary-700 dark:text-primary-300 font-medium">Familia</span>
          <span>20 marzo 2026</span>
          <span>•</span>
          <span>5 min</span>
        </div>

        <h1 class="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Requisitos para el matrimonio civil ante notario
        </h1>

        <p class="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Te explicamos qué información conviene preparar, qué documentos suelen solicitarse y qué aspectos revisar antes de coordinar el trámite.
        </p>

        <div class="mt-6 flex items-center gap-4 rounded-2xl border border-default/60 bg-white dark:bg-gray-900 p-4">
          <img src="/img/authors/laura-mendez.jpg" alt="Laura Méndez" class="h-14 w-14 rounded-full object-cover">
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">Laura Méndez</p>
            <p class="text-sm text-muted">Equipo legal de Abogato</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Especialista en contenidos legales enfocados en explicar trámites de familia con claridad y orden.
            </p>
          </div>
        </div>

        <img src="/img/blog/matrimonio-civil.jpg" alt="Matrimonio civil ante notario" class="mt-8 w-full rounded-3xl object-cover max-h-[460px]">
      </div>
    </section>

    <section class="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <section class="rounded-2xl border border-default/60 bg-white dark:bg-gray-900 p-6 md:p-8">
        <p class="text-base leading-8 text-gray-700 dark:text-gray-300">
          El matrimonio civil ante notario puede ser una vía práctica para formalizar la unión, pero requiere preparación previa. Tener listos los documentos y entender el proceso evita contratiempos innecesarios y permite avanzar con mayor claridad.
        </p>
      </section>

      <section class="rounded-2xl border border-default/60 bg-white dark:bg-gray-900 p-6 md:p-8 space-y-4">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Identificación y datos personales</h2>
        <p class="text-base leading-8 text-gray-700 dark:text-gray-300">
          Las personas que desean casarse deben presentar sus datos personales completos y documentos de identidad vigentes. Es importante que la información coincida correctamente con la que se utilizará en el acto formal.
        </p>
      </section>

      <section class="rounded-2xl border border-default/60 bg-white dark:bg-gray-900 p-6 md:p-8 space-y-4">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Documentación previa</h2>
        <p class="text-base leading-8 text-gray-700 dark:text-gray-300">
          Dependiendo del caso, puede requerirse documentación adicional para acreditar estado civil, capacidad legal u otros extremos relevantes. Conviene consultar con anticipación qué documentos específicos serán necesarios según la situación personal de cada parte.
        </p>
        <ul class="list-disc pl-6 grid gap-2 text-base leading-8 text-gray-700 dark:text-gray-300">
          <li>Documento de identidad vigente</li>
          <li>Datos personales correctos y completos</li>
          <li>Documentos complementarios según el caso</li>
          <li>Coordinación previa con el notario</li>
        </ul>
      </section>

      <section class="rounded-2xl border border-default/60 bg-white dark:bg-gray-900 p-6 md:p-8 space-y-4">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Tiempo y planificación</h2>
        <p class="text-base leading-8 text-gray-700 dark:text-gray-300">
          Aunque el proceso puede ser relativamente ágil cuando todo está completo, los tiempos pueden variar según la disponibilidad de documentos y la coordinación previa. Lo más recomendable es no dejar la preparación para último momento.
        </p>
      </section>

      <section class="rounded-2xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8 space-y-4">
        <h3 class="text-2xl font-bold text-gray-900 dark:text-white">Prepará tu trámite con tiempo</h3>
        <p class="text-gray-600 dark:text-gray-300 leading-7">
          Organizá tus documentos y empezá el proceso con mayor seguridad usando una estructura clara de información.
        </p>
        <div class="flex gap-3 flex-wrap">
          <UButton to="/signup" size="lg">Crear cuenta</UButton>
          <UButton to="/contact" variant="soft" size="lg">Contactanos</UButton>
        </div>
      </section>

      <section class="rounded-2xl border border-default/60 bg-white dark:bg-gray-900 p-8 space-y-4">
        <h3 class="text-2xl font-bold text-gray-900 dark:text-white">Recibí nuevas guías legales en tu correo</h3>
        <p class="text-gray-600 dark:text-gray-300 leading-7">
          Suscribite para conocer nuevos artículos y recursos sobre trámites familiares y notariales.
        </p>
        <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
          <UInput placeholder="Tu correo electrónico" size="lg" class="w-full" />
          <UButton size="lg">Suscribirme</UButton>
        </div>
      </section>
    </section>
  </div>
</template>