<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const supabase = useSupabaseClient()

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
type TicketPriority = 'low' | 'normal' | 'high'

type Ticket = {
  id: string
  title: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  created_by: string
  assigned_to: string | null
  created_at: string
  reopen_requested: boolean
}

type TicketProfile = {
  display_name: string | null
  contact_email: string | null
}

const tickets = ref<Ticket[]>([])
const loading = ref(false)
const actionLoadingId = ref<string | null>(null)
const errorMsg = ref('')
const successMsg = ref('')
const busqueda = ref('')
const filtroEstado = ref<'todos' | 'requieren_accion' | TicketStatus>('todos')
const perfiles = ref<Record<string, TicketProfile>>({})

const etiquetaEstado: Record<TicketStatus, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

const colorEstado: Record<TicketStatus, 'warning' | 'info' | 'success' | 'neutral' | 'error'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
  cancelled: 'error',
}

const etiquetaPrioridad: Record<TicketPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
}

const colorPrioridad: Record<TicketPriority, 'neutral' | 'warning' | 'error'> = {
  low: 'neutral',
  normal: 'warning',
  high: 'error',
}

const filtrosEstado = ['todos', 'requieren_accion', 'open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const

const ticketsFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return tickets.value.filter((ticket) => {
    const coincideEstado = filtroEstado.value === 'todos'
      || (filtroEstado.value === 'requieren_accion' && ticket.reopen_requested)
      || ticket.status === filtroEstado.value

    if (!coincideEstado) return false
    if (!termino) return true

    return [
      ticket.id,
      ticket.title,
      ticket.description ?? '',
      etiquetaEstado[ticket.status],
      etiquetaPrioridad[ticket.priority],
      obtenerNombre(ticket.created_by),
      obtenerNombre(ticket.assigned_to),
    ].some(value => value.toLowerCase().includes(termino))
  })
})

const resumen = computed(() => ({
  total: tickets.value.length,
  requierenAccion: tickets.value.filter(ticket => ticket.reopen_requested).length,
  abiertos: tickets.value.filter(ticket => ['open', 'in_progress'].includes(ticket.status)).length,
  cerrados: tickets.value.filter(ticket => ['closed', 'resolved', 'cancelled'].includes(ticket.status)).length,
}))

