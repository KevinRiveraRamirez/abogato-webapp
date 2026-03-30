<script setup lang="ts">
type ChatRole = 'user' | 'assistant'

type UiChatMessage = {
  id: string
  role: ChatRole
  parts: Array<{ type: 'text'; text: string; id?: string }>
  metadata?: {
    suggestTicket?: boolean
  }
}

const root = ref<HTMLElement | null>(null)
const abierto = ref(false)
const mensaje = ref('')
const mensajes = ref<UiChatMessage[]>([])
const status = ref<'ready' | 'submitted' | 'error'>('ready')
const scrollViewport = ref<HTMLElement | null>(null)

const { loading, error, sendMessage } = useAiChat()
const {
  panel,
  panelStyle,
  updatePanelPosition,
  startDragging,
  shouldIgnoreOutsideClick,
} = useFloatingPanel({
  storageKey: 'floating-panel:ai-chat',
  viewportMargin: 16,
  getBaseStyle: () => ({
    position: 'fixed',
    zIndex: '240',
  }),
  getDefaultPosition: (panelRect) => {
    // Place the panel next to the AI bubble on first open.
    // Bubble is fixed: bottom-5 right-5 with size 56px.
    const margin = 16
    const bubbleSize = 56
    const bubbleOffset = 20
    const gap = 12

    const bubbleLeft = window.innerWidth - bubbleOffset - bubbleSize
    const bubbleBottom = window.innerHeight - bubbleOffset

    // Prefer to the left of the bubble, aligned to bottom.
    const preferredLeft = bubbleLeft - gap - panelRect.width
    const preferredTop = bubbleBottom - panelRect.height

    // On small screens, prefer above the bubble (more usable).
    if (window.innerWidth < 640) {
      return {
        left: window.innerWidth - panelRect.width - margin,
        top: Math.max(margin, bubbleBottom - gap - panelRect.height),
      }
    }

    return {
      left: preferredLeft,
      top: preferredTop,
    }
  },
})

const toggleChat = () => {
  abierto.value = !abierto.value
}

const crearTicket = () => {
  navigateTo('/tickets')
}

const newId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-expect-error - randomUUID exists in modern runtimes
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const pushMessage = (role: ChatRole, content: string, meta?: UiChatMessage['metadata']) => {
  mensajes.value.push({
    id: newId(),
    role,
    parts: [{ type: 'text', text: content }],
    metadata: meta,
  })
}

function scrollToBottom() {
  if (!import.meta.client) return

  requestAnimationFrame(() => {
    const el = scrollViewport.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  })
}

const enviar = async () => {
  if (!mensaje.value.trim() || loading.value) return

  const texto = mensaje.value.trim()

  pushMessage('user', texto)
  scrollToBottom()

  mensaje.value = ''
  status.value = 'submitted'

  const res = await sendMessage(texto)

  if (res) {
    pushMessage('assistant', res.reply, { suggestTicket: res.suggestTicket })
    scrollToBottom()
    status.value = 'ready'
  } else {
    status.value = 'error'
  }
}

watch(abierto, async (open) => {
  if (!open) return
  await nextTick()
  updatePanelPosition()
  requestAnimationFrame(() => updatePanelPosition())
  scrollToBottom()
})

function handleClickOutside(event: MouseEvent) {
  if (!abierto.value || !root.value) return
  if (shouldIgnoreOutsideClick()) return

  const target = event.target
  if (!(target instanceof Node)) return
  if (root.value.contains(target)) return
  if (panel.value?.contains(target)) return

  abierto.value = false
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    abierto.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
})
</script>

