<script setup lang="ts">
import MarkdownIt from "markdown-it";

type ChatRole = "user" | "assistant";

type UiChatMessage = {
  id: string;
  role: ChatRole;
  parts: Array<{ type: "text"; text: string; id?: string }>;
  metadata?: {
    suggestTicket?: boolean;
  };
};

const root = ref<HTMLElement | null>(null);
const abierto = ref(false);
const mensaje = ref("");
const mensajes = ref<UiChatMessage[]>([]);
const status = ref<"ready" | "submitted" | "error">("ready");
const scrollViewport = ref<HTMLElement | null>(null);

const preguntasSugeridas = [
  "¿Cómo solicito un divorcio en Costa Rica?",
  "¿Qué documentos necesito para iniciar mi trámite?",
  "Explícame este proceso en palabras sencillas",
  "Ayúdame a crear un ticket con mi caso",
];

const { loading, error, sendMessage } = useAiChat();
const {
  panel,
  panelStyle,
  updatePanelPosition,
  startDragging,
  shouldIgnoreOutsideClick,
} = useFloatingPanel({
  storageKey: "floating-panel:ai-chat",
  viewportMargin: 16,
  getBaseStyle: () => ({
    position: "fixed",
    zIndex: "240",
  }),
  getDefaultPosition: (panelRect) => {
    const margin = 16;
    const bubbleSize = 56;
    const bubbleOffset = 20;
    const gap = 12;

    const bubbleLeft = window.innerWidth - bubbleOffset - bubbleSize;
    const bubbleBottom = window.innerHeight - bubbleOffset;

    const preferredLeft = bubbleLeft - gap - panelRect.width;
    const preferredTop = bubbleBottom - panelRect.height;

    if (window.innerWidth < 640) {
      return {
        left: Math.max(margin, window.innerWidth - panelRect.width - margin),
        top: Math.max(margin, bubbleBottom - gap - panelRect.height),
      };
    }

    return {
      left: Math.max(margin, preferredLeft),
      top: Math.max(margin, preferredTop),
    };
  },
});

const md = new MarkdownIt({
  breaks: true,
  linkify: true,
});

const renderMessage = (text?: string) => {
  if (!text) return "";
  return md.render(text);
};

const toggleChat = () => {
  abierto.value = !abierto.value;
};

const crearTicket = () => {
  navigateTo("/tickets");
};

const usarPreguntaSugerida = (texto: string) => {
  mensaje.value = texto;
};

const newId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-expect-error randomUUID existe en runtimes modernos
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const pushMessage = (
  role: ChatRole,
  content: string,
  meta?: UiChatMessage["metadata"],
) => {
  mensajes.value.push({
    id: newId(),
    role,
    parts: [{ type: "text", text: content }],
    metadata: meta,
  });
};

function scrollToBottom() {
  if (!import.meta.client) return;

  requestAnimationFrame(() => {
    const el = scrollViewport.value;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  });
}

const enviar = async () => {
  const texto = mensaje.value.trim();

  if (!texto || loading.value) return;

  pushMessage("user", texto);
  mensaje.value = "";
  status.value = "submitted";
  scrollToBottom();

  const res = await sendMessage(texto);

  if (res) {
    pushMessage("assistant", res.reply, {
      suggestTicket: res.suggestTicket,
    });
    status.value = "ready";
    scrollToBottom();
    return;
  }

  status.value = "error";
  scrollToBottom();
};

watch(abierto, async (open) => {
  if (!open) return;

  await nextTick();
  updatePanelPosition();
  requestAnimationFrame(() => {
    updatePanelPosition();
    scrollToBottom();
  });
});

watch(
  mensajes,
  async () => {
    await nextTick();
    scrollToBottom();
  },
  { deep: true },
);

