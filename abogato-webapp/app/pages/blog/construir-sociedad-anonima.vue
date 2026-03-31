<script setup lang="ts">
definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Cómo constituir una sociedad anónima paso a paso | Abogato',
  description:
    'Guía práctica para entender cómo constituir una sociedad anónima en Costa Rica, qué preparar desde el inicio y qué cambios recientes conviene conocer.'
})

const article = {
  category: 'Empresas',
  secondaryCategory: 'Costa Rica',
  publishedAt: '18 marzo 2026',
  readingTime: '7 min',
  title: 'Cómo constituir una sociedad anónima en Costa Rica: qué preparar desde el inicio y cómo avanzar con más claridad',
  subheading:
    'Entendé qué decisiones conviene tomar antes de constituir una S.A., qué información suele organizarse desde el principio y qué cambios recientes del marco costarricense vale la pena tener presentes.',
  image: '/img/blog/sociedad-anonima.jpg',
  imageAlt: 'Constitución de sociedad anónima en Costa Rica',
  inlineImage: '/img/blog/sociedad-anonima-detalle.jpg',
  inlineImageAlt: 'Equipo revisando documentos de constitución empresarial',
  author: {
    name: 'Laura Méndez',
    role: 'Equipo legal de Abogato',
    avatar: '/img/authors/laura-mendez.jpg',
    bio: 'Especialista en contenidos legales orientados a explicar trámites empresariales y notariales de forma clara, práctica y accesible.'
  }
}

const relatedPosts = [
  {
    title: 'Firma digital en trámites legales: cuándo sí y cuándo no',
    description: 'Conocé cuándo una herramienta digital puede ayudarte y cuándo no basta por sí sola.',
    to: '/blog/firma-digital-tramites-legales',
    image: '/img/blog/firma-digital.jpg',
    category: 'Documentos',
    author: 'Laura Méndez',
    date: '05 marzo 2026'
  },
  {
    title: '¿Cuánto cuesta un traspaso de vehículo?',
    description: 'Una guía simple para entender mejor costos, impuestos y gastos notariales.',
    to: '/blog/costo-traspaso-vehiculo',
    image: '/img/blog/traspaso-vehiculo.jpg',
    category: 'Notarial',
    author: 'Lana Steiner',
    date: '15 marzo 2026'
  },
  {
    title: 'Traspaso de casa en Costa Rica: qué revisar antes de firmar',
    description: 'Preparación previa, revisión registral y puntos clave antes de avanzar con una propiedad.',
    to: '/blog/traspaso-casa',
    image: '/img/blog/traspaso-casa.jpg',
    category: 'Propiedades',
    author: 'Laura Méndez',
    date: '25 marzo 2026'
  }
]

