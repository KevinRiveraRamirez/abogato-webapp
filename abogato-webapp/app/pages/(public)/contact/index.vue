<script setup lang="ts">
definePageMeta({ layout: 'public' })

const nombre = ref('')
const email = ref('')
const asunto = ref('')
const mensaje = ref('')
const tipoConsulta = ref('general')
const enviado = ref(false)
const errorMsg = ref('')

const canales = [
  {
    titulo: 'Soporte y seguimiento',
    descripcion: 'Ayuda con trámites, plataforma, documentos o seguimiento de casos.',
    icono: 'i-lucide-life-buoy',
    email: 'soporte@abogato.cr',
    telefono: '+506 2222-0001'
  },
  {
    titulo: 'Ventas y alianzas',
    descripcion: 'Consultas comerciales, demos y oportunidades de colaboración.',
    icono: 'i-lucide-briefcase-business',
    email: 'ventas@abogato.cr',
    telefono: '+506 2222-0002'
  },
  {
    titulo: 'Atención general',
    descripcion: 'Consultas generales sobre nuestros servicios y funcionamiento.',
    icono: 'i-lucide-message-square',
    email: 'contacto@abogato.cr',
    telefono: '+506 2222-0000'
  }
]

function enviar() {
  errorMsg.value = ''
  if (!nombre.value.trim()) { errorMsg.value = 'El nombre es obligatorio.'; return }
  if (!email.value.trim()) { errorMsg.value = 'El correo es obligatorio.'; return }
  if (!mensaje.value.trim()) { errorMsg.value = 'El mensaje es obligatorio.'; return }
  enviado.value = true
}
</script>

