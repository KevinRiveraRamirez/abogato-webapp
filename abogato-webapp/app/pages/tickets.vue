<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
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
}

const tickets = ref<Ticket[]>([])
const abogados = ref<{ user_id: string; display_name: string | null }[]>([])

const loading = ref(false)
const errorMsg = ref('')
const filtroEstado = ref('todos')
const mostrarFormulario = ref(false)

const nuevoTitulo = ref('')
const nuevaDescripcion = ref('')
const nuevaPrioridad = ref<'low' | 'normal' | 'high'>('normal')
const nuevoAbogado = ref('')

const etiquetaEstado: Record<string, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado'
}

const etiquetaPrioridad: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta'
}

const claseEstado: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600'
}

const ticketsFiltrados = computed(() => {
  if (filtroEstado.value === 'todos') return tickets.value
  return tickets.value.filter(t => t.status === filtroEstado.value)
})

async function cargarAbogados() {
  const { data } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('role', 'abogado')

  abogados.value = data ?? []
}

async function cargarTickets() {
  if (!user.value) return

  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('created_by', user.value.id)
    .order('created_at', { ascending: false })

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  tickets.value = data ?? []
}

async function abogadoMenosCargado(): Promise<string | null> {
  if (!abogados.value.length) return null

  const { data } = await supabase
    .from('tickets')
    .select('assigned_to')
    .in('status', ['open', 'in_progress'])
    .not('assigned_to', 'is', null)

  const conteo = new Map(abogados.value.map(a => [a.user_id, 0]))
  data?.forEach(t => {
    if (t.assigned_to && conteo.has(t.assigned_to)) {
      conteo.set(t.assigned_to, (conteo.get(t.assigned_to) ?? 0) + 1)
    }
  })

  return [...conteo.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null
}

async function crearTicket() {
  if (!user.value) return

  const titulo = nuevoTitulo.value.trim()
  if (!titulo) { errorMsg.value = 'El título es obligatorio.'; return }

  loading.value = true
  errorMsg.value = ''

  const assignedTo = nuevoAbogado.value || await abogadoMenosCargado()

  const { error } = await supabase.from('tickets').insert([{
    created_by: user.value.id,
    assigned_to: assignedTo || null,
    title: titulo,
    description: nuevaDescripcion.value.trim() || null,
    priority: nuevaPrioridad.value
  }])

  loading.value = false

  if (error) { errorMsg.value = error.message; return }

  nuevoTitulo.value = ''
  nuevaDescripcion.value = ''
  nuevaPrioridad.value = 'normal'
  nuevoAbogado.value = ''
  mostrarFormulario.value = false

  await cargarTickets()
}

async function eliminarTicket(id: string) {
  if (!confirm('¿Eliminar este ticket?')) return

  loading.value = true
  const { error } = await supabase.from('tickets').delete().eq('id', id)
  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  await cargarTickets()
}

onMounted(async () => {
  await cargarPerfil()
  await Promise.all([cargarAbogados(), cargarTickets()])
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Mis tickets</h1>
      <button
        class="bg-green-600 text-white px-4 py-2 rounded text-sm"
        @click="mostrarFormulario = !mostrarFormulario"
      >
        {{ mostrarFormulario ? 'Cancelar' : 'Nuevo ticket' }}
      </button>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
      {{ errorMsg }}
    </div>

    <div v-if="mostrarFormulario" class="border rounded p-4 mb-6 bg-gray-50">
      <h2 class="font-medium mb-3">Crear ticket</h2>
      <div class="grid gap-3">
        <input
          v-model="nuevoTitulo"
          class="border rounded px-3 py-2 w-full"
          placeholder="Título *"
        />
        <textarea
          v-model="nuevaDescripcion"
          class="border rounded px-3 py-2 w-full"
          placeholder="Descripción"
          rows="3"
        />
        <div class="flex gap-4 flex-wrap">
          <label class="flex items-center gap-2 text-sm">
            Prioridad:
            <select v-model="nuevaPrioridad" class="border rounded px-2 py-1">
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-sm">
            Abogado:
            <select v-model="nuevoAbogado" class="border rounded px-2 py-1">
              <option value="">Asignar automáticamente</option>
              <option v-for="a in abogados" :key="a.user_id" :value="a.user_id">
                {{ a.display_name ?? 'Abogado' }}
              </option>
            </select>
          </label>
        </div>
        <button
          class="bg-green-600 text-white px-4 py-2 rounded w-fit text-sm"
          :disabled="loading"
          @click="crearTicket"
        >
          Crear
        </button>
      </div>
    </div>

    <div class="flex gap-2 flex-wrap mb-4">
      <button
        v-for="f in ['todos', 'open', 'in_progress', 'resolved', 'closed']"
        :key="f"
        class="px-3 py-1 rounded border text-sm"
        :class="filtroEstado === f ? 'bg-green-600 text-white border-green-600' : 'border-gray-300'"
        @click="filtroEstado = f"
      >
        {{ f === 'todos' ? 'Todos' : etiquetaEstado[f] }}
      </button>
    </div>

    <p v-if="loading" class="text-gray-500 text-sm">Cargando...</p>

    <div v-else-if="ticketsFiltrados.length === 0" class="text-center py-10 text-gray-400">
      <p>No hay tickets{{ filtroEstado !== 'todos' ? ' con ese estado' : '' }}.</p>
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="t in ticketsFiltrados"
        :key="t.id"
        class="border rounded p-4 hover:shadow-sm transition-shadow"
      >
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <NuxtLink :to="`/ticket/${t.id}`" class="font-medium hover:underline">
              {{ t.title }}
            </NuxtLink>
            <div class="flex gap-2 mt-1 flex-wrap items-center">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="claseEstado[t.status]">
                {{ etiquetaEstado[t.status] }}
              </span>
              <span class="text-xs text-gray-500">
                Prioridad: {{ etiquetaPrioridad[t.priority] }}
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-1">
              {{ new Date(t.created_at).toLocaleDateString('es-CR') }}
            </p>
          </div>

          <button
            v-if="t.status === 'open'"
            class="text-sm text-red-500 hover:underline"
            :disabled="loading"
            @click="eliminarTicket(t.id)"
          >
            Eliminar
          </button>
        </div>

        <p v-if="t.description" class="text-sm text-gray-600 mt-2">{{ t.description }}</p>
      </div>
    </div>
  </div>
</template>
