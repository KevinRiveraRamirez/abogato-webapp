<script setup lang="ts">
type ChatRole = "user" | "assistant";

type UiChatMessage = {
  id: string;
  role: ChatRole;
  parts: Array<{ type: "text"; text: string; id?: string }>;
  metadata?: {
    suggestTicket?: boolean;
  };
};

type SavedChatPosition = {
  left: number;
  top: number;
};

const POSITION_STORAGE_KEY = "ai-chat-position-v1";

const root = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);

const abierto = ref(false);
const mensaje = ref("");
const mensajes = ref<UiChatMessage[]>([]);
const status = ref<"ready" | "submitted" | "error">("ready");

const supabase = useSupabaseClient();
const { loading, error, sendMessage } = useAiChat();

const fallbackSugeridas = [
  "¿Cómo solicito un divorcio en Costa Rica?",
  "¿Qué documentos necesito para iniciar mi trámite?",
  "¿Cómo registro una empresa en Costa Rica?",
  "¿Qué es una escritura pública?",
];

const preguntasSugeridas = ref<string[]>(fallbackSugeridas);
const sugeridasLoading = ref(false);

const isMobile = ref(false);
const position = ref({ left: 0, top: 0 });
const dragging = ref(false);

const dragState = reactive({
  startX: 0,
  startY: 0,
  originLeft: 0,
  originTop: 0,
});

function updateViewportFlags() {
  isMobile.value = window.innerWidth < 640;
}

function savePosition() {
  if (isMobile.value) return;

  try {
    const value: SavedChatPosition = {
      left: position.value.left,
      top: position.value.top,
    };

    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignorar errores de storage
  }
}

function loadSavedPosition(): SavedChatPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.left !== "number" ||
      typeof parsed?.top !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

const panelStyle = computed(() => {
  if (isMobile.value) {
    return {
      position: "fixed",
      left: "0.75rem",
      right: "0.75rem",
      top: "0.75rem",
      bottom: "0.75rem",
      zIndex: "520",
    };
  }

  return {
    position: "fixed",
    left: `${position.value.left}px`,
    top: `${position.value.top}px`,
    zIndex: "520",
  };
});

function clampPosition(left: number, top: number) {
  if (!panel.value) return { left, top };

  const rect = panel.value.getBoundingClientRect();
  const margin = 16;

  const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
  const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);

  return {
    left: Math.min(Math.max(left, margin), maxLeft),
    top: Math.min(Math.max(top, margin), maxTop),
  };
}

function setDefaultDesktopPosition() {
  if (!panel.value || isMobile.value) return;

  const rect = panel.value.getBoundingClientRect();
  const bubbleSize = 56;
  const bubbleOffset = 20;
  const gap = 12;

  const bubbleLeft = window.innerWidth - bubbleOffset - bubbleSize;
  const bubbleBottom = window.innerHeight - bubbleOffset;

  const preferredLeft = bubbleLeft - gap - rect.width;
  const preferredTop = bubbleBottom - rect.height;

  position.value = clampPosition(preferredLeft, preferredTop);
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging.value || isMobile.value) return;

  const nextLeft = dragState.originLeft + (event.clientX - dragState.startX);
  const nextTop = dragState.originTop + (event.clientY - dragState.startY);

  position.value = clampPosition(nextLeft, nextTop);
}

function stopDragging() {
  const wasDragging = dragging.value;

  dragging.value = false;
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", stopDragging);

  if (wasDragging && !isMobile.value) {
    savePosition();
  }
}

function startDragging(event: PointerEvent) {
  if (isMobile.value) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.closest("[data-no-panel-drag]")) return;

  dragging.value = true;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.originLeft = position.value.left;
  dragState.originTop = position.value.top;

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", stopDragging);
}

async function openChat() {
  abierto.value = true;

  await nextTick();

  if (!isMobile.value) {
    const saved = loadSavedPosition();

    if (saved) {
      position.value = clampPosition(saved.left, saved.top);
    } else {
      setDefaultDesktopPosition();
    }
  }

  if (mensajes.value.length === 0) {
    await cargarPreguntasSugeridas();
  }
}

