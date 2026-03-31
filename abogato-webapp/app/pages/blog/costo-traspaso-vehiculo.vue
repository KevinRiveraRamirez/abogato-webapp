<script setup lang="ts">
definePageMeta({ layout: 'public' })

useSeoMeta({
  title: '¿Cuánto cuesta un traspaso de vehículo? | Abogato',
  description:
    'Guía práctica para entender qué influye en el costo de un traspaso de vehículo en Costa Rica, qué rubros suelen aparecer y cómo prepararte mejor antes de firmar.'
})

const article = {
  category: 'Notarial',
  secondaryCategory: 'Costa Rica',
  publishedAt: '15 marzo 2026',
  readingTime: '6 min',
  title: '¿Cuánto cuesta un traspaso de vehículo en Costa Rica? Qué rubros revisar antes de firmar',
  subheading:
    'Entendé por qué el costo de un traspaso no se reduce a un solo monto, qué cargos suelen intervenir en Costa Rica y por qué pedir un desglose claro puede evitar confusiones.',
  image: '/img/blog/traspaso-vehiculo.jpg',
  imageAlt: 'Costo de traspaso de vehículo en Costa Rica',
  inlineImage: '/img/blog/traspaso-vehiculo-detalle.jpg',
  inlineImageAlt: 'Revisión documental para traspaso de vehículo',
  author: {
    name: 'Laura Méndez',
    role: 'Equipo legal de Abogato',
    avatar: '/img/authors/laura-mendez.jpg',
    bio: 'Especialista en contenidos legales enfocados en explicar trámites notariales y registrales con un lenguaje claro, útil y accesible.'
  }
}

const relatedPosts = [
  {
    title: 'Traspaso de casa en Costa Rica: qué revisar antes de firmar',
    description: 'Conocé qué revisar en el Registro Nacional, costos y preparación previa para un traspaso inmobiliario.',
    to: '/blog/traspaso-casa',
    image: '/img/blog/traspaso-casa.jpg',
    category: 'Propiedades',
    author: 'Laura Méndez',
    date: '25 marzo 2026'
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
    description: 'Una guía práctica para preparar mejor la formalización de una sociedad desde el inicio.',
    to: '/blog/constituir-sociedad-anonima',
    image: '/img/blog/sociedad-anonima.jpg',
    category: 'Empresas',
    author: 'Laura Méndez',
    date: '18 marzo 2026'
  }
]

