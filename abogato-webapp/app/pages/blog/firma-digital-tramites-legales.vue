<script setup lang="ts">
definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Firma digital en trámites legales: cuándo sí y cuándo no | Abogato',
  description:
    'Guía práctica para entender cómo funciona la firma digital en Costa Rica, cuándo tiene valor equivalente a la firma manuscrita y por qué no todos los trámites legales se resuelven igual.'
})

const article = {
  category: 'Documentos',
  secondaryCategory: 'Costa Rica',
  publishedAt: '05 marzo 2026',
  readingTime: '6 min',
  title: 'Firma digital en trámites legales en Costa Rica: cuándo sí funciona y cuándo no basta por sí sola',
  subheading:
    'Entendé qué reconoce la ley costarricense sobre firma digital, qué significa que una firma sea certificada y por qué ese valor legal no elimina los requisitos propios de cada trámite.',
  image: '/img/blog/firma-digital.jpg',
  imageAlt: 'Firma digital en trámites legales en Costa Rica',
  inlineImage: '/img/blog/firma-digital-detalle.jpg',
  inlineImageAlt: 'Persona revisando un documento digital firmado electrónicamente',
  author: {
    name: 'Laura Méndez',
    role: 'Equipo legal de Abogato',
    avatar: '/img/authors/laura-mendez.jpg',
    bio: 'Especialista en contenidos legales orientados a explicar trámites, documentos y herramientas digitales con un lenguaje claro, útil y comprensible.'
  }
}

const relatedPosts = [
  {
    title: 'Cómo constituir una sociedad anónima en Costa Rica',
    description: 'Una guía práctica para entender qué preparar desde el inicio y cómo avanzar con más claridad.',
    to: '/blog/constituir-sociedad-anonima',
    image: '/img/blog/sociedad-anonima.jpg',
    category: 'Empresas',
    author: 'Laura Méndez',
    date: '18 marzo 2026'
  },
  {
    title: '¿Cuánto cuesta un traspaso de vehículo en Costa Rica?',
    description: 'Conocé qué rubros suelen intervenir y por qué conviene pedir un desglose claro.',
    to: '/blog/costo-traspaso-vehiculo',
    image: '/img/blog/traspaso-vehiculo.jpg',
    category: 'Notarial',
    author: 'Laura Méndez',
    date: '15 marzo 2026'
  },
  {
    title: 'Divorcio por mutuo acuerdo en Costa Rica',
    description: 'Qué implica el convenio, qué debe contener y cómo prepararte mejor antes de iniciar.',
    to: '/blog/divorcio-mutuo-acuerdo',
    image: '/img/blog/divorcio-mutuo-acuerdo.jpg',
    category: 'Familia',
    author: 'Laura Méndez',
    date: '10 marzo 2026'
  }
]

