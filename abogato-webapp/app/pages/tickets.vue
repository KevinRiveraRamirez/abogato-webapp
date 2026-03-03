<!-- /pages/tickets.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

type Profile = {
  user_id: string
  role: 'cliente' | 'abogado' | 'admin'
  display_name?: string | null
}

type Ticket = {
  id: string
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high'
  created_at: string
  updated_at: string
}

const profile = ref<Profile | null>(null)
const tickets = ref<Ticket[]>([])
const loading = ref(false)
const errorMsg = ref('')

// Form crear
const title = ref('')
const description = ref('')
const priority = ref<'low' | 'normal' | 'high'>('normal')

//  asignar  abogado
const lawyers = ref<{ user_id: string; display_name: string | null }[]>([])

const assignedTo = ref<string>('') // '' => null

function uuidOrNull(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const v = input.trim()
  if (!v || v === 'undefined' || v === 'null') return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(v) ? v : null
}

function requireAuth(): boolean {
  if (!user.value) {
    errorMsg.value = 'Debes iniciar sesión.'
    return false
  }
  return true
}

async function loadProfile() {
  if (!user.value) {
    profile.value = null
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, role, display_name')
    .eq('user_id', user.value.id)
    .maybeSingle()

  if (error) {
    errorMsg.value = error.message
    profile.value = null
    return
  }

  profile.value = data ?? null
}

async function loadLawyers() {
  if (!requireAuth()) return

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, role')
    .eq('role', 'abogado')

  if (error) {
    console.warn('loadLawyers error:', error.message)
    lawyers.value = []
    return
  }

  lawyers.value = (data ?? []).map((x: any) => ({
    user_id: x.user_id,
    display_name: x.display_name ?? null
  }))
}

async function loadTickets() {
  if (!requireAuth()) {
    tickets.value = []
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    tickets.value = []
    return
  }

  tickets.value = data ?? []
}

async function createTicket() {
  if (!requireAuth()) return
  if (!profile.value) {
    errorMsg.value = 'No tienes perfil configurado.'
    return
  }
  if (profile.value.role !== 'cliente' && profile.value.role !== 'admin') {
    errorMsg.value = 'Solo un cliente puede crear tickets en esta pantalla.'
    return
  }

  const t = title.value.trim()
  if (!t) return

  loading.value = true
  errorMsg.value = ''

  const safeAssignedTo = uuidOrNull(assignedTo.value)

  const payload = {
    created_by: user.value!.id,         
    assigned_to: safeAssignedTo,        
    title: t,
    description: description.value.trim() || null,
    priority: priority.value
  }

  const { error } = await supabase.from('tickets').insert([payload])

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  title.value = ''
  description.value = ''
  priority.value = 'normal'
  assignedTo.value = '' 

  await loadTickets()
}

async function updateTicket(ticketId: unknown, patch: Partial<Ticket>) {
  if (!requireAuth()) return

  const safeId = uuidOrNull(ticketId)
  if (!safeId) {
    errorMsg.value = 'ID de ticket inválido.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .update(patch)
    .eq('id', safeId)

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await loadTickets()
}

async function deleteTicket(ticketId: unknown) {
  if (!requireAuth()) return

  const safeId = uuidOrNull(ticketId)
  if (!safeId) {
    errorMsg.value = 'ID de ticket inválido.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', safeId)

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await loadTickets()
}

watch(
  user,
  async () => {
    errorMsg.value = ''
    tickets.value = []
    profile.value = null
    lawyers.value = []
    assignedTo.value = ''

    if (!user.value) return

    await loadProfile()
    await loadLawyers()
    await loadTickets()
  },
  { immediate: true }
)
</script>

<template>
  <div style="max-width: 900px; margin: 24px auto; padding: 16px;">
    <h1>Tickets (Cliente)</h1>

    <div v-if="!user" style="margin-top: 12px;">
      <p>Debes iniciar sesión para ver tus tickets.</p>
      <NuxtLink to="/login">Ir a login</NuxtLink>
    </div>

    <div v-else>
      <p v-if="profile">Rol actual: <b>{{ profile.role }}</b></p>

      <div style="margin: 16px 0; padding: 12px; border: 1px solid #ddd;">
        <h2>Crear ticket</h2>

        <div style="display:grid; gap: 8px;">
          <input v-model="title" placeholder="Título" />
          <textarea v-model="description" placeholder="Descripción" rows="3" />

          <div style="display:flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <label>
              Prioridad:
              <select v-model="priority">
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
              </select>
            </label>

            <label>
              Asignar a abogado (opcional):
              <select v-model="assignedTo">
                <option value="">Sin asignar</option>
                <option v-for="l in lawyers" :key="l.user_id" :value="l.user_id">
                  {{ l.display_name ?? l.user_id }}
                </option>
              </select>
            </label>

            <button @click="createTicket" :disabled="loading">Crear</button>
            <button @click="loadTickets" :disabled="loading">Refrescar</button>
          </div>
        </div>
      </div>

      <p v-if="errorMsg" style="color:#b00020">{{ errorMsg }}</p>
      <p v-if="loading">Cargando...</p>

      <h2>Mis tickets</h2>

      <div v-if="tickets.length === 0">
        <p>No tienes tickets todavía.</p>
      </div>

      <div v-else style="display:grid; gap: 12px;">
        <div v-for="t in tickets" :key="t.id" style="border: 1px solid #ddd; padding: 12px;">
          <div style="display:flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div>
              <b>{{ t.title }}</b>
              <div style="font-size: 12px; opacity: 0.8;">
                Estado: {{ t.status }} | Prioridad: {{ t.priority }}
              </div>
              <div style="font-size: 12px; opacity: 0.8;">
                Creado: {{ new Date(t.created_at).toLocaleString() }}
              </div>
            </div>

            <div style="display:flex; gap: 8px; align-items: center;">
              <button
                @click="deleteTicket(t.id)"
                :disabled="loading"
                title="Solo permite borrar si status=open (por policy)"
              >
                Borrar
              </button>
            </div>
          </div>

          <p v-if="t.description" style="margin-top: 10px;">{{ t.description }}</p>

          <div style="margin-top: 12px; display:flex; gap: 8px; flex-wrap: wrap;">
            <button
              @click="updateTicket(t.id, { title: t.title + ' (editado)' })"
              :disabled="loading"
              title="Cliente solo puede editar si status=open"
            >
              Editar título (demo)
            </button>

            <button
              @click="updateTicket(t.id, { description: (t.description ?? '') + ' [nota]' })"
              :disabled="loading"
              title="Cliente solo puede editar si status=open"
            >
              Editar descripción (demo)
            </button>
          </div>

          <div style="margin-top: 8px; font-size: 12px; opacity: 0.75;">
            assigned_to: {{ t.assigned_to ?? 'null' }}
          </div>
        </div>
      </div>

      <hr style="margin: 20px 0;" />
      <NuxtLink to="/lawyer/tickets">Ir a vista abogado</NuxtLink>
    </div>
  </div>
</template>