const share = {
  whatsapp:
    'https://wa.me/?text=Cuánto%20cuesta%20un%20traspaso%20de%20vehículo%20en%20Costa%20Rica%20-%20Abogato',
  facebook: 'https://www.facebook.com/sharer/sharer.php',
  x: 'https://twitter.com/intent/tweet?text=Cuánto%20cuesta%20un%20traspaso%20de%20vehículo%20en%20Costa%20Rica'
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
                  Cuando una persona pregunta cuánto cuesta un traspaso de vehículo, normalmente espera una cifra única. Pero en Costa Rica el costo real suele componerse de varios rubros, y entenderlos bien desde el inicio ayuda a tomar decisiones con más claridad.
                </p>

                <p>
                  El trámite no se reduce a “pagarle a alguien para hacer el traspaso”. En el contexto costarricense intervienen elementos registrales, tributarios y documentales que pueden hacer variar el monto final según el caso, el valor del vehículo y la situación concreta del bien. El Registro de Bienes Muebles del Registro Nacional es una de las referencias centrales en este tipo de operaciones. :contentReference[oaicite:1]{index=1}
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
                Entender el costo por rubros ayuda a evitar confusiones y a presupuestar el trámite con más seguridad.
              </figcaption>
            </figure>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                En Costa Rica existe un impuesto sobre la transferencia de vehículos automotores usados, y además el Registro Nacional publica aranceles y timbres aplicables a movimientos de bienes muebles. Por eso, cuando alguien habla del “costo del traspaso”, en realidad puede estar mezclando conceptos distintos dentro de una misma conversación. :contentReference[oaicite:2]{index=2}
              </p>

              <p>
                Una guía reciente del Registro de Bienes Muebles indica para vehículos un impuesto de traspaso del 2.5% de la base imponible, junto con otros cargos registrales y timbres. Esa sola referencia ya deja claro que el monto final no depende únicamente de honorarios, sino también de cómo se calcula la base del trámite y de qué rubros corresponda aplicar en el caso concreto. :contentReference[oaicite:3]{index=3}
              </p>
            </section>

            <blockquote class="border-l-2 border-primary pl-6 py-2">
              <p class="text-2xl italic leading-10 text-gray-900 dark:text-white">
                “El mejor presupuesto para un traspaso no es el más rápido: es el que te explica claramente qué estás pagando y por qué.”
              </p>
              <footer class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                — Enfoque práctico para trámites vehiculares
              </footer>
            </blockquote>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                No todo el costo es honorario profesional
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  Uno de los errores más comunes es asumir que el monto total del traspaso corresponde únicamente al trabajo profesional de preparación y formalización. En realidad, el total puede incluir impuesto de transferencia, derechos registrales, timbres y otros cargos asociados al movimiento del bien. :contentReference[oaicite:4]{index=4}
                </p>

                <p>
                  Por eso, cuando te den un monto, conviene preguntar cómo está compuesto. Un desglose claro ayuda a diferenciar qué corresponde a tributos, qué corresponde a inscripción o aranceles y qué parte pertenece a la gestión profesional del trámite.
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                El valor del vehículo sí influye
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  En Costa Rica, la guía de calificación del Registro de Bienes Muebles habla de una base imponible para el impuesto de traspaso de vehículos, lo que confirma que el valor del bien influye en el cálculo del trámite. Esto significa que no todos los traspasos cuestan lo mismo, incluso si el tipo de gestión parece similar. :contentReference[oaicite:5]{index=5}
                </p>

                <p>
                  Desde el punto de vista práctico, esto obliga a evitar presupuestos “genéricos” sin contexto. Un vehículo con un valor mayor o con condiciones particulares puede generar un resultado distinto al de otro caso aparentemente parecido.
                </p>
              </div>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Qué conviene revisar antes de aceptar un monto
              </h2>

              <ul class="mt-5 list-disc pl-6 grid gap-3 text-base leading-8 text-gray-700 dark:text-gray-300">
                <li>Si el monto incluye impuesto de transferencia o si se está cobrando por separado.</li>
                <li>Qué parte corresponde a aranceles y timbres del Registro Nacional.</li>
                <li>Cuál es la base usada para calcular el costo del trámite.</li>
                <li>Si existen cargos adicionales por condiciones particulares del vehículo o del documento.</li>
                <li>Si el presupuesto distingue claramente entre costos registrales y gestión profesional.</li>
              </ul>
            </section>

            <section class="space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
              <p>
                El propio Registro Nacional publica información de aranceles para bienes muebles y además mantiene materiales técnicos sobre movimientos comunes y costos aplicables. Tener presente esa referencia ayuda a que el usuario comprenda que el precio final no nace de una sola fuente, sino de una combinación de rubros que deben poder explicarse con claridad. :contentReference[oaicite:6]{index=6}
              </p>

              <p>
                También es útil recordar que el sistema tributario costarricense contempla formularios y procedimientos específicos para la autoliquidación del impuesto de transferencia de vehículos automotores usados. Esto refuerza la idea de que el componente tributario forma parte real del trámite y no es un detalle secundario. :contentReference[oaicite:7]{index=7}
              </p>
            </section>

            <section>
              <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Pedí un desglose y evitá sorpresas
              </h2>

              <div class="mt-5 space-y-5 text-base leading-8 text-gray-700 dark:text-gray-300">
                <p>
                  La mejor práctica antes de firmar es pedir un desglose claro. Eso no solo te permite entender el costo, sino comparar presupuestos con mayor criterio. Dos montos parecidos pueden estar construidos de forma muy distinta, y esa diferencia importa.
                </p>

                <p>
                  Cuando el usuario sabe exactamente qué rubros integran el total, puede tomar decisiones con más seguridad, prepararse mejor para el pago y reducir el riesgo de malentendidos durante el proceso.
                </p>
              </div>
            </section>

            <section class="rounded-3xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-8">
              <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Prepará mejor el presupuesto del trámite
              </h3>
              <p class="mt-3 text-base leading-8 text-gray-600 dark:text-gray-300">
                En Abogato podés organizar tu información, entender mejor qué revisar antes de firmar y llegar con más claridad a tu trámite.
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