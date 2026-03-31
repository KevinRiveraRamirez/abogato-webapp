<script setup lang="ts">
definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Traspaso de casa en Costa Rica | Abogato',
  description:
    'Guía práctica sobre cómo prepararte para un traspaso de casa en Costa Rica, qué revisar en el Registro Nacional y qué costos conviene tener presentes.'
})

const article = {
  category: 'Propiedades',
  secondaryCategory: 'Costa Rica',
  publishedAt: '25 marzo 2026',
  readingTime: '7 min',
  title: 'Traspaso de casa en Costa Rica: qué revisar antes de firmar y cómo prepararte mejor',
  subheading:
    'Conocé qué revisar en el Registro Nacional, por qué importa el plano catastrado, qué costos suelen aparecer en el proceso y cómo llegar mejor preparado a la escritura pública.',
  image: '/img/blog/traspaso-casa.jpg',
  imageAlt: 'Firma de documentos para traspaso de una casa en Costa Rica',
  inlineImage: '/img/blog/traspaso-casa-detalle.jpg',
  inlineImageAlt: 'Revisión documental en un trámite inmobiliario',
  author: {
    name: 'Laura Méndez',
    role: 'Equipo legal de Abogato',
    avatar: '/img/authors/laura-mendez.jpg',
    bio: 'Especialista en contenidos legales orientados a explicar trámites de forma clara, útil y cercana para personas que necesitan entender mejor procesos notariales e inmobiliarios.'
  }
}

const relatedPosts = [
  {
    title: '¿Cuánto cuesta un traspaso de vehículo?',
    description: 'Conocé mejor los componentes del costo, impuestos y gastos notariales del proceso.',
    to: '/blog/costo-traspaso-vehiculo',
    image: '/img/blog/traspaso-vehiculo.jpg',
    category: 'Notarial',
    author: 'Lana Steiner',
    date: '15 marzo 2026'
  },
  {
    title: 'Firma digital en trámites legales: cuándo sí y cuándo no',
    description: 'Entendé el alcance y los límites de la firma digital en distintos trámites legales.',
    to: '/blog/firma-digital-tramites-legales',
    image: '/img/blog/firma-digital.jpg',
    category: 'Documentos',
    author: 'Laura Méndez',
    date: '05 marzo 2026'
  },
  {
    title: 'Cómo constituir una sociedad anónima paso a paso',
    description: 'Una guía práctica para formalizar una empresa en Costa Rica con mayor orden.',
    to: '/blog/constituir-sociedad-anonima',
    image: '/img/blog/sociedad-anonima.jpg',
    category: 'Empresas',
    author: 'Phoenix Baker',
    date: '18 marzo 2026'
  }
]

