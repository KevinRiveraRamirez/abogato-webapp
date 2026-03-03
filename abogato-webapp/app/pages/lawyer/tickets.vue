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

async function loadTickets() {
  if (!user.value) {
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

async function setStatus(ticketId: string, status: Ticket['status']) {
  if (!user.value) return

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId)

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await loadTickets()
}

watch(user, async () => {
  errorMsg.value = ''
  tickets.value = []
  profile.value = null

  if (!user.value) return
  await loadProfile()
  await loadTickets()
}, { immediate: true })
</script>

<template>
  <div style="max-width: 900px; margin: 24px auto; padding: 16px;">
    <h1>Tickets (Abogado)</h1>

    <div v-if="!user">
      <p>Debes iniciar sesión.</p>
      <NuxtLink to="/login">Ir a login</NuxtLink>
    </div>

    <div v-else>
      <p v-if="profile">Rol actual: <b>{{ profile.role }}</b></p>

      <div v-if="profile && profile.role !== 'abogado' && profile.role !== 'admin'">
        <p>No tienes permiso para ver esta pantalla.</p>
        <NuxtLink to="/tickets">Volver</NuxtLink>
      </div>

      <div v-else>
        <button @click="loadTickets" :disabled="loading">Refrescar</button>
        <p v-if="errorMsg" style="color:#b00020">{{ errorMsg }}</p>
        <p v-if="loading">Cargando...</p>

        <div v-if="tickets.length === 0" style="margin-top: 12px;">
          <p>No tienes tickets asignados (o aún no hay).</p>
          <p style="font-size: 12px; opacity: 0.8;">
          </p>
        </div>

        <div v-else style="display:grid; gap: 12px; margin-top: 12px;">
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
                <label>
                  Cambiar estado:
                  <select
                    :value="t.status"
                    @change="(e:any) => setStatus(t.id, e.target.value)"
                    :disabled="loading"
                  >
                    <option value="open">open</option>
                    <option value="in_progress">in_progress</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                </label>
              </div>
            </div>

            <p v-if="t.description" style="margin-top: 10px;">{{ t.description }}</p>

            <div style="margin-top: 8px; font-size: 12px; opacity: 0.75;">
              created_by: {{ t.created_by }} | assigned_to: {{ t.assigned_to ?? 'null' }}
            </div>
          </div>
        </div>

        <hr style="margin: 20px 0;" />
        <NuxtLink to="/tickets">Volver a vista cliente</NuxtLink>
      </div>
    </div>
  </div>
</template>