<script setup lang="ts">
definePageMeta({ layout: "app", middleware: ["auth", "admin"] });

type AdminTab = "faq" | "consultas" | "metricas";

type FaqRow = {
  id: string;
  pregunta: string;
  respuesta: string;
  activa: boolean;
  created_at?: string;
};

type ConsultaRow = {
  id: string;
  content: string;
  was_escalated: boolean;
  created_at: string;
};

const supabase = useSupabaseClient();
const toast = useToast();

const tab = ref<AdminTab>("faq");

const tabs = [
  { key: "faq", label: "Preguntas frecuentes", icon: "i-lucide-circle-help" },
  { key: "consultas", label: "Consultas", icon: "i-lucide-messages-square" },
  { key: "metricas", label: "Métricas", icon: "i-lucide-chart-column" },
] satisfies Array<{ key: AdminTab; label: string; icon: string }>;

// Estado general
const loading = ref(false);
const pageError = ref<string | null>(null);

// FAQ
const faqs = ref<FaqRow[]>([]);
const nuevaPregunta = ref("");
const nuevaRespuesta = ref("");
const guardandoFaq = ref(false);
const filtroFaq = ref("");

// Consultas
const consultas = ref<ConsultaRow[]>([]);
const filtroConsulta = ref("");

// Métricas
const metricas = ref({
  total: 0,
  escaladas: 0,
  tasaResolucion: "0.0",
});

// Utilidades UI
const totalFaqActivas = computed(
  () => faqs.value.filter((f) => f.activa).length,
);
const totalFaqInactivas = computed(
  () => faqs.value.filter((f) => !f.activa).length,
);

const faqsFiltradas = computed(() => {
  const q = filtroFaq.value.trim().toLowerCase();
  if (!q) return faqs.value;

  return faqs.value.filter(
    (faq) =>
      faq.pregunta?.toLowerCase().includes(q) ||
      faq.respuesta?.toLowerCase().includes(q),
  );
});

const consultasFiltradas = computed(() => {
  const q = filtroConsulta.value.trim().toLowerCase();
  if (!q) return consultas.value;

  return consultas.value.filter((c) => c.content?.toLowerCase().includes(q));
});

const resumenCards = computed(() => [
  {
    title: "FAQs activas",
    value: String(totalFaqActivas.value),
    description: `${faqs.value.length} registradas`,
    icon: "i-lucide-book-open-text",
    tone: "text-primary",
  },
  {
    title: "Consultas escaladas",
    value: String(metricas.value.escaladas),
    description: "Requieren intervención humana",
    icon: "i-lucide-triangle-alert",
    tone: "text-warning",
  },
  {
    title: "Tasa de resolución",
    value: `${metricas.value.tasaResolucion}%`,
    description: "Respuestas no escaladas",
    icon: "i-lucide-badge-check",
    tone: "text-success",
  },
]);

function formatDate(value?: string) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function withPageState<T>(action: () => Promise<T>) {
  loading.value = true;
  pageError.value = null;

  try {
    return await action();
  } catch (error: any) {
    const message = error?.message || "Ocurrió un error inesperado.";
    pageError.value = message;
    toast.add({
      title: "Error",
      description: message,
      color: "error",
    });
    throw error;
  } finally {
    loading.value = false;
  }
}