function cerrarChat() {
  if (!isMobile.value) {
    savePosition();
  }

  abierto.value = false;
}

async function toggleChat() {
  if (abierto.value) {
    cerrarChat();
    return;
  }

  await openChat();
}

function crearTicket() {
  navigateTo("/tickets");
}

function usarPreguntaSugerida(texto: string) {
  mensaje.value = texto;
}

async function cargarPreguntasSugeridas() {
  if (sugeridasLoading.value) return;

  sugeridasLoading.value = true;

  try {
    const { data, error } = await supabase
      .from("faq")
      .select("pregunta")
      .or("activa.is.null,activa.eq.true")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    const preguntas = (data ?? [])
      .map((item) => item.pregunta)
      .filter(Boolean);

    preguntasSugeridas.value = preguntas.length
      ? preguntas
      : fallbackSugeridas;
  } catch {
    preguntasSugeridas.value = fallbackSugeridas;
  } finally {
    sugeridasLoading.value = false;
  }
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-expect-error runtime moderno
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pushMessage(
  role: ChatRole,
  content: string,
  meta?: UiChatMessage["metadata"],
) {
  mensajes.value.push({
    id: newId(),
    role,
    parts: [{ type: "text", text: content }],
    metadata: meta,
  });
}

async function enviar() {
  if (!mensaje.value.trim() || loading.value) return;

  const texto = mensaje.value.trim();
  pushMessage("user", texto);
  mensaje.value = "";
  status.value = "submitted";

  const res = await sendMessage(texto);

  if (res) {
    pushMessage("assistant", res.reply, {
      suggestTicket: res.suggestTicket,
    });
    status.value = "ready";
  } else {
    status.value = "error";
  }
}

function handleClickOutside(event: MouseEvent) {
  if (!abierto.value || !root.value || !panel.value) return;

  const target = event.target;
  if (!(target instanceof Node)) return;

  if (root.value.contains(target)) return;
  if (panel.value.contains(target)) return;

  cerrarChat();
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape") {
    cerrarChat();
  }
}

function handleResize() {
  const wasMobile = isMobile.value;
  updateViewportFlags();

  if (!abierto.value || !panel.value) return;

  if (isMobile.value) return;

  if (wasMobile && !isMobile.value) {
    const saved = loadSavedPosition();

    if (saved) {
      position.value = clampPosition(saved.left, saved.top);
    } else {
      setDefaultDesktopPosition();
    }

    return;
  }

  position.value = clampPosition(position.value.left, position.value.top);
}

onMounted(() => {
  updateViewportFlags();

  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleEscape);
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleEscape);
  window.removeEventListener("resize", handleResize);
  stopDragging();
});
</script>