const share = {
  whatsapp:
    'https://wa.me/?text=Cómo%20constituir%20una%20sociedad%20anónima%20en%20Costa%20Rica%20-%20Abogato',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  x: 'https://twitter.com/intent/tweet?text=Cómo%20constituir%20una%20sociedad%20anónima%20en%20Costa%20Rica'
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
                  Constituir una sociedad anónima en Costa Rica permite darle forma jurídica a una actividad empresarial, separar el patrimonio de la sociedad del de sus socios y ordenar mejor la operación del negocio. No se trata solo de “crear una empresa” en abstracto, sino de tomar decisiones iniciales que luego impactan la forma en que la sociedad se administra, representa y documenta.
                </p>

                <p>
                  En la práctica, una buena constitución empieza mucho antes de la firma. Conviene definir con claridad para qué existirá la sociedad, quiénes participarán en ella, cómo se organizará su representación legal y qué información debe quedar lista para avanzar con el trámite de forma ordenada.
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
                Preparar bien la estructura inicial de la sociedad facilita la formalización y reduce errores posteriores.
              </figcaption>
            </figure>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                En Costa Rica, el trámite se relaciona directamente con el Registro de Personas Jurídicas del Registro Nacional, que es el órgano encargado de la registración y publicidad de la constitución, modificación y extinción de sociedades mercantiles y civiles. Además, el ecosistema oficial de trámites incluye la plataforma CrearEmpresa para procesos vinculados a la inscripción. :contentReference[oaicite:2]{index=2}
              </p>

              <p>
                Por eso, aunque desde fuera pueda verse como un solo paso, la constitución de una S.A. realmente combina decisiones societarias, preparación documental y presentación registral.
              </p>
            </section>

            <blockquote class="border-l-2 border-primary pl-6 py-2">
              <p class="text-2xl italic leading-10 text-gray-900 dark:text-white">
                “Una sociedad bien constituida no empieza con el documento: empieza con decisiones claras sobre cómo va a operar.”
              </p>
              <footer class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                — Enfoque práctico para estructura societaria
              </footer>
            </blockquote>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Qué conviene definir antes de constituirla
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Antes de avanzar, conviene tener claridad sobre varios puntos básicos. Esto facilita la redacción del instrumento legal y evita improvisaciones de último momento.
                </p>
              </div>

              <ul class="mt-6 list-disc pl-6 grid gap-3 text-base leading-8 text-gray-700 dark:text-gray-300">
                <li>La actividad o propósito general que tendrá la sociedad.</li>
                <li>Las personas que participarán como socios y la forma general de organización.</li>
                <li>La estructura de representación y administración que se desea usar.</li>
                <li>La información que debe quedar lista para la formalización e inscripción.</li>
              </ul>
            </section>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                Desde una perspectiva práctica, una de las mejores decisiones iniciales es documentar bien la intención de los socios y el modelo de operación. Eso ayuda a que la constitución no sea solo un requisito formal, sino una base real para el funcionamiento del negocio.
              </p>

              <p>
                También conviene entender que no todo termina con la firma: el acto debe seguir el proceso registral correspondiente para que la sociedad quede debidamente incorporada dentro del marco aplicable. :contentReference[oaicite:3]{index=3}
              </p>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Un cambio reciente que sí vale la pena conocer
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Si vas a hablar de constitución de sociedades en Costa Rica hoy, hay un cambio reciente que conviene mencionar: desde 2025, nuevas sociedades anónimas y sociedades de responsabilidad limitada pasan a identificarse legalmente por su número de cédula jurídica asignado por el Registro Nacional, en lugar de una razón o denominación social registrada como antes. :contentReference[oaicite:4]{index=4}
                </p>

                <p>
                  En términos prácticos, eso significa que la identidad pública del negocio y la protección del nombre comercial pasan a ser temas estratégicos distintos de la mera constitución registral. Para muchos emprendedores, esta diferencia es importante porque obliga a pensar no solo en la sociedad como vehículo jurídico, sino también en cómo se protegerá el nombre con el que operará el negocio en el mercado. :contentReference[oaicite:5]{index=5}
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Preparar bien la constitución evita retrabajos
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Muchos problemas no surgen por la figura de la S.A. en sí, sino por decisiones apresuradas: socios que no tienen claro el rol que ocuparán, información incompleta al momento de redactar, estructura de representación poco pensada o confusión entre el vehículo jurídico y la identidad comercial del negocio.
                </p>

                <p>
                  Una constitución bien preparada permite que la sociedad nazca con mayor orden documental y con una base más coherente para sus siguientes etapas: operación, cumplimiento, relaciones entre socios y formalización de actos futuros.
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                La importancia de pensar más allá del trámite
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Constituir una sociedad anónima no debería verse como una casilla más dentro de una lista de pendientes. Es una decisión estructural que influye en cómo se administra el negocio, cómo se documentan sus actuaciones y cómo se proyecta su identidad hacia afuera.
                </p>

                <p>
                  En Costa Rica, esa visión es todavía más importante cuando se combina el plano registral con los cambios recientes sobre identificación legal de nuevas sociedades y con la necesidad de distinguir entre la sociedad como persona jurídica y el nombre con que el negocio se presentará al mercado. :contentReference[oaicite:6]{index=6}
                </p>

                <p>
                  Mientras mejor se prepare esa base desde el inicio, más fácil será crecer con orden y menos probable será tener que corregir problemas que pudieron prevenirse desde la constitución.
                </p>
              </div>
            </section>

            <section class="rounded-3xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8">
              <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Dale estructura legal a tu proyecto
              </h3>
              <p class="mt-3 text-base leading-8 text-gray-600 dark:text-gray-300">
                En Abogato podés organizar tu información, entender mejor el proceso y prepararte con más claridad antes de avanzar con la formalización de tu sociedad.
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