// ------------------------------
// FAQ
// ------------------------------
async function cargarFaqs() {
  const { data, error } = await supabase
    .from("faq")
    .select("id, pregunta, respuesta, activa, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  faqs.value = (data ?? []) as FaqRow[];
}

async function agregarFaq() {
  const pregunta = nuevaPregunta.value.trim();
  const respuesta = nuevaRespuesta.value.trim();

  if (!pregunta || !respuesta) return;

  guardandoFaq.value = true;

  try {
    const { error } = await supabase.from("faq").insert([
      {
        pregunta,
        respuesta,
        activa: true,
      },
    ]);

    if (error) throw error;

    nuevaPregunta.value = "";
    nuevaRespuesta.value = "";

    toast.add({
      title: "Pregunta agregada",
      description: "La nueva pregunta frecuente fue registrada correctamente.",
      color: "success",
    });

    await cargarFaqs();
  } catch (error: any) {
    toast.add({
      title: "No se pudo guardar",
      description: error?.message || "No fue posible registrar la FAQ.",
      color: "error",
    });
  } finally {
    guardandoFaq.value = false;
  }
}

async function toggleFaq(id: string, activa: boolean) {
  const { error } = await supabase
    .from("faq")
    .update({ activa: !activa })
    .eq("id", id);

  if (error) {
    toast.add({
      title: "No se pudo actualizar",
      description: error.message,
      color: "error",
    });
    return;
  }

  toast.add({
    title: !activa ? "FAQ activada" : "FAQ desactivada",
    color: "success",
  });

  await cargarFaqs();
}

async function eliminarFaq(id: string) {
  const confirmed = confirm("¿Deseas eliminar esta pregunta frecuente?");
  if (!confirmed) return;

  const { error } = await supabase.from("faq").delete().eq("id", id);

  if (error) {
    toast.add({
      title: "No se pudo eliminar",
      description: error.message,
      color: "error",
    });
    return;
  }

  toast.add({
    title: "FAQ eliminada",
    color: "success",
  });

  await cargarFaqs();
}

// ------------------------------
// Consultas
// ------------------------------
async function cargarConsultas() {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, content, was_escalated, created_at")
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  consultas.value = (data ?? []) as ConsultaRow[];
}

// ------------------------------
// Métricas
// ------------------------------
async function cargarMetricas() {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("was_escalated")
    .eq("role", "assistant");

  if (error) throw error;

  const rows = data ?? [];
  const total = rows.length;
  const escaladas = rows.filter((row) => row.was_escalated).length;
  const resueltas = total - escaladas;

  metricas.value = {
    total,
    escaladas,
    tasaResolucion: total > 0 ? ((resueltas / total) * 100).toFixed(1) : "0.0",
  };
}

async function cargarResumenLigero() {
  const [faqRes, metricasRes] = await Promise.all([
    supabase.from("faq").select("id, activa"),
    supabase
      .from("ai_conversations")
      .select("was_escalated")
      .eq("role", "assistant"),
  ]);

  if (!faqRes.error && faqRes.data) {
    faqs.value = faqRes.data.map((row: any) => ({
      id: row.id,
      pregunta: "",
      respuesta: "",
      activa: !!row.activa,
    }));
  }

  if (!metricasRes.error && metricasRes.data) {
    const total = metricasRes.data.length;
    const escaladas = metricasRes.data.filter(
      (row: any) => row.was_escalated,
    ).length;

    metricas.value = {
      total,
      escaladas,
      tasaResolucion:
        total > 0 ? (((total - escaladas) / total) * 100).toFixed(1) : "0.0",
    };
  }
}

async function refreshCurrentTab() {
  if (tab.value === "faq") {
    await cargarFaqs();
    return;
  }

  if (tab.value === "consultas") {
    await cargarConsultas();
    return;
  }

  if (tab.value === "metricas") {
    await cargarMetricas();
  }
}

watch(tab, async () => {
  await withPageState(refreshCurrentTab);
});

onMounted(async () => {
  await withPageState(async () => {
    await Promise.all([cargarResumenLigero(), refreshCurrentTab()]);
  });
});
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <!-- Header -->
    <section
      class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
    >
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-shield-check" class="h-4 w-4" />
          <span>Módulo administrativo</span>
        </div>

        <div>
          <h1
            class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
          >
            Asistente virtual
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-muted">
            Administra preguntas frecuentes, revisa consultas registradas por
            usuarios y monitorea el desempeño general del asistente.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
          to="/admin/dashboard"
        >
          Volver al dashboard
        </UButton>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="withPageState(refreshCurrentTab)"
        >
          Recargar
        </UButton>
      </div>
    </section>

    <!-- Error global -->
    <UAlert
      v-if="pageError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-triangle"
      title="No se pudo cargar el módulo"
      :description="pageError"
    />

    <!-- Resumen -->
    <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="card in resumenCards" :key="card.title" class="rounded-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-muted">{{ card.title }}</p>
            <p class="mt-2 text-3xl font-bold text-highlighted">
              {{ card.value }}
            </p>
            <p class="mt-1 text-sm text-muted">{{ card.description }}</p>
          </div>

          <div class="rounded-2xl border border-default bg-elevated p-3">
            <UIcon :name="card.icon" class="h-5 w-5" :class="card.tone" />
          </div>
        </div>
      </UCard>
    </section>

    <!-- Tabs -->
    <section class="rounded-2xl border border-default bg-default p-3">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="t in tabs"
          :key="t.key"
          :variant="tab === t.key ? 'solid' : 'ghost'"
          :color="tab === t.key ? 'primary' : 'neutral'"
          :icon="t.icon"
          class="rounded-xl"
          @click="tab = t.key"
        >
          {{ t.label }}
        </UButton>
      </div>
    </section>

    <!-- FAQ -->
    <section
      v-if="tab === 'faq'"
      class="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]"
    >
      <UCard class="rounded-2xl">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-base font-semibold text-highlighted">
              Nueva pregunta frecuente
            </h2>
            <p class="text-sm text-muted">
              Agrega respuestas base para mejorar la precisión del asistente.
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <label
              class="text-xs font-medium uppercase tracking-wide text-muted"
            >
              Pregunta
            </label>
            <UInput
              v-model="nuevaPregunta"
              placeholder="Ej. ¿Cómo solicito un divorcio en Costa Rica?"
              size="lg"
            />
          </div>

          <div class="space-y-1.5">
            <label
              class="text-xs font-medium uppercase tracking-wide text-muted"
            >
              Respuesta
            </label>
            <UTextarea
              v-model="nuevaRespuesta"
              placeholder="Escribe una respuesta clara, útil y alineada con el asistente..."
              :rows="7"
            />
          </div>

          <div class="flex justify-end">
            <UButton
              color="primary"
              icon="i-lucide-plus"
              :loading="guardandoFaq"
              :disabled="!nuevaPregunta.trim() || !nuevaRespuesta.trim()"
              @click="agregarFaq"
            >
              Guardar FAQ
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard class="rounded-2xl">
        <template #header>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                Base de preguntas frecuentes
              </h2>
              <p class="text-sm text-muted">
                {{ totalFaqActivas }} activas ·
                {{ totalFaqInactivas }} inactivas
              </p>
            </div>

            <div class="w-full sm:w-72">
              <UInput
                v-model="filtroFaq"
                icon="i-lucide-search"
                placeholder="Buscar pregunta o respuesta"
              />
            </div>
          </div>
        </template>

        <div v-if="loading && !faqs.length" class="space-y-3">
          <USkeleton class="h-24 w-full rounded-xl" />
          <USkeleton class="h-24 w-full rounded-xl" />
          <USkeleton class="h-24 w-full rounded-xl" />
        </div>

        <div v-else-if="faqsFiltradas.length" class="space-y-3">
          <div
            v-for="faq in faqsFiltradas"
            :key="faq.id"
            class="rounded-2xl border border-default bg-elevated/30 p-4"
          >
            <div
              class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-highlighted">
                    {{ faq.pregunta }}
                  </p>

                  <UBadge
                    :color="faq.activa ? 'success' : 'neutral'"
                    variant="soft"
                  >
                    {{ faq.activa ? "Activa" : "Inactiva" }}
                  </UBadge>
                </div>

                <p
                  class="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted"
                >
                  {{ faq.respuesta }}
                </p>

                <p class="mt-3 text-xs text-muted">
                  {{ formatDate(faq.created_at) }}
                </p>
              </div>

              <div class="flex shrink-0 flex-wrap gap-2">
                <UButton
                  :color="faq.activa ? 'warning' : 'success'"
                  variant="soft"
                  size="sm"
                  :icon="faq.activa ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  @click="toggleFaq(faq.id, faq.activa)"
                >
                  {{ faq.activa ? "Desactivar" : "Activar" }}
                </UButton>

                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-trash-2"
                  @click="eliminarFaq(faq.id)"
                >
                  Eliminar
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center">
          <UIcon
            name="i-lucide-book-open-text"
            class="mx-auto h-8 w-8 text-muted"
          />
          <p class="mt-3 text-sm font-medium text-highlighted">
            No hay preguntas frecuentes registradas
          </p>
          <p class="mt-1 text-sm text-muted">
            Cuando agregues FAQs, aparecerán aquí para administrarlas.
          </p>
        </div>
      </UCard>
    </section>

    <!-- Consultas -->
    <section v-else-if="tab === 'consultas'" class="space-y-4">
      <UCard class="rounded-2xl">
        <template #header>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                Consultas de usuarios
              </h2>
              <p class="text-sm text-muted">
                Últimos 100 mensajes del usuario registrados en conversaciones.
              </p>
            </div>

            <div class="w-full sm:w-80">
              <UInput
                v-model="filtroConsulta"
                icon="i-lucide-search"
                placeholder="Buscar contenido"
              />
            </div>
          </div>
        </template>

        <div v-if="loading && !consultas.length" class="space-y-3">
          <USkeleton class="h-24 w-full rounded-xl" />
          <USkeleton class="h-24 w-full rounded-xl" />
          <USkeleton class="h-24 w-full rounded-xl" />
        </div>

        <div v-else-if="consultasFiltradas.length" class="space-y-3">
          <div
            v-for="c in consultasFiltradas"
            :key="c.id"
            class="rounded-2xl border border-default bg-elevated/30 p-4"
          >
            <div
              class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
            >
              <div class="min-w-0 flex-1">
                <p class="whitespace-pre-wrap text-sm leading-6 text-default">
                  {{ c.content }}
                </p>

                <p class="mt-3 text-xs text-muted">
                  {{ formatDate(c.created_at) }}
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <UBadge
                  :color="c.was_escalated ? 'warning' : 'success'"
                  variant="soft"
                >
                  {{ c.was_escalated ? "Escalada" : "Gestionada" }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center">
          <UIcon
            name="i-lucide-messages-square"
            class="mx-auto h-8 w-8 text-muted"
          />
          <p class="mt-3 text-sm font-medium text-highlighted">
            No hay consultas registradas aún
          </p>
          <p class="mt-1 text-sm text-muted">
            Cuando existan mensajes de usuarios, aparecerán aquí.
          </p>
        </div>
      </UCard>
    </section>

    <!-- Métricas -->
    <section v-else class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UCard class="rounded-2xl text-center">
          <p class="text-sm text-muted">Total de respuestas</p>
          <p class="mt-3 text-4xl font-bold text-highlighted">
            {{ metricas.total }}
          </p>
        </UCard>

        <UCard class="rounded-2xl text-center">
          <p class="text-sm text-muted">Consultas escaladas</p>
          <p class="mt-3 text-4xl font-bold text-warning">
            {{ metricas.escaladas }}
          </p>
        </UCard>

        <UCard class="rounded-2xl text-center">
          <p class="text-sm text-muted">Tasa de resolución</p>
          <p class="mt-3 text-4xl font-bold text-success">
            {{ metricas.tasaResolucion }}%
          </p>
        </UCard>
      </div>

      <UCard class="rounded-2xl">
        <template #header>
          <div>
            <h2 class="text-base font-semibold text-highlighted">
              Lectura rápida
            </h2>
            <p class="text-sm text-muted">
              Resumen operativo del asistente para administración.
            </p>
          </div>
        </template>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-2xl border border-default bg-elevated/30 p-4">
            <p class="text-sm font-medium text-highlighted">Estado general</p>
            <p class="mt-2 text-sm text-muted">
              El módulo muestra el volumen total de respuestas emitidas por el
              asistente.
            </p>
          </div>

          <div class="rounded-2xl border border-default bg-elevated/30 p-4">
            <p class="text-sm font-medium text-highlighted">Escalamiento</p>
            <p class="mt-2 text-sm text-muted">
              Las consultas escaladas permiten detectar temas donde el asistente
              necesita apoyo humano.
            </p>
          </div>

          <div class="rounded-2xl border border-default bg-elevated/30 p-4">
            <p class="text-sm font-medium text-highlighted">Resolución</p>
            <p class="mt-2 text-sm text-muted">
              La tasa de resolución ayuda a medir cuántas respuestas no
              requirieron escalamiento.
            </p>
          </div>
        </div>
      </UCard>
    </section>
  </div>
</template>
