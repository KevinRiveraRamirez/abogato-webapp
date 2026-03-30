<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const supabase = useSupabaseClient()
const { adminFetch } = useAdminApi()

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

type LawyerProfile = {
  user_id: string
  display_name: string | null
  contact_email: string | null
}

type TicketAssignmentSource = 'auto' | 'manual' | 'self' | 'unassigned'

type AssignmentHistoryEntry = {
  id: string
  previous_assigned_to: string | null
  previous_assigned_to_name: string
  assigned_to: string | null
  assigned_to_name: string
  assigned_by: string | null
  assigned_by_name: string
  assignment_source: TicketAssignmentSource
  notes: string | null
  created_at: string
}

type AssignmentHistoryResponse = {
  items: AssignmentHistoryEntry[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

const SIN_ABOGADO_VALUE = '__unassigned__'
const HISTORIAL_ASIGNACION_POR_PAGINA = 5

const tickets = ref<Ticket[]>([])
const abogados = ref<LawyerProfile[]>([])
const loading = ref(false)
const actionLoadingId = ref<string | null>(null)
const asignacionLoadingId = ref<string | null>(null)
const errorMsg = ref('')
const successMsg = ref('')
const busqueda = ref('')
const filtrosEstadoSeleccionados = ref<Array<'requieren_accion' | TicketStatus>>([])
const perfiles = ref<Record<string, TicketProfile>>({})
const asignacionSeleccionada = ref<Record<string, string>>({})
const ticketExpandido = ref<string | null>(null)
const paginaActual = ref(1)
const cantidadPorPagina = ref(10)
const historialAsignacionPorTicket = ref<Record<string, AssignmentHistoryEntry[]>>({})
const historialAsignacionLoadingPorTicket = ref<Record<string, boolean>>({})
const historialAsignacionErrorPorTicket = ref<Record<string, string>>({})
const historialAsignacionPaginaPorTicket = ref<Record<string, number>>({})
const historialAsignacionTotalPorTicket = ref<Record<string, number>>({})

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

const filtrosEstado = ['requieren_accion', 'open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const
const etiquetaFuenteAsignacion: Record<TicketAssignmentSource, string> = {
  auto: 'Autoasignación',
  manual: 'Gestión admin',
  self: 'Tomado por abogado',
  unassigned: 'Sin responsable',
}

const colorFuenteAsignacion: Record<TicketAssignmentSource, 'primary' | 'neutral' | 'info' | 'warning'> = {
  auto: 'primary',
  manual: 'neutral',
  self: 'info',
  unassigned: 'warning',
}

const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

const ticketsFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return tickets.value.filter((ticket) => {
    const coincideEstado = !filtrosEstadoSeleccionados.value.length
      || (filtrosEstadoSeleccionados.value.includes('requieren_accion') && ticket.reopen_requested)
      || filtrosEstadoSeleccionados.value.includes(ticket.status)

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

const totalTicketsFiltrados = computed(() => ticketsFiltrados.value.length)

const totalPaginas = computed(() => {
  return Math.max(1, Math.ceil(totalTicketsFiltrados.value / cantidadPorPagina.value))
})

const ticketsPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value
  return ticketsFiltrados.value.slice(inicio, inicio + cantidadPorPagina.value)
})

const resumenPaginacion = computed(() => {
  if (!totalTicketsFiltrados.value) {
    return { inicio: 0, fin: 0 }
  }

  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value + 1
  const fin = Math.min(inicio + cantidadPorPagina.value - 1, totalTicketsFiltrados.value)

  return { inicio, fin }
})

const resumen = computed(() => ({
  total: tickets.value.length,
  requierenAccion: tickets.value.filter(ticket => ticket.reopen_requested).length,
  abiertos: tickets.value.filter(ticket => ['open', 'in_progress'].includes(ticket.status)).length,
  cerrados: tickets.value.filter(ticket => ['closed', 'resolved', 'cancelled'].includes(ticket.status)).length,
}))

const hayFiltrosActivos = computed(() =>
  Boolean(busqueda.value.trim())
  || filtrosEstadoSeleccionados.value.length > 0
)

const filtrosAplicadosCount = computed(() =>
  filtrosEstadoSeleccionados.value.length
)

const opcionesAbogados = computed(() => {
  const opciones = new Map<string, string>()

  abogados.value.forEach((abogado) => {
    opciones.set(
      abogado.user_id,
      abogado.display_name || abogado.contact_email || 'Abogado'
    )
  })

  tickets.value.forEach((ticket) => {
    if (ticket.assigned_to && !opciones.has(ticket.assigned_to)) {
      opciones.set(ticket.assigned_to, obtenerNombre(ticket.assigned_to))
    }
  })

  return [
    { label: 'Sin asignar', value: SIN_ABOGADO_VALUE },
    ...Array.from(opciones.entries()).map(([value, label]) => ({
      label,
      value,
    })),
  ]
})

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

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizarValorAsignacion(userId: string | null | undefined) {
  return userId ?? SIN_ABOGADO_VALUE
}

function obtenerAssignedToDesdeValor(value: string) {
  return value === SIN_ABOGADO_VALUE ? null : value
}

function sincronizarAsignaciones(ticketRows: Ticket[]) {
  asignacionSeleccionada.value = Object.fromEntries(
    ticketRows.map(ticket => [ticket.id, normalizarValorAsignacion(ticket.assigned_to)])
  )
}

function obtenerValorAsignacion(ticket: Ticket) {
  return asignacionSeleccionada.value[ticket.id] ?? normalizarValorAsignacion(ticket.assigned_to)
}

function actualizarSeleccionAsignacion(ticketId: string, value: string) {
  asignacionSeleccionada.value = {
    ...asignacionSeleccionada.value,
    [ticketId]: value,
  }
}

function hayCambioAsignacion(ticket: Ticket) {
  return obtenerAssignedToDesdeValor(obtenerValorAsignacion(ticket)) !== ticket.assigned_to
}

function actualizarFilaExpandida(ticketId: string, open: boolean) {
  ticketExpandido.value = open ? ticketId : ticketExpandido.value === ticketId ? null : ticketExpandido.value

  if (open) {
    void cargarHistorialAsignacion(ticketId, obtenerPaginaHistorialAsignacion(ticketId))
  }
}

function limpiarFiltros() {
  busqueda.value = ''
  filtrosEstadoSeleccionados.value = []
}

function toggleFiltroEstado(estado: (typeof filtrosEstado)[number]) {
  filtrosEstadoSeleccionados.value = filtrosEstadoSeleccionados.value.includes(estado)
    ? filtrosEstadoSeleccionados.value.filter(item => item !== estado)
    : [...filtrosEstadoSeleccionados.value, estado]
}

function puedeCerrar(ticket: Ticket) {
  return ticket.reopen_requested || ticket.status !== 'closed'
}

function puedeReabrir(ticket: Ticket) {
  return ticket.reopen_requested || ['closed', 'resolved', 'cancelled'].includes(ticket.status)
}

function obtenerMensajeError(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudo cargar el historial solicitado.'
}

function obtenerPaginaHistorialAsignacion(ticketId: string) {
  return historialAsignacionPaginaPorTicket.value[ticketId] ?? 1
}

function obtenerTotalHistorialAsignacion(ticketId: string) {
  return historialAsignacionTotalPorTicket.value[ticketId] ?? 0
}

function obtenerEntradasHistorialAsignacion(ticketId: string) {
  return historialAsignacionPorTicket.value[ticketId] ?? []
}

function obtenerErrorHistorialAsignacion(ticketId: string) {
  return historialAsignacionErrorPorTicket.value[ticketId] ?? ''
}

function obtenerTotalPaginasHistorialAsignacion(ticketId: string) {
  return Math.max(1, Math.ceil(obtenerTotalHistorialAsignacion(ticketId) / HISTORIAL_ASIGNACION_POR_PAGINA))
}

async function cargarHistorialAsignacion(ticketId: string, page = 1) {
  historialAsignacionLoadingPorTicket.value = {
    ...historialAsignacionLoadingPorTicket.value,
    [ticketId]: true,
  }
  historialAsignacionErrorPorTicket.value = {
    ...historialAsignacionErrorPorTicket.value,
    [ticketId]: '',
  }

  try {
    const response = await adminFetch<AssignmentHistoryResponse>(`/api/admin/tickets/${ticketId}/assignment-history`, {
      query: {
        page,
        perPage: HISTORIAL_ASIGNACION_POR_PAGINA,
      },
    })

    historialAsignacionPorTicket.value = {
      ...historialAsignacionPorTicket.value,
      [ticketId]: response.items,
    }
    historialAsignacionPaginaPorTicket.value = {
      ...historialAsignacionPaginaPorTicket.value,
      [ticketId]: response.page,
    }
    historialAsignacionTotalPorTicket.value = {
      ...historialAsignacionTotalPorTicket.value,
      [ticketId]: response.total,
    }
  } catch (error) {
    historialAsignacionErrorPorTicket.value = {
      ...historialAsignacionErrorPorTicket.value,
      [ticketId]: obtenerMensajeError(error),
    }
  } finally {
    historialAsignacionLoadingPorTicket.value = {
      ...historialAsignacionLoadingPorTicket.value,
      [ticketId]: false,
    }
  }
}

function cambiarPaginaHistorialAsignacion(ticketId: string, page: number) {
  void cargarHistorialAsignacion(ticketId, page)
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

async function cargarAbogados() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, contact_email')
    .eq('role', 'abogado')
    .eq('is_active', true)
    .order('display_name', { ascending: true })

  if (error) {
    errorMsg.value = error.message
    return
  }

  abogados.value = (data ?? []) as LawyerProfile[]
}

async function cargarBandeja() {
  await Promise.all([cargarTickets(), cargarAbogados()])
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
  sincronizarAsignaciones(tickets.value)
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
  if (ticketExpandido.value === ticket.id) {
    await cargarHistorialAsignacion(ticket.id, obtenerPaginaHistorialAsignacion(ticket.id))
  }
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
  if (ticketExpandido.value === ticket.id) {
    await cargarHistorialAsignacion(ticket.id, obtenerPaginaHistorialAsignacion(ticket.id))
  }
}

async function guardarAsignacion(ticket: Ticket) {
  const assignedTo = obtenerAssignedToDesdeValor(obtenerValorAsignacion(ticket))

  if (assignedTo === ticket.assigned_to) {
    return
  }

  asignacionLoadingId.value = ticket.id
  errorMsg.value = ''
  successMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .update({ assigned_to: assignedTo })
    .eq('id', ticket.id)

  asignacionLoadingId.value = null

  if (error) {
    errorMsg.value = error.message
    return
  }

  successMsg.value = assignedTo
    ? 'La asignación del ticket se actualizó correctamente.'
    : 'El ticket quedó sin responsable asignado.'
  await cargarTickets()
  if (ticketExpandido.value === ticket.id) {
    await cargarHistorialAsignacion(ticket.id, obtenerPaginaHistorialAsignacion(ticket.id))
  }
}

watch([busqueda, filtrosEstadoSeleccionados, cantidadPorPagina], () => {
  paginaActual.value = 1
  ticketExpandido.value = null
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

watch(ticketsPaginados, (lista) => {
  if (!ticketExpandido.value) return

  const sigueVisible = lista.some(ticket => ticket.id === ticketExpandido.value)
  if (!sigueVisible) ticketExpandido.value = null
})

onMounted(() => {
  void cargarBandeja()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <AppPageHeader
      eyebrow="Admin"
      title="Control de tickets"
      description="Esta vista de administración está enfocada en supervisar el flujo general: ver el detalle del caso y decidir si un ticket debe cerrarse o reabrirse."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :loading="loading" @click="cargarBandeja">
          Actualizar
        </UButton>
      </template>
    </AppPageHeader>

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
        <AppFilterToolbar
          v-model:search-term="busqueda"
          v-model:per-page="cantidadPorPagina"
          title="Bandeja administrativa"
          search-placeholder="Buscar por ticket, asunto, cliente o responsable"
          :results-label="`Mostrando ${resumenPaginacion.inicio}-${resumenPaginacion.fin} de ${totalTicketsFiltrados}`"
          :per-page-options="opcionesCantidadPorPagina"
          :has-active-filters="hayFiltrosActivos"
          :active-filter-count="filtrosAplicadosCount"
          @clear-filters="limpiarFiltros"
        >
          <template #filters>
            <div class="grid gap-2">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Estado del caso</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  :color="filtrosEstadoSeleccionados.length === 0 ? 'primary' : 'neutral'"
                  :variant="filtrosEstadoSeleccionados.length === 0 ? 'solid' : 'outline'"
                  @click="filtrosEstadoSeleccionados = []"
                >
                  Todos
                </UButton>

                <UButton
                  v-for="filtro in filtrosEstado"
                  :key="filtro"
                  size="sm"
                  :color="filtrosEstadoSeleccionados.includes(filtro) ? 'primary' : 'neutral'"
                  :variant="filtrosEstadoSeleccionados.includes(filtro) ? 'solid' : 'outline'"
                  @click="toggleFiltroEstado(filtro)"
                >
                  {{
                    filtro === 'requieren_accion'
                      ? 'Reaperturas'
                      : etiquetaEstado[filtro]
                  }}
                </UButton>
              </div>
            </div>
          </template>
        </AppFilterToolbar>
      </template>

      <SkeletonListCards v-if="loading && !tickets.length" :items="4" />

      <div v-else-if="!ticketsFiltrados.length" class="py-10 text-center">
        <p class="font-medium text-highlighted">No hay tickets para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Probá otro estado o una búsqueda distinta.</p>
      </div>

      <div
        v-else
        class="overflow-hidden rounded-[1.75rem] border border-default/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.3)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"
      >
        <div class="max-lg:overflow-visible lg:overflow-x-auto lg:pb-1 [scrollbar-gutter:stable_both-edges]">
          <div class="w-full lg:min-w-[60rem]">
            <div class="hidden grid-cols-[10rem_minmax(16rem,1.8fr)_minmax(11rem,1.1fr)_11rem_9rem] gap-4 border-b border-default/70 bg-elevated/70 py-4 pl-5 pr-9 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted lg:grid sm:pr-10">
              <p>Ticket</p>
              <p>Caso</p>
              <p>Cliente</p>
              <p>Estado</p>
              <p>Fecha</p>
            </div>

            <div class="divide-y divide-default/60">
              <UCollapsible
                v-for="ticket in ticketsPaginados"
                :key="ticket.id"
                :open="ticketExpandido === ticket.id"
                :unmount-on-hide="false"
                @update:open="(open) => actualizarFilaExpandida(ticket.id, open)"
              >
                <template #default="{ open }">
                  <button
                    type="button"
                    class="grid w-full min-w-0 grid-cols-1 gap-3 px-4 py-4 text-left transition hover:bg-primary/5 lg:grid-cols-[10rem_minmax(16rem,1.8fr)_minmax(11rem,1.1fr)_11rem_9rem] lg:gap-4 lg:py-4 lg:pl-5 lg:pr-10"
                    :class="[
                      open ? 'bg-primary/6' : '',
                      ticket.reopen_requested ? 'bg-warning/5 hover:bg-warning/8' : ''
                    ]"
                    :aria-label="open ? `Minimizar ticket ${ticket.id}` : `Expandir ticket ${ticket.id}`"
                  >
                    <div class="min-w-0">
                      <p class="font-semibold text-highlighted">
                        #{{ String(ticket.id).slice(0, 8) }}
                      </p>
                      <p class="mt-1 text-xs text-muted">
                        {{ ticket.reopen_requested ? 'Reapertura pendiente' : 'Seguimiento administrativo' }}
                      </p>
                    </div>

                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="truncate font-medium text-highlighted">
                          {{ ticket.title }}
                        </p>
                        <UBadge :color="colorPrioridad[ticket.priority]" variant="outline" size="sm">
                          {{ etiquetaPrioridad[ticket.priority] }}
                        </UBadge>
                      </div>
                      <p class="mt-1 line-clamp-2 text-xs text-muted">
                        {{ ticket.description || 'Sin descripción adicional.' }}
                      </p>
                    </div>

                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-highlighted">
                        {{ obtenerNombre(ticket.created_by) }}
                      </p>
                      <p class="mt-1 truncate text-xs text-muted">
                        Solicitante del caso
                      </p>
                    </div>

                    <div class="flex min-w-0 flex-col gap-2">
                      <UBadge :color="colorEstado[ticket.status]" variant="subtle">
                        {{ etiquetaEstado[ticket.status] }}
                      </UBadge>
                      <UBadge v-if="ticket.reopen_requested" color="warning" variant="soft">
                        Reapertura solicitada
                      </UBadge>
                    </div>

                    <div class="text-sm text-muted lg:whitespace-nowrap">
                      {{ formatearFecha(ticket.created_at) }}
                    </div>
                  </button>
                </template>

                <template #content>
                  <div class="border-t border-default/60 bg-elevated/35 px-4 py-4 sm:px-5 sm:py-5">
                    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                      <div class="grid gap-4 md:grid-cols-2">
                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Estado</p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <UBadge :color="colorEstado[ticket.status]" variant="subtle">
                              {{ etiquetaEstado[ticket.status] }}
                            </UBadge>
                            <UBadge :color="colorPrioridad[ticket.priority]" variant="outline">
                              {{ etiquetaPrioridad[ticket.priority] }}
                            </UBadge>
                          </div>
                          <p class="mt-3 text-sm text-muted">
                            {{
                              ticket.reopen_requested
                                ? 'Este ticket está esperando una decisión administrativa sobre la reapertura.'
                                : 'Estado actual del caso dentro del flujo interno.'
                            }}
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Participantes</p>
                          <p class="mt-2 text-sm font-medium text-highlighted">
                            Cliente: {{ obtenerNombre(ticket.created_by) }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            Responsable: {{ obtenerNombre(ticket.assigned_to) }}
                          </p>
                          <p class="mt-3 text-xs text-muted">
                            Alta {{ formatearFecha(ticket.created_at) }}
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm md:col-span-2">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Descripción</p>
                          <p class="mt-2 text-sm leading-6 text-muted">
                            {{ ticket.description || 'Este ticket no tiene descripción adicional registrada.' }}
                          </p>
                        </div>
                      </div>

                      <div class="grid gap-3 rounded-[1.5rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Acciones rápidas</p>
                          <p class="mt-2 text-sm text-muted">
                            Revisá el detalle completo, reasigná responsable y decidí si el caso debe mantenerse cerrado o volver a abrirse.
                          </p>
                        </div>

                        <UButton
                          color="neutral"
                          variant="outline"
                          class="justify-center"
                          :to="`/ticket/${ticket.id}`"
                        >
                          Ver detalle
                        </UButton>

                        <UFormField label="Responsable">
                          <USelect
                            :model-value="obtenerValorAsignacion(ticket)"
                            value-key="value"
                            :items="opcionesAbogados"
                            :disabled="asignacionLoadingId === ticket.id"
                            @update:model-value="(value) => actualizarSeleccionAsignacion(ticket.id, value as string)"
                          />
                        </UFormField>

                        <UButton
                          color="primary"
                          variant="soft"
                          class="justify-center"
                          :loading="asignacionLoadingId === ticket.id"
                          :disabled="asignacionLoadingId === ticket.id || !hayCambioAsignacion(ticket)"
                          @click="guardarAsignacion(ticket)"
                        >
                          Guardar asignación
                        </UButton>

                        <UButton
                          v-if="puedeReabrir(ticket)"
                          color="warning"
                          variant="soft"
                          :loading="actionLoadingId === ticket.id"
                          :disabled="actionLoadingId === ticket.id"
                          class="justify-center"
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
                          class="justify-center"
                          @click="cerrarTicket(ticket)"
                        >
                          {{ ticket.reopen_requested ? 'Mantener cerrado' : 'Cerrar ticket' }}
                        </UButton>

                        <p class="text-xs text-muted">
                          Solo se notifica a las personas involucradas cuando cambia la asignación.
                        </p>
                      </div>
                    </div>

                    <div class="mt-4 rounded-[1.5rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Historial de asignación</p>
                          <p class="mt-2 text-sm text-muted">
                            Trazabilidad de autoasignaciones, tomas manuales y reasignaciones administrativas.
                          </p>
                        </div>

                        <UBadge color="neutral" variant="outline">
                          {{ obtenerTotalHistorialAsignacion(ticket.id) }} movimiento(s)
                        </UBadge>
                      </div>

                      <div v-if="historialAsignacionLoadingPorTicket[ticket.id] && !obtenerEntradasHistorialAsignacion(ticket.id).length" class="mt-4 rounded-2xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
                        Cargando historial de asignación...
                      </div>

                      <div v-else-if="obtenerErrorHistorialAsignacion(ticket.id)" class="mt-4 rounded-2xl border border-error/20 bg-error/5 px-4 py-4 text-sm text-error">
                        {{ obtenerErrorHistorialAsignacion(ticket.id) }}
                      </div>

                      <div v-else-if="obtenerEntradasHistorialAsignacion(ticket.id).length" class="mt-4 grid gap-3">
                        <div
                          v-for="entry in obtenerEntradasHistorialAsignacion(ticket.id)"
                          :key="entry.id"
                          class="rounded-[1.25rem] border border-default/80 bg-elevated/45 p-4"
                        >
                          <div class="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div class="flex flex-wrap items-center gap-2">
                                <UBadge :color="colorFuenteAsignacion[entry.assignment_source]" variant="soft">
                                  {{ etiquetaFuenteAsignacion[entry.assignment_source] }}
                                </UBadge>
                                <p class="font-medium text-highlighted">
                                  {{ entry.assigned_by_name }}
                                </p>
                              </div>
                              <p class="mt-2 text-xs text-muted">
                                {{ formatearFechaHora(entry.created_at) }}
                              </p>
                            </div>
                          </div>

                          <div class="mt-4 grid gap-3 md:grid-cols-2">
                            <div class="rounded-2xl border border-default/80 bg-default/85 p-3">
                              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                                Antes
                              </p>
                              <p class="mt-2 text-sm text-highlighted">
                                {{ entry.previous_assigned_to_name }}
                              </p>
                            </div>

                            <div class="rounded-2xl border border-default/80 bg-default/85 p-3">
                              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                                Después
                              </p>
                              <p class="mt-2 text-sm text-highlighted">
                                {{ entry.assigned_to_name }}
                              </p>
                            </div>
                          </div>

                          <p v-if="entry.notes" class="mt-3 text-sm text-muted">
                            {{ entry.notes }}
                          </p>
                        </div>
                      </div>

                      <div v-else class="mt-4 rounded-2xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
                        Todavía no hay movimientos de asignación para este ticket.
                      </div>

                      <div v-if="obtenerTotalHistorialAsignacion(ticket.id) > HISTORIAL_ASIGNACION_POR_PAGINA" class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p class="text-xs text-muted">
                          Página {{ obtenerPaginaHistorialAsignacion(ticket.id) }} de {{ obtenerTotalPaginasHistorialAsignacion(ticket.id) }}
                        </p>

                        <UPagination
                          :page="obtenerPaginaHistorialAsignacion(ticket.id)"
                          :total="obtenerTotalHistorialAsignacion(ticket.id)"
                          :items-per-page="HISTORIAL_ASIGNACION_POR_PAGINA"
                          size="sm"
                          show-edges
                          active-color="primary"
                          active-variant="solid"
                          @update:page="(page) => cambiarPaginaHistorialAsignacion(ticket.id, page)"
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </UCollapsible>
            </div>
          </div>
        </div>
      </div>

      <template v-if="totalTicketsFiltrados">
        <USeparator />

        <div class="flex min-w-0 flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p class="text-sm text-muted">
            Página {{ paginaActual }} de {{ totalPaginas }}
          </p>

          <div class="w-full min-w-0 overflow-x-auto sm:w-auto sm:overflow-visible sm:pb-0 [-webkit-overflow-scrolling:touch]">
            <UPagination
              v-model:page="paginaActual"
              class="flex w-max min-w-0 justify-center sm:w-auto sm:justify-end"
              :total="totalTicketsFiltrados"
              :items-per-page="cantidadPorPagina"
              show-edges
              active-color="primary"
              active-variant="solid"
            />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
