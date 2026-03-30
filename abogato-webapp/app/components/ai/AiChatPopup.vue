<script setup lang="ts">
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  suggestTicket?: boolean
}

const abierto = ref(false)
const mensaje = ref('')
const mensajes = ref<ChatMessage[]>([])

const { loading, error, sendMessage } = useAiChat()

const toggleChat = () => {
  abierto.value = !abierto.value
}

const crearTicket = () => {
  navigateTo('/tickets')
}

const enviar = async () => {
  if (!mensaje.value.trim() || loading.value) return

  const texto = mensaje.value.trim()

  mensajes.value.push({
    role: 'user',
    content: texto,
  })

  mensaje.value = ''

  const res = await sendMessage(texto)

  if (res) {
    mensajes.value.push({
      role: 'assistant',
      content: res.reply,
      suggestTicket: res.suggestTicket,
    })
  }
}
</script>

<template>
  <div class="fixed bottom-5 right-5 z-50">
    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-lg transition hover:bg-blue-700"
      @click="toggleChat"
    >
      💬
    </button>

    <div
      v-if="abierto"
      class="absolute bottom-16 right-0 w-[340px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl sm:w-[380px]"
    >
      <div class="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
        <h2 class="font-semibold text-white">Asistente IA</h2>

        <button
          type="button"
          class="text-lg text-slate-300 hover:text-white"
          @click="abierto = false"
        >
          ✕
        </button>
      </div>

      <div class="h-80 space-y-3 overflow-y-auto bg-slate-950 px-3 py-3">
        <div
          v-if="mensajes.length === 0"
          class="text-sm text-slate-400"
        >
          Hola, ¿en qué puedo ayudarte?
        </div>

        <div
          v-for="(item, index) in mensajes"
          :key="index"
          class="flex"
          :class="item.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words"
            :class="
              item.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'border border-slate-700 bg-slate-800 text-slate-100'
            "
          >
            <p>{{ item.content }}</p>

            <div
              v-if="item.role === 'assistant' && item.suggestTicket"
              class="mt-2"
            >
              <button
                type="button"
                class="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                @click="crearTicket"
              >
                Crear ticket
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="loading"
          class="text-sm text-slate-400"
        >
          Escribiendo...
        </div>

        <div
          v-if="error"
          class="text-sm text-red-400"
        >
          {{ error }}
        </div>
      </div>

      <form
        class="border-t border-slate-800 bg-slate-900 p-3"
        @submit.prevent="enviar"
      >
        <div class="flex gap-2">
          <input
            v-model="mensaje"
            type="text"
            placeholder="Escribe tu mensaje..."
            class="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-400 focus:border-blue-500"
          >

          <button
            type="submit"
            class="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading || !mensaje.trim()"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>