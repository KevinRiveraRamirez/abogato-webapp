<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()
const tab = ref<'faq' | 'consultas' | 'metricas'>('faq')

// --- FAQ (HU-046) ---
const faqs = ref<any[]>([])
const nuevaPregunta = ref('')
const nuevaRespuesta = ref('')
const guardando = ref(false)

const cargarFaqs = async () => {
  const { data } = await supabase
    .from('faq')
    .select('*')
    .order('created_at', { ascending: false })
  faqs.value = data ?? []
}

const agregarFaq = async () => {
  if (!nuevaPregunta.value.trim() || !nuevaRespuesta.value.trim()) return
  guardando.value = true
  await supabase.from('faq').insert([{
    pregunta: nuevaPregunta.value.trim(),
    respuesta: nuevaRespuesta.value.trim(),
  }])
  nuevaPregunta.value = ''
  nuevaRespuesta.value = ''
  guardando.value = false
  await cargarFaqs()
}

const toggleFaq = async (id: string, activa: boolean) => {
  await supabase.from('faq').update({ activa: !activa }).eq('id', id)
  await cargarFaqs()
}

const eliminarFaq = async (id: string) => {
  await supabase.from('faq').delete().eq('id', id)
  await cargarFaqs()
}

// --- Consultas (HU-047) ---
const consultas = ref<any[]>([])

const cargarConsultas = async () => {
  const { data } = await supabase
    .from('ai_conversations')
    .select('id, content, was_escalated, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(100)
  consultas.value = data ?? []
}

// --- Métricas (HU-048) ---
const metricas = ref({
  total: 0,
  escaladas: 0,
  tasaResolucion: '0',
})

const cargarMetricas = async () => {
  const { data } = await supabase
    .from('ai_conversations')
    .select('was_escalated')
    .eq('role', 'assistant')

  if (!data) return
  const total = data.length
  const escaladas = data.filter(d => d.was_escalated).length
  metricas.value = {
    total,
    escaladas,
    tasaResolucion: total > 0
      ? (((total - escaladas) / total) * 100).toFixed(1)
      : '0',
  }
}

watch(tab, async (val) => {
  if (val === 'faq') await cargarFaqs()
  if (val === 'consultas') await cargarConsultas()
  if (val === 'metricas') await cargarMetricas()
}, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-4xl p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">Panel del Asistente Virtual</h1>
      <p class="mt-1 text-sm text-muted">Gestión de preguntas frecuentes, consultas y métricas</p>
    </div>

    <!-- Tabs -->
    <div class="mb-6 flex gap-2">
      <UButton
        v-for="t in [
          { key: 'faq', label: 'Preguntas Frecuentes', icon: 'i-lucide-list' },
          { key: 'consultas', label: 'Consultas', icon: 'i-lucide-message-square' },
          { key: 'metricas', label: 'Métricas', icon: 'i-lucide-bar-chart-2' },
        ]"
        :key="t.key"
        :variant="tab === t.key ? 'solid' : 'ghost'"
        :color="tab === t.key ? 'primary' : 'neutral'"
        :icon="t.icon"
        @click="tab = t.key as any"
      >
        {{ t.label }}
      </UButton>
    </div>

    <!-- FAQ (HU-046) -->
    <div v-if="tab === 'faq'" class="space-y-4">
      <UCard>
        <template #header>
          <p class="font-semibold text-highlighted">Agregar nueva pregunta frecuente</p>
        </template>
        <div class="space-y-3">
          <UInput
            v-model="nuevaPregunta"
            placeholder="Pregunta frecuente..."
            size="md"
          />
          <UTextarea
            v-model="nuevaRespuesta"
            placeholder="Respuesta..."
            :rows="3"
          />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            :loading="guardando"
            :disabled="!nuevaPregunta.trim() || !nuevaRespuesta.trim()"
            @click="agregarFaq"
          >
            Agregar
          </UButton>
        </div>
      </UCard>

      <UCard v-for="faq in faqs" :key="faq.id">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <p class="font-medium text-highlighted">{{ faq.pregunta }}</p>
            <p class="mt-1 text-sm text-muted">{{ faq.respuesta }}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <UBadge
              :color="faq.activa ? 'success' : 'neutral'"
              variant="soft"
              class="cursor-pointer"
              @click="toggleFaq(faq.id, faq.activa)"
            >
              {{ faq.activa ? 'Activa' : 'Inactiva' }}
            </UBadge>
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="xs"
              @click="eliminarFaq(faq.id)"
            />
          </div>
        </div>
      </UCard>

      <p v-if="faqs.length === 0" class="text-center text-sm text-muted py-8">
        No hay preguntas frecuentes registradas.
      </p>
    </div>

    <!-- Consultas (HU-047) -->
    <div v-if="tab === 'consultas'" class="space-y-3">
      <UCard v-for="c in consultas" :key="c.id">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm text-default">{{ c.content }}</p>
          <div class="flex gap-2 shrink-0 items-center">
            <UBadge v-if="c.was_escalated" color="warning" variant="soft">
              Escalada
            </UBadge>
            <span class="text-xs text-muted whitespace-nowrap">
              {{ new Date(c.created_at).toLocaleDateString('es-CR') }}
            </span>
          </div>
        </div>
      </UCard>
      <p v-if="consultas.length === 0" class="text-center text-sm text-muted py-8">
        No hay consultas registradas aún.
      </p>
    </div>

    <!-- Métricas (HU-048) -->
    <div v-if="tab === 'metricas'" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <UCard class="text-center">
        <p class="text-4xl font-bold text-highlighted">{{ metricas.total }}</p>
        <p class="mt-2 text-sm text-muted">Total de respuestas</p>
      </UCard>
      <UCard class="text-center">
        <p class="text-4xl font-bold text-warning">{{ metricas.escaladas }}</p>
        <p class="mt-2 text-sm text-muted">Consultas escaladas</p>
      </UCard>
      <UCard class="text-center">
        <p class="text-4xl font-bold text-success">{{ metricas.tasaResolucion }}%</p>
        <p class="mt-2 text-sm text-muted">Tasa de resolución</p>
      </UCard>
    </div>
  </div>
</template>