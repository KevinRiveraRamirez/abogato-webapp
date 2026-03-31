<script setup lang="ts">
definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Divorcio por mutuo acuerdo: tiempos y consideraciones | Abogato',
  description:
    'Guía práctica para entender qué implica el divorcio por mutuo acuerdo en Costa Rica, qué debe contener el convenio y cómo prepararte mejor antes de iniciar el proceso.'
})

const article = {
  category: 'Familia',
  secondaryCategory: 'Costa Rica',
  publishedAt: '10 marzo 2026',
  readingTime: '6 min',
  title: 'Divorcio por mutuo acuerdo en Costa Rica: qué implica, qué revisar y cómo prepararte mejor',
  subheading:
    'Entendé qué significa realmente el mutuo acuerdo, qué debe quedar definido en el convenio, por qué sigue existiendo homologación judicial y cómo ordenar mejor la información antes de iniciar el proceso.',
  image: '/img/blog/divorcio-mutuo-acuerdo.jpg',
  imageAlt: 'Divorcio por mutuo acuerdo en Costa Rica',
  inlineImage: '/img/blog/divorcio-mutuo-acuerdo-detalle.jpg',
  inlineImageAlt: 'Revisión de acuerdo y documentos familiares',
  author: {
    name: 'Laura Méndez',
    role: 'Equipo legal de Abogato',
    avatar: '/img/authors/laura-mendez.jpg',
    bio: 'Especialista en contenidos legales orientados a explicar procesos de familia de forma clara, práctica y comprensible para usuarios que buscan tomar decisiones con más seguridad.'
  }
}

const relatedPosts = [
  {
    title: 'Requisitos para el matrimonio civil ante notario',
    description: 'Una guía práctica para entender qué información conviene preparar antes del trámite.',
    to: '/blog/requisitos-matrimonio-civil',
    image: '/img/blog/matrimonio-civil.jpg',
    category: 'Familia',
    author: 'Laura Méndez',
    date: '20 marzo 2026'
  },
  {
    title: 'Firma digital en trámites legales: cuándo sí y cuándo no',
    description: 'Entendé mejor el alcance y los límites de la firma digital en distintos trámites.',
    to: '/blog/firma-digital-tramites-legales',
    image: '/img/blog/firma-digital.jpg',
    category: 'Documentos',
    author: 'Laura Méndez',
    date: '05 marzo 2026'
  },
  {
    title: 'Cómo constituir una sociedad anónima en Costa Rica',
    description: 'Una guía clara para preparar mejor la formalización de una sociedad desde el inicio.',
    to: '/blog/constituir-sociedad-anonima',
    image: '/img/blog/sociedad-anonima.jpg',
    category: 'Empresas',
    author: 'Laura Méndez',
    date: '18 marzo 2026'
  }
]

const share = {
  whatsapp:
    'https://wa.me/?text=Divorcio%20por%20mutuo%20acuerdo%20en%20Costa%20Rica%20-%20Abogato',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  x: 'https://twitter.com/intent/tweet?text=Divorcio%20por%20mutuo%20acuerdo%20en%20Costa%20Rica'
}

async function copyLink() {
  if (!import.meta.client) return
  await navigator.clipboard.writeText(window.location.href)
}
</script>

