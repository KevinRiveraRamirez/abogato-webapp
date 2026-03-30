<script setup lang="ts">
const mensaje = ref('')
const respuesta = ref('')

const { loading, error, sendMessage } = useAiChat()

const enviar = async () => {
  if (!mensaje.value.trim()) return

  const reply = await sendMessage(mensaje.value)

  if (reply) {
    respuesta.value = reply
  }
}
</script>

<template>
  <div class="p-4 border border-slate-700 rounded-lg space-y-4 bg-slate-950 text-white">
    <h2 class="text-xl font-semibold">Asistente IA</h2>

    <textarea
      v-model="mensaje"
      class="w-full border border-slate-600 rounded-md p-3 bg-slate-900 text-white"
      rows="5"
      placeholder="Escribe tu consulta..."
    />

    <button
      type="button"
      class="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      :disabled="loading"
      @click="enviar"
    >
      {{ loading ? 'Consultando...' : 'Enviar' }}
    </button>

    <p v-if="error" class="text-red-400">
      {{ error }}
    </p>

    <div
      v-if="respuesta"
      class="border border-slate-700 rounded-md p-4 bg-slate-900 text-slate-100"
    >
      <h3 class="font-semibold mb-2 text-slate-100">Respuesta:</h3>
      <p class="text-slate-100 whitespace-pre-wrap break-words">
        {{ respuesta }}
      </p>
    </div>
  </div>
</template>