function obtenerNombre(userId: string | null) {
  if (!userId) return 'Sin asignar'

  const perfil = perfiles.value[userId]
  return perfil?.display_name || perfil?.contact_email || 'Usuario'
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function puedeCerrar(ticket: Ticket) {
  return ticket.reopen_requested || ticket.status !== 'closed'
}

function puedeReabrir(ticket: Ticket) {
  return ticket.reopen_requested || ['closed', 'resolved', 'cancelled'].includes(ticket.status)
}

async function cargarPerfilesRelacionados(ticketRows: Ticket[]) {
  const ids = [...new Set(ticketRows.flatMap(ticket => [ticket.created_by, ticket.assigned_to].filter(Boolean) as string[]))]

  if (!ids.length) {
    perfiles.value = {}
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, contact_email')
    .in('user_id', ids)

  if (error) {
    errorMsg.value = error.message
    return
  }

  perfiles.value = Object.fromEntries(
    (data ?? []).map((perfil) => [
      perfil.user_id,
      {
        display_name: perfil.display_name,
        contact_email: perfil.contact_email,
      } satisfies TicketProfile,
    ])
  )
}

async function cargarTickets() {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('tickets')
    .select('id, title, description, status, priority, created_by, assigned_to, created_at, reopen_requested')
    .order('created_at', { ascending: false })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  tickets.value = (data ?? []) as Ticket[]
  await cargarPerfilesRelacionados(tickets.value)
}

async function registrarHistorial(ticket: Ticket, nextStatus: TicketStatus, notes: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return

  await supabase.from('ticket_historial').insert([{
    ticket_id: ticket.id,
    changed_by: user.id,
    old_status: ticket.status,
    new_status: nextStatus,
    notes,
  }])
}

async function cerrarTicket(ticket: Ticket) {
  const confirmar = window.confirm(
    ticket.reopen_requested
      ? 'Esto mantendrá el ticket cerrado y rechazará la solicitud de reapertura. ¿Continuar?'
      : '¿Querés cerrar este ticket?'
  )

  if (!confirmar) return

  actionLoadingId.value = ticket.id
  errorMsg.value = ''
  successMsg.value = ''

  const payload = {
    status: 'closed' as TicketStatus,
    reopen_requested: false,
  }

  const { error } = await supabase
    .from('tickets')
    .update(payload)
    .eq('id', ticket.id)

  if (!error) {
    await registrarHistorial(
      ticket,
      'closed',
      ticket.reopen_requested
        ? 'Solicitud de reapertura rechazada por administración'
        : 'Ticket cerrado por administración'
    )
  }

  actionLoadingId.value = null

  if (error) {
    errorMsg.value = error.message
    return
  }

  successMsg.value = ticket.reopen_requested
    ? 'La solicitud de reapertura fue rechazada.'
    : 'El ticket se cerró correctamente.'
  await cargarTickets()
}

async function reabrirTicket(ticket: Ticket) {
  if (!window.confirm('¿Querés reabrir este ticket y devolverlo a estado pendiente?')) return

  actionLoadingId.value = ticket.id
  errorMsg.value = ''
  successMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .update({ status: 'open', reopen_requested: false })
    .eq('id', ticket.id)

  if (!error) {
    await registrarHistorial(ticket, 'open', 'Ticket reabierto por administración')
  }

  actionLoadingId.value = null

  if (error) {
    errorMsg.value = error.message
    return
  }

  successMsg.value = 'El ticket quedó reabierto.'
  await cargarTickets()
}

onMounted(() => {
  cargarTickets()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
          Admin
        </p>
        <h1 class="mt-2 text-3xl font-semibold text-highlighted">
          Control de tickets
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Esta vista de administración está enfocada en supervisar el flujo general: ver el detalle del caso y decidir si un ticket debe cerrarse o reabrirse.
        </p>
      </div>

      <UButton color="neutral" variant="outline" :loading="loading" @click="cargarTickets">
        Actualizar
      </UButton>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Total</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.total }}</p>
        <p class="mt-2 text-sm text-muted">Todos los tickets registrados.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-warning-600">Reaperturas</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.requierenAccion }}</p>
        <p class="mt-2 text-sm text-muted">Casos esperando decisión de admin.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">Activos</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.abiertos }}</p>
        <p class="mt-2 text-sm text-muted">Pendientes y en revisión.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Finalizados</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.cerrados }}</p>
        <p class="mt-2 text-sm text-muted">Resueltos, cerrados o cancelados.</p>
      </UCard>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
    />

    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Acción aplicada"
      :description="successMsg"
    />

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="grid gap-3 sm:max-w-md">
            <h2 class="font-semibold text-highlighted">Bandeja administrativa</h2>
            <UInput
              v-model="busqueda"
              icon="i-lucide-search"
              placeholder="Buscar por ticket, asunto, cliente o responsable"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="filtro in filtrosEstado"
              :key="filtro"
              size="sm"
              :color="filtroEstado === filtro ? 'primary' : 'neutral'"
              :variant="filtroEstado === filtro ? 'solid' : 'outline'"
              @click="filtroEstado = filtro"
            >
              {{
                filtro === 'todos'
                  ? 'Todos'
                  : filtro === 'requieren_accion'
                    ? 'Reaperturas'
                    : etiquetaEstado[filtro]
              }}
            </UButton>
          </div>
        </div>
      </template>

      <div v-if="loading" class="py-10 text-center text-sm text-muted">
        Cargando tickets...
      </div>

      <div v-else-if="!ticketsFiltrados.length" class="py-10 text-center">
        <p class="font-medium text-highlighted">No hay tickets para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Probá otro estado o una búsqueda distinta.</p>
      </div>

      <div v-else class="grid gap-4">
        <UCard
          v-for="ticket in ticketsFiltrados"
          :key="ticket.id"
          class="border border-default/80 bg-default/90 shadow-sm"
        >
          <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="colorEstado[ticket.status]" variant="subtle">
                  {{ etiquetaEstado[ticket.status] }}
                </UBadge>
                <UBadge :color="colorPrioridad[ticket.priority]" variant="outline">
                  {{ etiquetaPrioridad[ticket.priority] }}
                </UBadge>
                <UBadge v-if="ticket.reopen_requested" color="warning" variant="soft">
                  Reapertura solicitada
                </UBadge>
              </div>

              <h3 class="mt-4 text-lg font-semibold text-highlighted">
                {{ ticket.title }}
              </h3>

              <p v-if="ticket.description" class="mt-2 max-w-3xl text-sm leading-6 text-muted">
                {{ ticket.description }}
              </p>

              <div class="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2 xl:grid-cols-4">
                <p><span class="font-medium text-highlighted">Ticket:</span> #{{ String(ticket.id).slice(0, 8) }}</p>
                <p><span class="font-medium text-highlighted">Cliente:</span> {{ obtenerNombre(ticket.created_by) }}</p>
                <p><span class="font-medium text-highlighted">Responsable:</span> {{ obtenerNombre(ticket.assigned_to) }}</p>
                <p><span class="font-medium text-highlighted">Fecha:</span> {{ formatearFecha(ticket.created_at) }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 xl:justify-end">
              <UButton
                color="neutral"
                variant="outline"
                :to="`/ticket/${ticket.id}`"
              >
                Ver detalle
              </UButton>

              <UButton
                v-if="puedeReabrir(ticket)"
                color="warning"
                variant="soft"
                :loading="actionLoadingId === ticket.id"
                :disabled="actionLoadingId === ticket.id"
                @click="reabrirTicket(ticket)"
              >
                Reabrir ticket
              </UButton>

              <UButton
                v-if="puedeCerrar(ticket)"
                color="neutral"
                variant="soft"
                :loading="actionLoadingId === ticket.id"
                :disabled="actionLoadingId === ticket.id"
                @click="cerrarTicket(ticket)"
              >
                {{ ticket.reopen_requested ? 'Mantener cerrado' : 'Cerrar ticket' }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>