const share = {
  whatsapp:
    'https://wa.me/?text=Firma%20digital%20en%20trámites%20legales%20en%20Costa%20Rica%20-%20Abogato',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  x: 'https://twitter.com/intent/tweet?text=Firma%20digital%20en%20trámites%20legales%20en%20Costa%20Rica'
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
                  La firma digital puede simplificar muchos procesos, pero en Costa Rica no conviene pensar en ella como una llave universal que resuelve cualquier trámite legal del mismo modo.
                </p>

                <p>
                  La Ley 8454 define la firma digital como un conjunto de datos asociado a un documento electrónico que permite verificar su integridad e identificar de forma unívoca al autor. Además, señala que una firma digital será certificada cuando se emita al amparo de un certificado digital vigente, expedido por un certificador registrado. Eso es importante porque no toda referencia genérica a “firma electrónica” equivale automáticamente a una firma digital certificada con los efectos jurídicos más fuertes. :contentReference[oaicite:1]{index=1}
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
                Comprender la diferencia entre usar una herramienta digital y cumplir con la forma jurídica del trámite evita errores y retrabajos.
              </figcaption>
            </figure>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                La misma ley reconoce que los documentos y las comunicaciones suscritos mediante firma digital tienen el mismo valor y la misma eficacia probatoria que su equivalente firmado en manuscrito. Incluso establece que, cuando una norma jurídica exija firma, se reconocerá tanto la digital como la manuscrita. :contentReference[oaicite:2]{index=2}
              </p>

              <p>
                Ese principio de equivalencia es la base de muchas gestiones electrónicas en Costa Rica. Pero el punto clave es este: que exista equivalencia jurídica de la firma no significa que todos los trámites tengan exactamente las mismas condiciones de admisión, canal, formato o intervención profesional. Esa diferencia es la que suele generar más confusión. :contentReference[oaicite:3]{index=3}
              </p>
            </section>

            <blockquote class="border-l-2 border-primary pl-6 py-2">
              <p class="text-2xl italic leading-10 text-gray-900 dark:text-white">
                “Que una firma digital tenga valor legal no significa que cualquier acto pueda trasladarse al entorno digital sin revisar primero las reglas del trámite.”
              </p>
              <footer class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                — Enfoque práctico para documentos y formalidades
              </footer>
            </blockquote>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Qué sí permite la firma digital
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  En Costa Rica, la firma digital certificada puede respaldar documentos electrónicos, acreditar integridad del contenido y vincular jurídicamente al firmante con el documento. Esa combinación la vuelve especialmente útil en trámites donde el canal electrónico ya está admitido o donde la institución ha definido procedimientos concretos para su uso. :contentReference[oaicite:4]{index=4}
                </p>

                <p>
                  También existen políticas oficiales sobre formatos de documentos electrónicos firmados digitalmente, lo que muestra que el ecosistema jurídico y administrativo costarricense sí ha desarrollado reglas para trabajar con este tipo de documentos dentro de marcos formales. :contentReference[oaicite:5]{index=5}
                </p>
              </div>

              <ul class="mt-6 list-disc pl-6 grid gap-3 text-base leading-8 text-gray-700 dark:text-gray-300">
                <li>Firmar documentos electrónicos con valor equivalente a la firma manuscrita.</li>
                <li>Respaldar integridad del documento y vincularlo jurídicamente con el firmante.</li>
                <li>Usar canales electrónicos cuando el procedimiento oficial los admita.</li>
                <li>Facilitar presentación, validación y trazabilidad en trámites digitalizados.</li>
              </ul>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Cuándo no basta por sí sola
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Hay actos donde el problema no es la validez general de la firma digital, sino las formalidades adicionales del trámite. Por ejemplo, pueden existir requisitos sobre formato oficial, canal específico de presentación, uso de plataforma institucional o incluso intervención de determinados profesionales o autoridades. :contentReference[oaicite:6]{index=6}
                </p>

                <p>
                  El Registro Nacional, por ejemplo, maneja servicios como Ventanilla Digital con condiciones técnicas y operativas específicas para recepción de documentos digitales. Eso demuestra que no basta con “tener un PDF firmado”: también importa si el acto se está gestionando por el medio oficial y con las condiciones que la institución exige. :contentReference[oaicite:7]{index=7}
                </p>
              </div>
            </section>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                En otras palabras, una persona puede tener una firma digital válida y aun así encontrarse con que un trámite concreto requiere pasos adicionales. Eso no contradice el valor de la firma digital; simplemente refleja que la firma es una parte del acto jurídico o administrativo, no necesariamente la totalidad de sus requisitos.
              </p>

              <p>
                La recomendación práctica es no asumir que todos los actos notariales, registrales o administrativos se comportan igual. Primero conviene revisar si el trámite admite canal digital, qué tipo de documento espera la institución y si existe normativa o lineamiento específico para ese proceso. :contentReference[oaicite:8]{index=8}
              </p>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Qué conviene revisar antes de usar firma digital
              </h2>

              <ul class="mt-5 list-disc pl-6 grid gap-3 text-base leading-8 text-gray-700 dark:text-gray-300">
                <li>Si el trámite admite presentación electrónica.</li>
                <li>Si la institución exige firma digital certificada y no otra forma de firma electrónica.</li>
                <li>Si existe un formato oficial o una política específica para ese tipo de documento.</li>
                <li>Si el documento debe presentarse por una plataforma institucional determinada.</li>
                <li>Si además de la firma existen otras formalidades del acto que deban cumplirse.</li>
              </ul>

              <p class="mt-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                Revisar esos puntos antes de firmar evita uno de los errores más comunes: creer que el obstáculo está en la firma, cuando en realidad está en la forma del procedimiento.
              </p>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Usar herramientas digitales con criterio
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  La firma digital en Costa Rica sí tiene un marco jurídico sólido. Su valor no es simbólico: la ley la reconoce expresamente y el reglamento desarrolla su uso dentro de un entorno confiable y seguro. :contentReference[oaicite:9]{index=9}
                </p>

                <p>
                  Pero precisamente por tener valor real, conviene usarla con criterio. Eso significa entender cuándo el trámite está listo para resolverse digitalmente y cuándo todavía hay elementos formales adicionales que no desaparecen por el simple hecho de firmar electrónicamente.
                </p>

                <p>
                  La mejor práctica no es asumir ni desconfiar automáticamente: es verificar cómo funciona el trámite específico. Ese pequeño paso previo puede ahorrar tiempo, evitar rechazos y mejorar mucho la preparación documental.
                </p>
              </div>
            </section>

            <section class="rounded-3xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8">
              <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Usá herramientas digitales con criterio
              </h3>
              <p class="mt-3 text-base leading-8 text-gray-600 dark:text-gray-300">
                En Abogato podés organizar tu información, comprender mejor los requisitos del trámite y prepararte con más claridad antes de presentar documentos importantes.
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