<template>
  <div>
    <UPageHero
      title="Hablemos"
      description="En Abogato te acompañamos con una atención clara, profesional y cercana. Elegí el canal que mejor se adapte a tu consulta o completá el formulario y te responderemos a la brevedad."
      headline="Contacto"
    >
      <template #links>
        <UButton to="mailto:contacto@abogato.cr" size="lg" icon="i-lucide-mail">Escribir por correo</UButton>
        <UButton to="tel:+50622220000" color="neutral" variant="soft" size="lg" icon="i-lucide-phone">Llamar ahora</UButton>
      </template>
    </UPageHero>

    <div class="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <div class="rounded-3xl border border-primary-200/60 dark:border-primary-900/60 bg-gradient-to-br from-primary-50 to-white dark:from-primary-950/30 dark:to-gray-950 p-8 md:p-10">
        <div class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div class="space-y-4">
            <div class="inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-primary-800 px-3 py-1 text-sm text-primary-700 dark:text-primary-300 bg-white/70 dark:bg-gray-900/60">
              <UIcon name="i-lucide-scale" class="size-4" />
              <span>Abogato · Trámites fáciles y seguros</span>
            </div>
            <h2 class="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Atención legal digital con una experiencia clara y confiable
            </h2>
            <p class="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-3xl">
              Nuestra comunicación mantiene el tono de la marca: profesional, accesible y enfocada en simplificar procesos legales para cada cliente.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <p class="text-sm text-gray-500 dark:text-gray-400">Correo principal</p>
              <a href="mailto:contacto@abogato.cr" class="mt-2 block font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
                contacto@abogato.cr
              </a>
            </div>
            <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <p class="text-sm text-gray-500 dark:text-gray-400">Teléfono</p>
              <a href="tel:+50622220000" class="mt-2 block font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
                +506 2222-0000
              </a>
            </div>
            <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 sm:col-span-2">
              <p class="text-sm text-gray-500 dark:text-gray-400">Horario de atención</p>
              <p class="mt-2 font-semibold text-gray-900 dark:text-white">Lunes a viernes, 8:00 a.m. – 5:00 p.m.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <div class="space-y-8">
          <section class="space-y-4">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Métodos claros de contacto</h2>
              <p class="text-gray-600 dark:text-gray-300">
                Elegí el canal que más te convenga según el tipo de consulta.
              </p>
            </div>

            <div class="grid gap-4">
              <div
                v-for="canal in canales"
                :key="canal.titulo"
                class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
              >
                <div class="flex items-start gap-4">
                  <div class="rounded-xl bg-primary-50 dark:bg-primary-950/50 p-3">
                    <UIcon :name="canal.icono" class="size-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div class="space-y-2 min-w-0">
                    <h3 class="font-semibold text-gray-900 dark:text-white">{{ canal.titulo }}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300">{{ canal.descripcion }}</p>
                    <div class="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm">
                      <a :href="`mailto:${canal.email}`" class="text-primary-700 dark:text-primary-300 hover:underline">
                        {{ canal.email }}
                      </a>
                      <a :href="`tel:${canal.telefono.replace(/\s|-/g, '')}`" class="text-primary-700 dark:text-primary-300 hover:underline">
                        {{ canal.telefono }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-4">
            <div class="space-y-2">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Redes sociales</h2>
              <p class="text-gray-600 dark:text-gray-300">
                Algunas personas prefieren escribirnos por redes. También podés encontrarnos ahí.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="#" class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                <div class="flex items-center gap-3">
                  <UIcon name="i-simple-icons-instagram" class="size-5 text-gray-900 dark:text-white" />
                  <div>
                    <p class="font-semibold text-gray-900 dark:text-white">Instagram</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Novedades y contenido útil</p>
                  </div>
                </div>
              </a>

              <a href="#" class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                <div class="flex items-center gap-3">
                  <UIcon name="i-simple-icons-facebook" class="size-5 text-gray-900 dark:text-white" />
                  <div>
                    <p class="font-semibold text-gray-900 dark:text-white">Facebook</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Consultas y comunidad</p>
                  </div>
                </div>
              </a>

              <a href="#" class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                <div class="flex items-center gap-3">
                  <UIcon name="i-simple-icons-linkedin" class="size-5 text-gray-900 dark:text-white" />
                  <div>
                    <p class="font-semibold text-gray-900 dark:text-white">LinkedIn</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Alianzas y presencia profesional</p>
                  </div>
                </div>
              </a>
            </div>
          </section>
        </div>

        <div class="space-y-6">
          <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 space-y-5 shadow-sm">
            <div v-if="enviado" class="text-center py-8 space-y-3">
              <UIcon name="i-lucide-circle-check" class="text-primary-600 text-4xl mx-auto" />
              <p class="font-semibold text-gray-900 dark:text-white">¡Mensaje enviado!</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Te responderemos en un plazo de 24–48 horas hábiles.</p>
              <UButton variant="soft" @click="enviado = false">Enviar otro mensaje</UButton>
            </div>

            <template v-else>
              <div class="space-y-2">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Escribinos</h2>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  Completá el formulario y dirigiremos tu mensaje al equipo correcto.
                </p>
              </div>

              <div class="grid gap-1">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre completo</label>
                <UInput v-model="nombre" placeholder="Tu nombre" size="lg" />
              </div>
              <div class="grid gap-1">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Correo electrónico</label>
                <UInput v-model="email" type="email" placeholder="correo@ejemplo.com" size="lg" />
              </div>
              <div class="grid gap-1">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de consulta</label>
                <USelect
                  v-model="tipoConsulta"
                  size="lg"
                  :items="[
                    { label: 'Consulta general', value: 'general' },
                    { label: 'Soporte', value: 'soporte' },
                    { label: 'Ventas', value: 'ventas' }
                  ]"
                />
              </div>
              <div class="grid gap-1">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Asunto (opcional)</label>
                <UInput v-model="asunto" placeholder="¿En qué podemos ayudarte?" size="lg" />
              </div>
              <div class="grid gap-1">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Mensaje</label>
                <UTextarea v-model="mensaje" placeholder="Describí brevemente tu consulta..." :rows="5" size="lg" />
              </div>
              <UAlert v-if="errorMsg" color="warning" variant="soft" :description="errorMsg" />
              <UButton block size="lg" @click="enviar">Enviar mensaje</UButton>
            </template>
          </div>

          <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-6 space-y-3">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-map-pin" class="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p class="font-semibold text-gray-900 dark:text-white">Ubicación fácil de encontrar</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  Esta página debe estar visible desde el encabezado y el pie de página como acceso directo a contacto y soporte.
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">San José, Costa Rica</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