function handleClickOutside(event: MouseEvent) {
  if (!abierto.value || !root.value) return;
  if (shouldIgnoreOutsideClick()) return;

  const target = event.target;
  if (!(target instanceof Node)) return;
  if (root.value.contains(target)) return;
  if (panel.value?.contains(target)) return;

  abierto.value = false;
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape") {
    abierto.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleEscape);
  window.addEventListener("resize", updatePanelPosition);
  window.addEventListener("scroll", updatePanelPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleEscape);
  window.removeEventListener("resize", updatePanelPosition);
  window.removeEventListener("scroll", updatePanelPosition, true);
});
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
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0 scale-[0.98]"
        enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100 scale-100"
        leave-to-class="translate-y-2 opacity-0 scale-[0.98]"
      >
        <div v-if="abierto" ref="panel" class="fixed" :style="panelStyle">
          <UCard
            class="w-[440px] overflow-hidden rounded-3xl border border-default/70 bg-default/95 shadow-2xl backdrop-blur sm:w-[620px]"
            :ui="{
              body: 'p-0',
              header: 'p-0',
              footer: 'p-0',
            }"
          >
            <template #header>
              <div
                class="flex items-center justify-between border-b border-default px-4 py-3"
                @pointerdown="startDragging"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-highlighted">
                    Asistente IA
                  </p>
                  <p class="text-xs text-muted">
                    Consultas rápidas y ayuda con tickets
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

            <div class="flex h-[620px] flex-col">
              <div
                ref="scrollViewport"
                class="flex-1 overflow-y-auto px-4 py-4"
              >
                <div
                  v-if="mensajes.length === 0 && !loading"
                  class="flex h-full items-center justify-center"
                >
                  <div class="w-full max-w-md text-center">
                    <div
                      class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"
                    >
                      <UIcon
                        name="i-lucide-sparkles"
                        class="h-5 w-5 text-primary"
                      />
                    </div>

                    <p class="text-base font-semibold text-highlighted">
                      Hola, ¿en qué puedo ayudarte?
                    </p>

                    <p class="mt-2 text-sm text-muted">
                      Podés hacer consultas sobre trámites, requisitos,
                      documentos o pedir ayuda para crear un ticket.
                    </p>

                    <div class="mt-5 text-left">
                      <p
                        class="mb-2 text-xs font-medium uppercase tracking-wide text-muted"
                      >
                        Ejemplos de preguntas
                      </p>

                      <div class="grid gap-2">
                        <UButton
                          v-for="pregunta in preguntasSugeridas"
                          :key="pregunta"
                          variant="soft"
                          color="neutral"
                          class="justify-start rounded-2xl px-4 py-3 text-left whitespace-normal"
                          @click="usarPreguntaSugerida(pregunta)"
                        >
                          {{ pregunta }}
                        </UButton>
                      </div>
                    </div>

                    <div
                      class="mt-4 rounded-2xl border border-default bg-elevated/40 px-4 py-3 text-left"
                    >
                      <p class="text-xs font-medium text-highlighted">
                        Qué podés consultar
                      </p>
                      <p class="mt-1 text-sm text-muted">
                        Consultas legales generales, orientación sobre pasos a
                        seguir, explicación de documentos y apoyo para crear
                        tickets más claros.
                      </p>
                    </div>
                  </div>
                </div>

                <div v-else class="space-y-4">
                  <div
                    v-for="item in mensajes"
                    :key="item.id"
                    class="flex"
                    :class="
                      item.role === 'user' ? 'justify-end' : 'justify-start'
                    "
                  >
                    <div class="max-w-[85%]">
                      <div
                        class="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
                        :class="
                          item.role === 'user'
                            ? 'bg-primary text-inverted'
                            : 'border border-default bg-elevated/50 text-default'
                        "
                      >
                        <div
                          class="chat-markdown"
                          v-html="renderMessage(item.parts[0]?.text)"
                        />
                      </div>

                      <div
                        v-if="
                          item.role === 'assistant' &&
                          item.metadata?.suggestTicket
                        "
                        class="mt-2"
                      >
                        <UButton
                          size="xs"
                          variant="outline"
                          color="primary"
                          icon="i-lucide-ticket"
                          @click="crearTicket"
                        >
                          Crear ticket
                        </UButton>
                      </div>
                    </div>
                  </div>

                  <div v-if="loading" class="flex justify-start">
                    <div
                      class="rounded-2xl border border-default bg-elevated/50 px-4 py-3"
                    >
                      <div class="flex items-center gap-2 text-sm text-muted">
                        <span
                          class="h-2 w-2 animate-bounce rounded-full bg-current"
                        />
                        <span
                          class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:120ms]"
                        />
                        <span
                          class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:240ms]"
                        />
                        <span>Pensando...</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="error" class="pt-2">
                    <UAlert
                      color="error"
                      variant="soft"
                      icon="i-lucide-alert-triangle"
                      :title="error"
                    />
                  </div>
                </div>
              </div>

              <div class="border-t border-default bg-default/70 px-3 py-3">
                <form class="flex items-end gap-2" @submit.prevent="enviar">
                  <UTextarea
                    v-model="mensaje"
                    data-no-panel-drag
                    :rows="1"
                    autoresize
                    placeholder="Escribe tu mensaje..."
                    class="flex-1"
                    :disabled="loading"
                  />

                  <UButton
                    type="submit"
                    color="primary"
                    square
                    class="flex h-10 w-10 shrink-0 items-center justify-center"
                    :loading="loading"
                    :disabled="!mensaje.trim() || loading"
                  >
                    <UIcon name="i-lucide-send" class="h-4 w-4" />
                  </UButton>
                </form>
              </div>
            </div>
          </UCard>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.chat-markdown :deep(p) {
  margin: 0 0 0.75rem 0;
}

.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  margin: 0.5rem 0 0.75rem 1.25rem;
  padding: 0;
}

.chat-markdown :deep(li) {
  margin: 0.25rem 0;
}

.chat-markdown :deep(strong) {
  font-weight: 600;
}

.chat-markdown :deep(em) {
  font-style: italic;
}

.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3),
.chat-markdown :deep(h4) {
  margin: 0.75rem 0 0.5rem 0;
  font-weight: 700;
  line-height: 1.25;
}

.chat-markdown :deep(h1) {
  font-size: 1.125rem;
}

.chat-markdown :deep(h2) {
  font-size: 1rem;
}

.chat-markdown :deep(h3),
.chat-markdown :deep(h4) {
  font-size: 0.95rem;
}

.chat-markdown :deep(a) {
  text-decoration: underline;
}

.chat-markdown :deep(code) {
  border-radius: 0.375rem;
  padding: 0.1rem 0.35rem;
  font-size: 0.85em;
  background: rgba(127, 127, 127, 0.15);
}

.chat-markdown :deep(pre) {
  overflow-x: auto;
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin: 0.75rem 0;
  background: rgba(127, 127, 127, 0.12);
}

.chat-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
}

.chat-markdown :deep(blockquote) {
  margin: 0.75rem 0;
  padding-left: 0.75rem;
  border-left: 3px solid rgba(127, 127, 127, 0.35);
  opacity: 0.95;
}
</style>
