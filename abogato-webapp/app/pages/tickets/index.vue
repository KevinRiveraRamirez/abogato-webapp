<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  getDocumentWorkflowPhase,
  getReopenedTicketIds,
  getTicketDisplayStatus,
  ticketDisplayStatusColors,
  ticketDisplayStatusLabels,
  type TicketDisplayStatus,
} from '~/utils/dashboard'

definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const supabase = useSupabaseClient()

type TicketRow = Database['public']['Tables']['tickets']['Row']
type DocumentRow = Database['public']['Tables']['documents']['Row']
type DocumentVersionRow = Database['public']['Tables']['document_versions']['Row']

type Ticket = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
  priority: 'low' | 'normal' | 'high'
  created_by: string
  assigned_to: string | null
  created_at: string
  wasReopened: boolean
}

function normalizarEstadoTicket(value: string): Ticket['status'] {
  return ['open', 'in_progress', 'resolved', 'closed', 'cancelled'].includes(value)
    ? value as Ticket['status']
    : 'open'
}

function normalizarPrioridad(value: string): Ticket['priority'] {
  return ['low', 'normal', 'high'].includes(value)
    ? value as Ticket['priority']
    : 'normal'
}

function normalizarTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: normalizarEstadoTicket(row.status),
    priority: normalizarPrioridad(row.priority),
    created_by: row.created_by,
    assigned_to: row.assigned_to,
    created_at: row.created_at,
    wasReopened: false,
  }
}

const tickets = ref<Ticket[]>([])
const documentoActualPorTicket = ref<Record<string, {
  id: string
  status: string
  latestVersionStatus: string | null
  latestVersionSource: string | null
}>>({})

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const filtrosEstadoSeleccionados = ref<Ticket['status'][]>([])
const busqueda = ref('')
const ticketRecienCreadoId = ref('')
const ticketExpandido = ref<string | null>(null)
const paginaActual = ref(1)
const cantidadPorPagina = ref(10)

const etiquetaEstado: Record<string, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

const etiquetaPrioridad: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
}

const colorPrioridad: Record<Ticket['priority'], 'neutral' | 'warning' | 'error'> = {
  low: 'neutral',
  normal: 'warning',
  high: 'error',
}

const filtrosEstado = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const
const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

const ticketsFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return tickets.value.filter((ticket) => {
    const coincideEstado = !filtrosEstadoSeleccionados.value.length
      || filtrosEstadoSeleccionados.value.includes(ticket.status)

    if (!coincideEstado) return false
    if (!termino) return true

    return [
      ticket.id,
      ticket.title,
      ticket.description ?? '',
      obtenerEtiquetaEstadoVisible(ticket),
      etiquetaPrioridad[ticket.priority],
      obtenerFaseDocumento(ticket).label,
      obtenerFaseDocumento(ticket).description,
    ].some((value) => String(value).toLowerCase().includes(termino))
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

const hayFiltrosActivos = computed(() =>
  Boolean(busqueda.value.trim())
  || filtrosEstadoSeleccionados.value.length > 0
)

const filtrosAplicadosCount = computed(() =>
  filtrosEstadoSeleccionados.value.length
)

function obtenerEstadoVisible(ticket: Ticket): TicketDisplayStatus {
  return getTicketDisplayStatus(ticket)
}

function obtenerEtiquetaEstadoVisible(ticket: Ticket) {
  return ticketDisplayStatusLabels[obtenerEstadoVisible(ticket)]
}

function obtenerColorEstadoVisible(ticket: Ticket) {
  return ticketDisplayStatusColors[obtenerEstadoVisible(ticket)]
}

function obtenerEstadoDocumento(ticketId: string) {
  const documento = documentoActualPorTicket.value[ticketId]
  return documento?.latestVersionStatus ?? documento?.status ?? 'draft'
}

function obtenerDocumentoActualId(ticketId: string) {
  return documentoActualPorTicket.value[ticketId]?.id ?? null
}

function obtenerFuenteVersionDocumento(ticketId: string) {
  return documentoActualPorTicket.value[ticketId]?.latestVersionSource ?? null
}

function obtenerFaseDocumento(ticket: Ticket) {
  const documento = documentoActualPorTicket.value[ticket.id]
  return getDocumentWorkflowPhase({
    ticketStatus: ticket.status,
    documentStatus: documento?.status,
    latestVersionStatus: documento?.latestVersionStatus,
    assignedTo: ticket.assigned_to,
    audience: 'client',
    latestVersionSource: obtenerFuenteVersionDocumento(ticket.id),
  })
}

function puedeCorregirDocumento(ticket: Ticket) {
  return obtenerEstadoDocumento(ticket.id) === 'rejected'
    && !['resolved', 'closed', 'cancelled'].includes(ticket.status)
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function actualizarFilaExpandida(ticketId: string, open: boolean) {
  ticketExpandido.value = open ? ticketId : ticketExpandido.value === ticketId ? null : ticketExpandido.value
}

function limpiarFiltros() {
  busqueda.value = ''
  filtrosEstadoSeleccionados.value = []
}

async function abrirTicketOCorreccion(ticketId: string) {
  if (obtenerEstadoDocumento(ticketId) === 'rejected') {
    await navigateTo({
      path: `/ticket/${ticketId}/documento`,
      query: obtenerDocumentoActualId(ticketId)
        ? { document: obtenerDocumentoActualId(ticketId)! }
        : {},
    })
    return
  }

  await navigateTo(`/ticket/${ticketId}`)
}

function toggleFiltroEstado(estado: Ticket['status']) {
  filtrosEstadoSeleccionados.value = filtrosEstadoSeleccionados.value.includes(estado)
    ? filtrosEstadoSeleccionados.value.filter(item => item !== estado)
    : [...filtrosEstadoSeleccionados.value, estado]
}

function obtenerMensajeExito(status: string) {
  if (status === 'created') return 'Tu ticket fue creado correctamente.'
  return ''
}

async function cargarEstadosDocumento(ticketIds: string[]) {
  if (!ticketIds.length) {
    documentoActualPorTicket.value = {}
    return
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, ticket_id, status, updated_at')
    .in('ticket_id', ticketIds)
    .order('updated_at', { ascending: false })

  if (error) {
    errorMsg.value = error.message
    return
  }

  const documentos = (data ?? []) as Array<Pick<DocumentRow, 'id' | 'ticket_id' | 'status' | 'updated_at'>>
  const documentIds = documentos.map(documento => documento.id).filter(Boolean)
  const latestVersionByDocumentId: Record<string, { status: string | null, source: string | null }> = {}

  if (documentIds.length) {
    const { data: versionesData, error: versionesError } = await supabase
      .from('document_versions')
      .select('document_id, status, source, version_number')
      .in('document_id', documentIds)
      .order('version_number', { ascending: false })

    if (versionesError) {
      errorMsg.value = versionesError.message
      return
    }

    for (const version of (versionesData ?? []) as Array<Pick<DocumentVersionRow, 'document_id' | 'status' | 'source' | 'version_number'>>) {
      if (!version.document_id || latestVersionByDocumentId[version.document_id]) continue

      latestVersionByDocumentId[version.document_id] = {
        status: version.status,
        source: version.source,
      }
    }
  }

  const siguienteEstado: Record<string, {
    id: string
    status: string
    latestVersionStatus: string | null
    latestVersionSource: string | null
  }> = {}

  for (const documento of documentos) {
    if (!documento.id || !documento.status) continue
    if (!documento.ticket_id || siguienteEstado[documento.ticket_id]) continue

    const latestVersion = latestVersionByDocumentId[documento.id]

    siguienteEstado[documento.ticket_id] = {
      id: documento.id,
      status: documento.status,
      latestVersionStatus: latestVersion?.status ?? null,
      latestVersionSource: latestVersion?.source ?? null,
    }
  }

  documentoActualPorTicket.value = siguienteEstado
}

async function cargarTickets() {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) return

  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('created_by', authUser.id)
    .order('created_at', { ascending: false })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  const ticketsNormalizados = (data ?? []).map((row) => normalizarTicket(row as TicketRow))
  let reopenedTicketIds = new Set<string>()

  if (ticketsNormalizados.length) {
    const { data: reopenHistory, error: reopenHistoryError } = await supabase
      .from('ticket_historial')
      .select('ticket_id, old_status, new_status')
      .in('ticket_id', ticketsNormalizados.map(ticket => ticket.id))
      .eq('new_status', 'open')
      .in('old_status', ['resolved', 'closed', 'cancelled'])

    if (reopenHistoryError) {
      errorMsg.value = reopenHistoryError.message
      return
    }

    reopenedTicketIds = getReopenedTicketIds(reopenHistory ?? [])
  }

  tickets.value = ticketsNormalizados.map(ticket => ({
    ...ticket,
    wasReopened: reopenedTicketIds.has(ticket.id),
  }))

  await cargarEstadosDocumento(tickets.value.map(ticket => ticket.id))
}

async function cancelarTicket(id: string) {
  if (!confirm('¿Cancelar este ticket?')) return

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser?.id) {
    errorMsg.value = authError?.message || 'Sesión no válida.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('created_by', authUser.id)
    .eq('status', 'open')

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await supabase.from('ticket_historial').insert([{
    ticket_id: id,
    changed_by: authUser.id,
    old_status: 'open',
    new_status: 'cancelled',
    notes: 'Ticket cancelado por el cliente',
  }])

  await cargarTickets()
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

onMounted(async () => {
  await cargarTickets()

  const status = typeof route.query.status === 'string' ? route.query.status : ''
  const ticketId = typeof route.query.ticket === 'string' ? route.query.ticket : ''
  const message = obtenerMensajeExito(status)

  if (message) {
    successMsg.value = message
    ticketRecienCreadoId.value = ticketId
    await navigateTo('/tickets', { replace: true })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <AppPageHeader
      eyebrow="Cliente"
      title="Mis tickets"
      description="Revisá el estado de tus trámites y creá nuevas solicitudes desde una página dedicada."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :loading="loading" @click="cargarTickets">
          Actualizar
        </UButton>
        <UButton
          to="/tickets/nuevo"
          size="lg"
          color="primary"
          variant="solid"
          leading-icon="i-lucide-plus"
          class="shadow-[0_18px_40px_-24px_rgba(37,99,235,0.72)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(37,99,235,0.78)]"
        >
          Nuevo ticket
        </UButton>
      </template>
    </AppPageHeader>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
      class="mb-4"
    />

    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Operación exitosa"
      :description="successMsg"
      class="mb-4"
    />

    <UCard
      v-if="successMsg && ticketRecienCreadoId"
      class="mb-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted">El ticket quedó creado. Si necesitás cargar datos del vehículo, continuá desde la página de traspasos.</p>
        <UButton :to="`/traspaso-carro?ticket=${ticketRecienCreadoId}`">
          Ir a traspasos
        </UButton>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <AppFilterToolbar
          v-model:search-term="busqueda"
          v-model:per-page="cantidadPorPagina"
          title="Bandeja de tickets"
          search-placeholder="Buscar por ticket, asunto, estado o prioridad"
          :results-label="`Mostrando ${resumenPaginacion.inicio}-${resumenPaginacion.fin} de ${totalTicketsFiltrados}`"
          :per-page-options="opcionesCantidadPorPagina"
          :has-active-filters="hayFiltrosActivos"
          :active-filter-count="filtrosAplicadosCount"
          @clear-filters="limpiarFiltros"
        >
          <template #filters>
            <div class="grid gap-2">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Estado del ticket</p>
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
                  v-for="f in filtrosEstado"
                  :key="f"
                  size="sm"
                  :color="filtrosEstadoSeleccionados.includes(f) ? 'primary' : 'neutral'"
                  :variant="filtrosEstadoSeleccionados.includes(f) ? 'solid' : 'outline'"
                  @click="toggleFiltroEstado(f)"
                >
                  {{ etiquetaEstado[f] }}
                </UButton>
              </div>
            </div>
          </template>
        </AppFilterToolbar>
      </template>

      <SkeletonListCards v-if="loading && !tickets.length" :items="4" />

      <div v-else-if="!ticketsFiltrados.length" class="py-10 text-center">
        <p class="font-medium text-highlighted">No hay tickets para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Probá otro estado o ajustá la búsqueda.</p>
      </div>

      <div
        v-else
        class="overflow-hidden rounded-[1.75rem] border border-default/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.3)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"
      >
        <div class="overflow-x-auto pb-1">
          <div class="min-w-[52rem] w-full">
            <div class="grid grid-cols-[10rem_minmax(18rem,2fr)_11rem_9rem] gap-4 border-b border-default/70 bg-elevated/70 pl-5 pr-9 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted sm:pr-10">
              <p>Ticket</p>
              <p>Asunto</p>
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
                    class="grid w-full grid-cols-[10rem_minmax(18rem,2fr)_11rem_9rem] gap-4 pl-5 pr-9 py-4 text-left transition hover:bg-primary/5 sm:pr-10"
                    :class="open ? 'bg-primary/6' : ''"
                    :aria-label="open ? `Minimizar ticket ${ticket.id}` : `Expandir ticket ${ticket.id}`"
                  >
                    <div class="min-w-0">
                      <p class="font-semibold text-highlighted">
                        #{{ String(ticket.id).slice(0, 8) }}
                      </p>
                      <p class="mt-1 text-xs text-muted">
                        {{ obtenerFaseDocumento(ticket).label }}
                      </p>
                    </div>

                    <div class="min-w-0">
                      <p class="truncate font-medium text-highlighted">
                        {{ ticket.title }}
                      </p>
                      <p class="mt-1 line-clamp-2 text-xs text-muted">
                        {{ ticket.description || 'Sin descripción adicional.' }}
                      </p>
                    </div>

                    <div class="flex min-w-0 flex-col items-start gap-2">
                      <UBadge class="self-start" :color="obtenerColorEstadoVisible(ticket)" variant="subtle">
                        {{ obtenerEtiquetaEstadoVisible(ticket) }}
                      </UBadge>
                    </div>

                    <div class="whitespace-nowrap text-sm text-muted">
                      {{ formatearFecha(ticket.created_at) }}
                    </div>
                  </button>
                </template>

                <template #content>
                  <div class="border-t border-default/60 bg-elevated/35 px-5 py-5">
                    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
                      <div class="grid gap-4 md:grid-cols-2">
                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Estado del trámite</p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <UBadge :color="obtenerColorEstadoVisible(ticket)" variant="subtle">
                              {{ obtenerEtiquetaEstadoVisible(ticket) }}
                            </UBadge>
                            <UBadge :color="colorPrioridad[ticket.priority]" variant="outline">
                              {{ etiquetaPrioridad[ticket.priority] }}
                            </UBadge>
                          </div>
                          <p class="mt-3 text-sm text-muted">
                            Creado el {{ formatearFecha(ticket.created_at) }}.
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Documento legal</p>
                          <div class="mt-2">
                            <UBadge :color="obtenerFaseDocumento(ticket).color" variant="subtle">
                              {{ obtenerFaseDocumento(ticket).label }}
                            </UBadge>
                          </div>
                          <p class="mt-2 text-sm text-muted">
                            {{ obtenerFaseDocumento(ticket).description }}
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm md:col-span-2">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Detalle</p>
                          <p class="mt-2 text-sm leading-6 text-muted">
                            {{ ticket.description || 'Este ticket no tiene una descripción adicional registrada.' }}
                          </p>
                        </div>
                      </div>

                      <div class="grid gap-3 rounded-[1.5rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Acciones</p>
                          <p class="mt-2 text-sm text-muted">
                            Entrá al detalle completo del trámite o cancelalo si todavía está pendiente.
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

                        <UButton
                          v-if="puedeCorregirDocumento(ticket)"
                          color="warning"
                          variant="soft"
                          class="justify-center"
                          @click="void abrirTicketOCorreccion(ticket.id)"
                        >
                          Corregir documento
                        </UButton>

                        <UButton
                          v-if="ticket.status === 'open'"
                          color="error"
                          variant="soft"
                          :loading="loading"
                          class="justify-center"
                          @click="cancelarTicket(ticket.id)"
                        >
                          Cancelar ticket
                        </UButton>

                        <p class="text-xs text-muted">
                          El detalle del ticket muestra historial, comentarios y adjuntos del trámite.
                        </p>
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

        <div class="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p class="text-sm text-muted">
            Página {{ paginaActual }} de {{ totalPaginas }}
          </p>

          <UPagination
            v-model:page="paginaActual"
            :total="totalTicketsFiltrados"
            :items-per-page="cantidadPorPagina"
            show-edges
            active-color="primary"
            active-variant="solid"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