const share = {
  whatsapp:
    'https://wa.me/?text=Traspaso%20de%20casa%20en%20Costa%20Rica%20-%20Abogato',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  x: 'https://twitter.com/intent/tweet?text=Traspaso%20de%20casa%20en%20Costa%20Rica'
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
                  Comprar o vender una casa en Costa Rica implica mucho más que llegar a un acuerdo verbal entre las partes. Un traspaso bien preparado requiere revisar la situación del inmueble, verificar la identidad y capacidad de quienes intervienen y entender cómo se formaliza la operación mediante escritura pública.
                </p>

                <p>
                  En el contexto costarricense, una parte clave del proceso pasa por revisar la información disponible en el Registro Nacional y en el Registro Inmobiliario, donde se consultan datos relacionados con la finca, gravámenes, documentos asociados y otros elementos importantes para confirmar que el bien puede transferirse con mayor claridad.
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
                Revisar la documentación antes de firmar ayuda a reducir errores y atrasos durante el trámite.
              </figcaption>
            </figure>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                Una de las primeras revisiones razonables consiste en confirmar la situación registral del inmueble. Esto permite identificar si la propiedad presenta hipotecas, gravámenes, anotaciones u otras limitaciones que deban entenderse antes de avanzar. También conviene verificar que los datos de la finca y de las personas involucradas estén correctos desde el inicio.
              </p>

              <p>
                En muchos casos, además de la información registral, resulta útil revisar el plano catastrado y la concordancia entre la información gráfica y la información literal del inmueble. Cuando estas piezas están ordenadas y claras, el proceso suele fluir con menos fricción.
              </p>
            </section>

            <blockquote class="border-l-2 border-primary pl-6 py-2">
              <p class="text-2xl italic leading-10 text-gray-900 dark:text-white">
                “Prepararse bien antes de firmar no solo reduce errores: también ayuda a entender mejor lo que realmente se está comprando o vendiendo.”
              </p>
              <footer class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                — Enfoque práctico para trámites inmobiliarios
              </footer>
            </blockquote>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Qué conviene revisar antes de firmar
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Antes de firmar un traspaso, conviene revisar con calma varios puntos básicos. El objetivo no es reemplazar la asesoría profesional, sino llegar mejor preparado y con menos dudas a la etapa de formalización.
                </p>
              </div>

              <ul class="mt-6 list-disc pl-6 grid gap-3 text-base leading-8 text-gray-700 dark:text-gray-300">
                <li>Que el número de finca y los datos registrales del inmueble sean correctos.</li>
                <li>Que no existan gravámenes o anotaciones que las partes desconozcan.</li>
                <li>Que la información del inmueble coincida razonablemente con el plano catastrado cuando corresponda.</li>
                <li>Que comprador y vendedor estén correctamente identificados.</li>
                <li>Que la documentación relevante esté ordenada, legible y disponible antes de la escritura.</li>
              </ul>
            </section>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                En Costa Rica también puede ser útil apoyarse en certificaciones e informes digitales cuando se necesita verificar información del inmueble o preparar mejor el expediente documental. Ese tipo de respaldo ayuda a tomar decisiones con más contexto y a detectar inconsistencias a tiempo.
              </p>

              <p>
                Además, conviene entender que el trámite no termina simplemente al firmar. Después de la escritura, el documento debe seguir su curso para la presentación e inscripción correspondiente. Por eso, la etapa previa de revisión tiene tanto valor: un error pequeño antes de firmar puede transformarse en una demora mayor después.
              </p>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Costos que muchas personas no anticipan
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Cuando se piensa en un traspaso de casa, muchas personas se enfocan solo en el acuerdo de compraventa o en los honorarios profesionales. Sin embargo, el proceso también puede incluir impuesto de traspaso y aranceles registrales, por lo que conviene solicitar un desglose claro antes de firmar.
                </p>

                <p>
                  Tener claridad sobre estos costos ayuda a presupuestar mejor, evita sorpresas al final del proceso y permite que ambas partes entiendan con mayor transparencia qué conceptos forman parte del trámite.
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                La importancia de prepararte antes del trámite
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Un traspaso de casa no debería sentirse como una carrera de último minuto. Mientras más ordenada esté la información antes de llegar a la escritura, más simple resulta entender el proceso, responder dudas y reducir retrabajos.
                </p>

                <p>
                  En la práctica, prepararte bien significa reunir documentos con tiempo, revisar información básica del inmueble, entender qué costos pueden intervenir y saber qué aspectos vale la pena consultar antes de comprometerte con la firma.
                </p>

                <p>
                  Esa preparación previa no solo mejora la experiencia del trámite: también te da mayor seguridad al tomar decisiones sobre un bien tan importante como una propiedad.
                </p>
              </div>
            </section>

            <section class="rounded-3xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8">
              <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                ¿Estás por iniciar un traspaso?
              </h3>
              <p class="mt-3 text-base leading-8 text-gray-600 dark:text-gray-300">
                En Abogato podés ordenar tu información, entender mejor los pasos del proceso y prepararte con más claridad antes de avanzar en tu trámite.
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