<template>
  <div class="min-h-screen bg-[#f7f6f3] dark:bg-gray-950">
    <section>
      <div class="mx-auto max-w-6xl px-4 pt-10 pb-14 sm:px-6 lg:px-8">
        <NuxtLink
          to="/recursos"
          class="inline-flex items-center text-sm font-medium text-primary transition hover:underline"
        >
          ← Volver al blog
        </NuxtLink>

        <div class="mt-10 grid gap-8">
          <div class="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div class="flex flex-wrap items-center gap-3">
              <span>{{ article.publishedAt }}</span>
              <span>—</span>
              <span>{{ article.readingTime }}</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                {{ article.category }}
              </span>
              <span class="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                {{ article.secondaryCategory }}
              </span>
            </div>
          </div>

          <div class="max-w-4xl">
            <h1 class="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl leading-tight">
              {{ article.title }}
            </h1>

            <p class="mt-5 max-w-3xl text-lg leading-8 text-gray-600 dark:text-gray-300">
              {{ article.subheading }}
            </p>
          </div>

          <img
            :src="article.image"
            :alt="article.imageAlt"
            class="mt-2 w-full rounded-none object-cover max-h-[520px] sm:rounded-2xl"
          >
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,720px)_240px] lg:justify-between">
        <article class="min-w-0">
          <div class="mx-auto max-w-2xl space-y-10">
            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Introducción
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  El divorcio por mutuo acuerdo puede ser una vía más ordenada cuando ambas partes tienen disposición real de resolver el proceso de manera consensuada. Sin embargo, “estar de acuerdo en divorciarse” no siempre significa que ya todo esté claro: también deben definirse los efectos prácticos del proceso.
                </p>

                <p>
                  En Costa Rica, este tipo de divorcio se presenta mediante un convenio otorgado en escritura pública. Ese convenio no es un simple documento informal, sino una pieza central del trámite, porque ahí deben quedar reflejados los acuerdos relevantes entre las partes. Después, ese convenio debe ser presentado al juzgado para su aprobación. :contentReference[oaicite:1]{index=1}
                </p>
              </div>
            </section>

            <figure class="space-y-3">
              <img
                :src="article.inlineImage"
                :alt="article.inlineImageAlt"
                class="w-full rounded-2xl object-cover"
              >
              <figcaption class="text-xs text-gray-500 dark:text-gray-400">
                Cuando las condiciones del convenio están claras desde el inicio, el proceso suele ser más ordenado y comprensible para ambas partes.
              </figcaption>
            </figure>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                La normativa costarricense indica que, en divorcio por mutuo consentimiento, el convenio debe referirse a temas como la guarda, crianza y educación de los hijos menores, la obligación alimentaria respecto de ellos, la pensión entre cónyuges si existe acuerdo en ese sentido y la propiedad sobre los bienes. :contentReference[oaicite:2]{index=2}
              </p>

              <p>
                Eso significa que la preparación previa es muy importante. Mientras más definidos estén estos puntos antes de redactar el convenio, menos espacio habrá para confusión, cambios de última hora o retrasos derivados de información incompleta.
              </p>
            </section>

            <blockquote class="border-l-2 border-primary pl-6 py-2">
              <p class="text-2xl italic leading-10 text-gray-900 dark:text-white">
                “El mutuo acuerdo no elimina la necesidad de ordenar bien el proceso; más bien exige que las partes sepan con claridad qué están acordando.”
              </p>
              <footer class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                — Enfoque práctico para procesos de familia
              </footer>
            </blockquote>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Qué implica realmente el mutuo acuerdo
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  El mutuo acuerdo implica que ambas personas aceptan terminar el vínculo y además tienen disposición de pactar cómo se resolverán ciertos efectos del divorcio. No basta con una voluntad genérica de separarse: debe existir un nivel suficiente de claridad sobre los puntos que se incluirán en el convenio.
                </p>

                <p>
                  Desde la práctica judicial costarricense también se ha reiterado que, aun cuando exista acuerdo mutuo, el convenio debe ser homologado por la autoridad judicial. En otras palabras, no desaparece la intervención del juzgado solo porque ambas partes estén de acuerdo. :contentReference[oaicite:3]{index=3}
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Qué debe quedar revisado antes de iniciar
              </h2>

              <ul class="mt-5 list-disc pl-6 grid gap-3 text-base leading-8 text-gray-700 dark:text-gray-300">
                <li>Si existe acuerdo real sobre terminar el vínculo y sobre los efectos básicos del divorcio.</li>
                <li>Cómo se regulará la guarda, crianza y educación de hijos menores, si existen.</li>
                <li>Cómo quedará planteada la obligación alimentaria respecto de hijos.</li>
                <li>Si habrá acuerdo sobre pensión entre cónyuges.</li>
                <li>Cómo se reflejará la situación de los bienes dentro del convenio.</li>
                <li>Si la información necesaria ya está suficientemente clara para ser llevada a escritura pública.</li>
              </ul>

              <p class="mt-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                Estos elementos no deberían improvisarse al final. Mientras más maduros estén los acuerdos, más sencillo será convertirlos en un convenio entendible y presentable.
              </p>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Tiempos del proceso: por qué pueden variar
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Los tiempos no dependen solo del despacho judicial. También influyen el nivel de acuerdo entre las partes, la claridad del convenio, la existencia o no de bienes, la presencia de hijos menores y la calidad de la información aportada desde el inicio.
                </p>

                <p>
                  En términos simples, cuando el convenio llega mejor estructurado y las condiciones están claras, el proceso suele ser más fluido. Cuando hay vacíos, contradicciones o acuerdos poco precisos, el trámite puede complicarse o requerir ajustes.
                </p>
              </div>
            </section>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                También vale la pena tener presente que el marco procesal de familia en Costa Rica amplió condiciones del divorcio por mutuo consentimiento y fija reglas procesales específicas para su presentación y aprobación. Eso refuerza la idea de que no es un trámite “automático”, sino un procedimiento que debe cumplir forma y contenido. :contentReference[oaicite:4]{index=4}
              </p>

              <p>
                Si existen bienes inscritos cuya situación deba reflejarse como consecuencia del divorcio, el Registro Nacional también contempla reglas específicas para la presentación de ejecutorias de divorcio cuando haya afectación sobre bienes inscritos. :contentReference[oaicite:5]{index=5}
              </p>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Ordenar la información antes de iniciar sí hace diferencia
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  En la práctica, uno de los mayores aportes del mutuo acuerdo es que permite reducir conflicto. Pero eso solo ocurre cuando ambas partes llegan al proceso con suficiente claridad sobre lo que están aceptando y con disposición real de sostener esos acuerdos.
                </p>

                <p>
                  Ordenar la información antes de iniciar ayuda a convertir una intención general en un convenio concreto. Y eso, en un proceso de familia, puede marcar una diferencia importante en términos de tiempo, comprensión y carga emocional.
                </p>
              </div>
            </section>

            <section class="rounded-3xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8">
              <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Ordená la información antes de iniciar
              </h3>
              <p class="mt-3 text-base leading-8 text-gray-600 dark:text-gray-300">
                En Abogato podés organizar tus documentos, visualizar mejor los puntos del trámite y prepararte con más claridad antes de avanzar en el proceso.
              </p>

              <div class="mt-6 flex flex-wrap gap-3">
                <UButton to="/signup" size="lg">Crear cuenta</UButton>
                <UButton to="/contact" variant="soft" size="lg">Contactanos</UButton>
              </div>
            </section>

            <section class="border-t border-gray-200 dark:border-gray-800 pt-8">
              <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-4">
                  <img
                    :src="article.author.avatar"
                    :alt="article.author.name"
                    class="h-12 w-12 rounded-full object-cover"
                  >
                  <div>
                    <p class="font-semibold text-gray-900 dark:text-white">
                      {{ article.author.name }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ article.author.role }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <UButton :to="share.whatsapp" target="_blank" variant="ghost" icon="i-lucide-message-circle" />
                  <UButton :to="share.facebook" target="_blank" variant="ghost" icon="i-lucide-facebook" />
                  <UButton :to="share.x" target="_blank" variant="ghost" icon="i-lucide-send" />
                  <UButton variant="ghost" icon="i-lucide-link" @click="copyLink" />
                </div>
              </div>

              <p class="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                {{ article.author.bio }}
              </p>
            </section>
          </div>
        </article>

        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-4">
            <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                Publicado
              </p>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ article.publishedAt }}
              </p>
            </div>

            <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">
                Compartir
              </p>
              <div class="mt-3 grid gap-2">
                <UButton :to="share.whatsapp" target="_blank" variant="soft" block>WhatsApp</UButton>
                <UButton :to="share.facebook" target="_blank" variant="soft" block>Facebook</UButton>
                <UButton :to="share.x" target="_blank" variant="soft" block>X</UButton>
                <UButton variant="outline" block @click="copyLink">Copiar enlace</UButton>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section class="bg-[#ecebf1] dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-800">
      <div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 class="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Últimos artículos
            </h3>
            <p class="mt-2 text-base text-gray-600 dark:text-gray-300">
              Más recursos para entender trámites, documentos y procesos legales en Costa Rica.
            </p>
          </div>

          <UButton to="/recursos" size="lg" class="self-start sm:self-auto">
            Ver todos los artículos
          </UButton>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="post in relatedPosts"
            :key="post.to"
            class="space-y-4"
          >
            <img
              :src="post.image"
              :alt="post.title"
              class="h-56 w-full rounded-2xl object-cover"
            >

            <div class="space-y-3">
              <p class="text-xs font-medium text-primary">
                {{ post.category }}
              </p>

              <div class="flex items-start justify-between gap-3">
                <h4 class="text-2xl leading-tight text-gray-900 dark:text-white">
                  {{ post.title }}
                </h4>
                <UIcon name="i-lucide-arrow-up-right" class="mt-1 shrink-0 text-gray-700 dark:text-gray-300" />
              </div>

              <p class="text-sm leading-7 text-gray-600 dark:text-gray-300">
                {{ post.description }}
              </p>

              <div class="flex items-center gap-3 pt-2">
                <div class="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700" />
                <div class="text-sm">
                  <p class="font-medium text-gray-900 dark:text-white">{{ post.author }}</p>
                  <p class="text-gray-500 dark:text-gray-400">{{ post.date }}</p>
                </div>
              </div>

              <div class="pt-1">
                <UButton :to="post.to" variant="ghost" trailing-icon="i-lucide-arrow-right" class="px-0">
                  Leer artículo
                </UButton>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>