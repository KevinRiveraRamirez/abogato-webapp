<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const { profile, cargarPerfil } = useUsuario()

type Ticket = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high'
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
}

type Historial = {
  id: string
  ticket_id: string
  changed_by: string
  old_status: string | null
  new_status: string
  notes: string | null
  created_at: string
}

const ticket = ref<Ticket | null>(null)
const historial = ref<Historial[]>([])
const loading = ref(false)
const errorMsg = ref('')

const editando = ref(false)
const editTitulo = ref('')
const editDescripcion = ref('')

const etiquetaEstado: Record<string, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado'
}

const claseEstado: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600'
}

const etiquetaPrioridad: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta'
}

const esCliente = computed(() => ticket.value?.created_by === user.value?.id)
const esAbogado = computed(() => ticket.value?.assigned_to === user.value?.id)
const esAdmin = computed(() => profile.value?.role === 'admin')

async function cargarTicket() {
  if (!user.value) return

  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', route.params.id as string)
    .maybeSingle()

  if (error || !data) {
    errorMsg.value = 'Ticket no encontrado.'
    loading.value = false
    return
  }

  const t = data as Ticket
  const tieneAcceso = t.created_by === user.value.id || t.assigned_to === user.value.id || esAdmin.value
  if (!tieneAcceso) {
    errorMsg.value = 'No tenés acceso a este ticket.'
    loading.value = false
    return
  }

  ticket.value = t
  editTitulo.value = t.title
  editDescripcion.value = t.description ?? ''

  await cargarHistorial()
  loading.value = false
}

async function cargarHistorial() {
  const { data } = await supabase
    .from('ticket_historial')
    .select('*')
    .eq('ticket_id', route.params.id as string)
    .order('created_at', { ascending: false })

  historial.value = (data ?? []) as Historial[]
}

async function guardarEdicion() {
  if (!ticket.value) return

  const titulo = editTitulo.value.trim()
  if (!titulo) { errorMsg.value = 'El título no puede estar vacío.'; return }

  loading.value = true
  const { error } = await supabase
    .from('tickets')
    .update({ title: titulo, description: editDescripcion.value.trim() || null })
    .eq('id', ticket.value.id)

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  editando.value = false
  await cargarTicket()
}

async function solicitarReapertura() {
  if (!ticket.value) return
  if (!confirm('¿Solicitar reapertura de este ticket?')) return

  loading.value = true
  const { error } = await supabase
    .from('tickets')
    .update({ status: 'open' })
    .eq('id', ticket.value.id)

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  await cargarTicket()
}

onMounted(async () => {
  await cargarPerfil()
  await cargarTicket()
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4">
    <NuxtLink to="/tickets" class="text-sm text-gray-500 hover:underline mb-6 inline-block">
      ← Volver a mis tickets
    </NuxtLink>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
      {{ errorMsg }}
    </div>

    <p v-if="loading" class="text-gray-500 text-sm">Cargando...</p>

    <div v-else-if="ticket">
      <div class="flex justify-between items-start gap-3 flex-wrap mb-4">
        <div>
          <h1 class="text-2xl font-semibold">{{ ticket.title }}</h1>
          <div class="flex gap-2 mt-2 items-center flex-wrap">
            <span class="text-xs px-2 py-0.5 rounded-full" :class="claseEstado[ticket.status]">
              {{ etiquetaEstado[ticket.status] }}
            </span>
            <span class="text-xs text-gray-500">
              Prioridad: {{ etiquetaPrioridad[ticket.priority] }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-1">
            Creado: {{ new Date(ticket.created_at).toLocaleString('es-CR') }}
          </p>
        </div>

        <div class="flex gap-2 flex-wrap">
          <button
            v-if="esCliente && ticket.status === 'open' && !editando"
            class="text-sm border px-3 py-1 rounded"
            @click="editando = true"
          >
            Editar
          </button>
          <button
            v-if="esCliente && (ticket.status === 'resolved' || ticket.status === 'closed')"
            class="text-sm border px-3 py-1 rounded"
            :disabled="loading"
            @click="solicitarReapertura"
          >
            Solicitar reapertura
          </button>
        </div>
      </div>

      <div v-if="editando" class="border rounded p-4 mb-6 bg-gray-50">
        <h2 class="font-medium mb-3">Editar ticket</h2>
        <div class="grid gap-3">
          <input
            v-model="editTitulo"
            class="border rounded px-3 py-2 w-full"
            placeholder="Título *"
          />
          <textarea
            v-model="editDescripcion"
            class="border rounded px-3 py-2 w-full"
            placeholder="Descripción"
            rows="4"
          />
          <div class="flex gap-2">
            <button
              class="bg-green-600 text-white px-4 py-2 rounded text-sm"
              :disabled="loading"
              @click="guardarEdicion"
            >
              Guardar
            </button>
            <button
              class="border px-4 py-2 rounded text-sm"
              @click="editando = false"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <div v-else class="mb-6">
        <p v-if="ticket.description" class="text-gray-700">{{ ticket.description }}</p>
        <p v-else class="text-gray-400 italic text-sm">Sin descripción.</p>
      </div>

      <div v-if="historial.length" class="mt-6">
        <h2 class="font-medium mb-3">Historial</h2>
        <div class="border-l-2 border-gray-200 pl-4 grid gap-4">
          <div v-for="h in historial" :key="h.id">
            <p class="text-sm text-gray-700">
              <span v-if="h.old_status">
                {{ etiquetaEstado[h.old_status] ?? h.old_status }} →
              </span>
              <strong>{{ etiquetaEstado[h.new_status] ?? h.new_status }}</strong>
            </p>
            <p v-if="h.notes" class="text-sm text-gray-500">{{ h.notes }}</p>
            <p class="text-xs text-gray-400">
              {{ new Date(h.created_at).toLocaleString('es-CR') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
