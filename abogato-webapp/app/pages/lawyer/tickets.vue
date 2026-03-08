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
const loading = ref(false)
const errorMsg = ref('')
const filtroEstado = ref('todos')

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

const siguienteEstado: Partial<Record<Ticket['status'], Ticket['status']>> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed'
}

const etiquetaAccion: Partial<Record<Ticket['status'], string>> = {
  open: 'Tomar caso',
  in_progress: 'Marcar resuelto',
  resolved: 'Cerrar ticket'
}

const ticketsFiltrados = computed(() => {
  if (filtroEstado.value === 'todos') return tickets.value
  return tickets.value.filter(t => t.status === filtroEstado.value)
})

async function cargarTickets() {
  if (!user.value) return

  loading.value = true
  errorMsg.value = ''

  let query = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })

  if (profile.value?.role === 'abogado') {
    query = query.eq('assigned_to', user.value.id)
  }

  const { data, error } = await query

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  tickets.value = data ?? []
}

async function avanzarEstado(t: Ticket) {
  const siguiente = siguienteEstado[t.status]
  if (!siguiente) return

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .update({ status: siguiente })
    .eq('id', t.id)

  if (!error) {
    await supabase.from('ticket_historial').insert([{
      ticket_id: t.id,
      changed_by: user.value!.id,
      old_status: t.status,
      new_status: siguiente
    }])
  }

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  await cargarTickets()
}

onMounted(async () => {
  await cargarPerfil()
  await cargarTickets()
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">
        {{ profile?.role === 'admin' ? 'Todos los tickets' : 'Mis casos' }}
      </h1>
      <button
        class="text-sm border px-3 py-1 rounded"
        :disabled="loading"
        @click="cargarTickets"
      >
        Actualizar
      </button>
    </div>

    <div
      v-if="profile && profile.role !== 'abogado' && profile.role !== 'admin'"
      class="text-red-600"
    >
      <p>No tenés permiso para ver esta sección.</p>
      <NuxtLink to="/tickets" class="underline text-sm">Volver</NuxtLink>
    </div>

    <div v-else>
      <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
        {{ errorMsg }}
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
          class="border rounded p-4"
        >
          <div class="flex justify-between items-start gap-2 flex-wrap">
            <div>
              <p class="font-medium">{{ t.title }}</p>
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
              v-if="siguienteEstado[t.status]"
              class="bg-green-600 text-white text-sm px-3 py-1 rounded"
              :disabled="loading"
              @click="avanzarEstado(t)"
            >
              {{ etiquetaAccion[t.status] }}
            </button>

            <span v-else class="text-xs text-gray-400 self-center">
              Ticket cerrado
            </span>
          </div>

          <p v-if="t.description" class="text-sm text-gray-600 mt-2">
            {{ t.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