<template>
  <div ref="root" class="fixed bottom-5 right-5 z-[230]">
    <UButton
      color="primary"
      variant="solid"
      class="h-14 w-14 rounded-full shadow-lg"
      square
      icon="i-lucide-message-circle"
      aria-label="Abrir asistente IA"
      :aria-expanded="abierto"
      @click="toggleChat"
    />

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-2 opacity-0"
      >
        <div
          v-if="abierto"
          ref="panel"
          class="fixed"
          :style="panelStyle"
          @pointerdown="startDragging"
        >
          <UCard
            :ui="{ body: 'p-0', header: 'px-5 py-4', footer: 'p-0' }"
            class="w-[468px] overflow-hidden rounded-3xl border border-default/70 bg-default/95 shadow-2xl backdrop-blur sm:w-[546px]"
          >
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-highlighted">
                    Asistente IA
                  </p>
                  <p class="text-xs text-muted">
                    Podés mover este panel arrastrando el encabezado.
                  </p>
                </div>

                <UButton
                  data-no-panel-drag
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  square
                  aria-label="Cerrar"
                  @click="abierto = false"
                />
              </div>
            </template>

            <div class="relative h-[546px] overflow-hidden">
              <div ref="scrollViewport" class="absolute inset-0 overflow-y-auto px-1.5 py-2">
                <UChatMessages
                  :messages="mensajes"
                  :status="loading ? 'submitted' : (status === 'error' ? 'error' : 'ready')"
                  :should-auto-scroll="true"
                  :should-scroll-to-bottom="true"
                  :auto-scroll="false"
                  :spacing-offset="96"
                  :ui="{
                    root: 'relative w-full flex flex-col gap-2 flex-1 px-3 pb-10 [&>article]:last-of-type:min-h-(--last-message-height)',
                    autoScroll: 'rounded-full absolute left-1/2 -translate-x-1/2 bottom-3',
                  }"
                >
                  <template #default>
                    <UChatMessage
                      v-for="item in mensajes"
                      :key="item.id"
                      v-bind="item"
                      :side="item.role === 'user' ? 'right' : 'left'"
                      variant="soft"
                      :ui="{
                        content:
                          item.role === 'user'
                            ? 'bg-primary text-inverted whitespace-pre-wrap break-words leading-relaxed text-sm'
                            : 'bg-elevated/40 ring ring-default/70 text-default whitespace-pre-wrap break-words leading-relaxed text-sm',
                      }"
                      :actions="item.role === 'assistant' && item.metadata?.suggestTicket ? [
                        {
                          label: 'Crear ticket',
                          icon: 'i-lucide-ticket',
                          color: 'primary',
                          variant: 'outline',
                          size: 'xs',
                          onClick: () => crearTicket(),
                        },
                      ] : undefined"
                    />
                  </template>

                  <template #indicator>
                    <div class="flex items-center gap-2 text-muted">
                      <div class="flex items-center gap-1">
                        <span class="size-1.5 rounded-full bg-elevated animate-bounce" />
                        <span class="size-1.5 rounded-full bg-elevated animate-bounce [animation-delay:120ms]" />
                        <span class="size-1.5 rounded-full bg-elevated animate-bounce [animation-delay:240ms]" />
                      </div>
                      <UChatShimmer text="Pensando..." class="text-xs" />
                    </div>
                  </template>
                </UChatMessages>

              <div v-if="mensajes.length === 0" class="px-5 pb-5 pt-4 text-sm text-muted">
                  Hola, ¿en qué puedo ayudarte?
                </div>

              <div v-if="error" class="px-5 pb-5">
                  <UAlert color="error" variant="soft" :title="error" icon="i-lucide-alert-triangle" />
                </div>
              </div>
            </div>

            <template #footer>
            <div class="border-t border-default bg-default/60 px-3 py-3">
                <UChatPrompt
                  data-no-panel-drag
                  v-model="mensaje"
                  placeholder="Escribe tu mensaje…"
                  variant="subtle"
                  :disabled="loading"
                  :autofocus="false"
                  @submit="enviar"
                >
                  <UChatPromptSubmit
                    data-no-panel-drag
                    :status="loading ? 'submitted' : 'ready'"
                    color="primary"
                  />
                </UChatPrompt>
              </div>
            </template>
          </UCard>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>