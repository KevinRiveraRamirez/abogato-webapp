<script setup lang="ts">
definePageMeta({ layout: 'public' })

const nombre = ref('')
const email = ref('')
const asunto = ref('')
const mensaje = ref('')
const enviado = ref(false)
const errorMsg = ref('')

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
      title="Contactanos"
      description="¿Tenés alguna consulta? Completá el formulario y uno de nuestros abogados te responderá a la brevedad."
      headline="Contacto"
    />

    <div class="max-w-6xl mx-auto px-4 py-12">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div class="space-y-8">
          <div class="space-y-2">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Información de contacto</h2>
            <p class="text-gray-600 dark:text-gray-300">También podés comunicarte directamente con nosotros.</p>
          </div>

          <div class="space-y-4">
            <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <UIcon name="i-lucide-map-pin" class="text-primary-600 dark:text-primary-400 shrink-0" />
              <span>San José, Costa Rica</span>
            </div>
            <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <UIcon name="i-lucide-phone" class="text-primary-600 dark:text-primary-400 shrink-0" />
              <span>+506 2222-0000</span>
            </div>
            <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <UIcon name="i-lucide-mail" class="text-primary-600 dark:text-primary-400 shrink-0" />
              <span>contacto@abogato.cr</span>
            </div>
            <div class="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <UIcon name="i-lucide-clock" class="text-primary-600 dark:text-primary-400 shrink-0" />
              <span>Lunes a viernes, 8 am – 5 pm</span>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 space-y-5">
          <div v-if="enviado" class="text-center py-8 space-y-3">
            <UIcon name="i-lucide-circle-check" class="text-primary-600 text-4xl mx-auto" />
            <p class="font-semibold text-gray-900 dark:text-white">¡Mensaje enviado!</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Te responderemos en un plazo de 24–48 horas hábiles.</p>
            <UButton variant="soft" @click="enviado = false">Enviar otro mensaje</UButton>
          </div>

          <template v-else>
            <div class="grid gap-1">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre completo</label>
              <UInput v-model="nombre" placeholder="Tu nombre" size="lg" />
            </div>
            <div class="grid gap-1">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Correo electrónico</label>
              <UInput v-model="email" type="email" placeholder="correo@ejemplo.com" size="lg" />
            </div>
            <div class="grid gap-1">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Asunto (opcional)</label>
              <UInput v-model="asunto" placeholder="¿En qué podemos ayudarte?" size="lg" />
            </div>
            <div class="grid gap-1">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Mensaje</label>
              <UTextarea v-model="mensaje" placeholder="Describí brevemente tu consulta..." :rows="4" size="lg" />
            </div>
            <UAlert v-if="errorMsg" color="warning" variant="soft" :description="errorMsg" />
            <UButton block size="lg" @click="enviar">Enviar mensaje</UButton>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