<template>
  <div
    ref="root"
    class="fixed z-[520]"
    style="
      bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
      right: max(1.25rem, env(safe-area-inset-right, 0px));
    "
  >
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
        <div
          v-if="abierto"
          ref="panel"
          :style="panelStyle"
          class="fixed
                 w-[min(calc(100vw-2rem),22rem)] h-[min(70dvh,34rem)]
                 sm:w-[26rem] sm:h-[min(72dvh,36rem)]
                 md:w-[30rem] md:h-[min(74dvh,38rem)]
                 lg:w-[34rem] lg:h-[min(76dvh,40rem)]
                 xl:w-[38rem] xl:h-[min(78dvh,42rem)]"
        >
          <UCard
            :ui="{
              root: 'flex h-full min-h-0 flex-col overflow-hidden rounded-3xl',
              header: 'shrink-0 px-4 py-3 sm:px-5 sm:py-4',
              body: 'flex-1 min-h-0 overflow-hidden p-0',
              footer: 'p-0',
            }"
            class="h-full w-full border border-default/70 bg-default/95 shadow-2xl backdrop-blur"
          >
            <template #header>
              <div
                class="flex items-center justify-between gap-3"
                :class="!isMobile ? 'cursor-grab active:cursor-grabbing select-none' : ''"
                @pointerdown="startDragging"
              >
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-highlighted">
                    Asistente IA
                  </p>
                  <p class="text-xs text-muted">
                    {{
                      isMobile
                        ? "Consultá sobre trámites y requisitos."
                        : "Podés mover esta ventana arrastrando el encabezado."
                    }}
                  </p>
                </div>

                <UButton
                  data-no-panel-drag
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  square
                  aria-label="Cerrar"
                  @click="cerrarChat"
                />
              </div>
            </template>

            <UChatPalette
              :ui="{
                root: 'relative flex-1 flex flex-col min-h-0 min-w-0',
                content: 'overflow-y-auto flex-1 flex flex-col min-h-0 py-2 sm:py-3',
                prompt: 'px-2 sm:px-3 rounded-t-none border-t border-default bg-default/90 shrink-0'
              }"
            >
              <div
                v-if="mensajes.length === 0 && !loading"
                class="flex min-h-full items-center justify-center px-4 py-6"
              >
                <div class="w-full max-w-xl text-center">
                  <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <UIcon
                      name="i-lucide-sparkles"
                      class="h-5 w-5 text-primary"
                    />
                  </div>

                  <p class="text-base font-semibold text-highlighted">
                    Hola, ¿en qué puedo ayudarte?
                  </p>
                  <p class="mt-2 text-sm text-muted">
                    Consultá sobre trámites, requisitos o documentos legales en Costa Rica.
                  </p>

                  <div class="mt-5 text-left">
                    <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
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
                </div>
              </div>

              <UChatMessages
                v-else
                :messages="mensajes"
                :status="loading ? 'submitted' : status === 'error' ? 'error' : 'ready'"
                :should-auto-scroll="true"
                :should-scroll-to-bottom="true"
                :ui="{
                  root: 'w-full flex flex-col gap-2 flex-1 px-2 sm:px-3 [&>article]:last-of-type:min-h-(--last-message-height)'
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
                      root: 'max-w-full',
                      content:
                        item.role === 'user'
                          ? 'max-w-full bg-primary text-inverted whitespace-pre-wrap break-words leading-relaxed text-sm'
                          : 'max-w-full bg-elevated/50 ring ring-default/70 text-default whitespace-pre-wrap break-words leading-relaxed text-sm'
                    }"
                    :actions="
                      item.role === 'assistant' && item.metadata?.suggestTicket
                        ? [
                            {
                              label: 'Crear ticket',
                              icon: 'i-lucide-ticket',
                              color: 'primary',
                              variant: 'outline',
                              size: 'xs',
                              onClick: () => crearTicket(),
                            },
                          ]
                        : undefined
                    "
                  />
                </template>

                <template #indicator>
                  <div class="flex items-center gap-2 px-2 py-1 text-muted sm:px-3">
                    <div class="flex items-center gap-1">
                      <span class="size-1.5 animate-bounce rounded-full bg-elevated" />
                      <span class="size-1.5 animate-bounce rounded-full bg-elevated [animation-delay:120ms]" />
                      <span class="size-1.5 animate-bounce rounded-full bg-elevated [animation-delay:240ms]" />
                    </div>
                    <UChatShimmer text="Pensando..." class="text-xs" />
                  </div>
                </template>
              </UChatMessages>

              <div v-if="error" class="shrink-0 px-4 pb-2">
                <UAlert
                  color="error"
                  variant="soft"
                  :title="error"
                  icon="i-lucide-alert-triangle"
                />
              </div>

              <template #prompt>
                <UChatPrompt
                  v-model="mensaje"
                  data-no-panel-drag
                  placeholder="Escribe tu mensaje…"
                  variant="naked"
                  :disabled="loading"
                  :autofocus="false"
                  :ui="{
                    root: 'relative flex flex-col items-stretch gap-2 px-0 py-2 w-full rounded-none bg-transparent',
                    footer: 'flex items-center justify-between gap-1.5'
                  }"
                  @submit="enviar"
                >
                  <UChatPromptSubmit
                    data-no-panel-drag
                    :status="loading ? 'submitted' : status"
                    color="primary"
                  />
                </UChatPrompt>
              </template>
            </UChatPalette>
          </UCard>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>