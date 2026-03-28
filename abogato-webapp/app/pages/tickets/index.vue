<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { DropdownMenuItem, TableColumn } from '#ui/types'
import type { Database } from '~/types/database.types'
import {
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
const estadoDocumentoPorTicket = ref<Record<string, string>>({})

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const filtroEstado = ref('todos')
const busqueda = ref('')
const ticketRecienCreadoId = ref('')

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

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

const filtrosEstado = ['todos', 'open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const

const ticketsFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return tickets.value.filter((ticket) => {
    const coincideEstado = filtroEstado.value === 'todos' || ticket.status === filtroEstado.value

    if (!coincideEstado) return false
    if (!termino) return true

    return [
      ticket.id,
      ticket.title,
      ticket.description ?? '',
      obtenerEtiquetaEstadoVisible(ticket),
      etiquetaPrioridad[ticket.priority],
      estadoDocumentoPorTicket.value[ticket.id] === 'rejected' ? 'documento rechazado' : '',
    ].some((value) => String(value).toLowerCase().includes(termino))
  })
})

function obtenerEstadoVisible(ticket: Ticket): TicketDisplayStatus {
  return getTicketDisplayStatus(ticket)
}

function obtenerEtiquetaEstadoVisible(ticket: Ticket) {
  return ticketDisplayStatusLabels[obtenerEstadoVisible(ticket)]
}

function obtenerColorEstadoVisible(ticket: Ticket) {
  return ticketDisplayStatusColors[obtenerEstadoVisible(ticket)]
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function obtenerMenuAcciones(ticket: Ticket): DropdownMenuItem[][] {
  const items: DropdownMenuItem[][] = [[
    {
      label: 'Ver ticket',
      icon: 'i-lucide-external-link',
      to: `/ticket/${ticket.id}`,
    },
  ]]

  if (ticket.status === 'open') {
    items.push([
      {
        label: 'Cancelar ticket',
        icon: 'i-lucide-ban',
        color: 'error',
        onSelect: () => cancelarTicket(ticket.id),
      },
    ])
  }

  return items
}

const columns = computed<TableColumn<Ticket>[]>(() => [
  {
    accessorKey: 'id',
    header: 'Ticket',
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, `#${String(row.original.id).slice(0, 8)}`),
    meta: {
      class: {
        th: 'w-32',
        td: 'align-top',
      },
    },
  },
  {
    accessorKey: 'title',
    header: 'Asunto',
    cell: ({ row }) => h('div', { class: 'min-w-0' }, [
      h('p', { class: 'font-medium text-highlighted' }, row.original.title),
      row.original.description
        ? h('p', { class: 'mt-1 line-clamp-2 text-xs text-muted' }, row.original.description)
        : null,
    ]),
  },
  {
    accessorKey: 'priority',
    header: 'Prioridad',
    cell: ({ row }) => h(UBadge, {
      color: colorPrioridad[row.original.priority],
      variant: 'subtle',
    }, () => etiquetaPrioridad[row.original.priority]),
    meta: {
      class: {
        th: 'w-36',
        td: 'align-top',
      },
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, formatearFecha(row.original.created_at)),
    meta: {
      class: {
        th: 'w-36',
        td: 'align-top',
      },
    },
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => h('div', { class: 'flex flex-wrap items-center gap-2' }, [
      h(UBadge, {
        color: obtenerColorEstadoVisible(row.original),
        variant: 'subtle',
      }, () => obtenerEtiquetaEstadoVisible(row.original)),
      estadoDocumentoPorTicket.value[row.original.id] === 'rejected'
        ? h(UBadge, {
            color: 'error',
            variant: 'soft',
          }, () => 'Documento rechazado')
        : null,
    ]),
    meta: {
      class: {
        th: 'w-56',
        td: 'align-top',
      },
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h(UDropdownMenu, {
      items: obtenerMenuAcciones(row.original),
    }, {
      default: () => h(UButton, {
        size: 'sm',
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-ellipsis',
        square: true,
      }),
    }),
    meta: {
      class: {
        th: 'w-16',
        td: 'align-top text-right',
      },
    },
  },
])

function obtenerMensajeExito(status: string) {
  if (status === 'created') return 'Tu ticket fue creado correctamente.'
  return ''
}

async function cargarEstadosDocumento(ticketIds: string[]) {
  if (!ticketIds.length) {
    estadoDocumentoPorTicket.value = {}
    return
  }

  const { data, error } = await supabase
    .from('documents')
    .select('ticket_id, status, created_at')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: false })

  if (error) {
    errorMsg.value = error.message
    return
  }

  const siguienteEstado: Record<string, string> = {}

  for (const documento of (data ?? []) as Array<Pick<DocumentRow, 'ticket_id' | 'status' | 'created_at'>>) {
    if (!documento.status || !documento.created_at) continue
    if (!documento.ticket_id || siguienteEstado[documento.ticket_id]) continue
    siguienteEstado[documento.ticket_id] = documento.status
  }

  estadoDocumentoPorTicket.value = siguienteEstado
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
  <div class="mx-auto w-full max-w-7xl">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Mis tickets</h1>
        <p class="mt-1 text-sm text-muted">
          Revisá el estado de tus trámites y creá nuevas solicitudes desde una página dedicada.
        </p>
      </div>
      <UButton to="/tickets/nuevo">
        Nuevo ticket
      </UButton>
    </div>

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
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="grid gap-3 sm:max-w-md">
            <h2 class="font-semibold text-highlighted">Bandeja de tickets</h2>
            <UInput
              v-model="busqueda"
              icon="i-lucide-search"
              placeholder="Buscar por ticket, asunto, estado o prioridad"
            />
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="f in filtrosEstado"
              :key="f"
              size="sm"
              :color="filtroEstado === f ? 'primary' : 'neutral'"
              :variant="filtroEstado === f ? 'solid' : 'outline'"
              @click="filtroEstado = f"
            >
              {{ f === 'todos' ? 'Todos' : etiquetaEstado[f] }}
            </UButton>
          </div>
        </div>
      </template>

      <UTable
        :data="ticketsFiltrados"
        :columns="columns"
        :loading="loading"
        sticky="header"
        empty="No hay tickets para este filtro."
      />
    </UCard>
  </div>
</template>
