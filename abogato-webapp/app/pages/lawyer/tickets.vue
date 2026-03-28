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
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'

definePageMeta({ layout: 'app', middleware: ['auth', 'lawyer'] })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()
type FieldValue = string | number | null | undefined
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
  reopen_requested: boolean
  wasReopened: boolean
}

type Documento = {
  id: string
  status: string
  field_values: Record<string, FieldValue>
  template_id: string
  created_at: string
  ticket_id: string
  rejection_reason?: string | null
  document_templates?: {
    title: string | null
    content: string | null
  } | {
    title: string | null
    content: string | null
  }[] | null
}

type PerfilAbogado = {
  display_name: string | null
  office_address: string | null
}

type DocumentoModal = {
  id: string
  titulo: string
  contenido: string
  status: string
  created_at: string
}

const tickets = ref<Ticket[]>([])
const loading = ref(false)
const errorMsg = ref('')
const filtroEstado = ref('todos')
const busqueda = ref('')
const documentosPorTicket = ref<Record<string, Documento[]>>({})
const perfilesAbogados = ref<Record<string, PerfilAbogado>>({})
const ticketExpandido = ref<string | null>(null)
const documentoActivo = ref<DocumentoModal | null>(null)
const rechazoDocumento = ref<{ docId: string, ticketId: string } | null>(null)
const motivoRechazo = ref('')

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const etiquetaEstado: Record<string, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado'
}

const etiquetaPrioridad: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta'
}

const colorPrioridad: Record<Ticket['priority'], 'neutral' | 'warning' | 'error'> = {
  low: 'neutral',
  normal: 'warning',
  high: 'error'
}

const filtrosEstado = ['todos', 'open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const

const colorEstadoDocumento: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  submitted: 'warning',
  approved: 'success',
  rejected: 'error',
  draft: 'neutral'
}

const etiquetaEstadoDocumento: Record<string, string> = {
  submitted: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  draft: 'Borrador'
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

function esRegistroCampo(value: unknown): value is Record<string, FieldValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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
    reopen_requested: row.reopen_requested,
    wasReopened: false,
  }
}

function normalizarDocumento(
  row: Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'ticket_id' | 'rejection_reason'> & {
    document_templates?: { title: string | null, content: string | null } | { title: string | null, content: string | null }[] | null
  }
): Documento | null {
  if (!row.status || !row.template_id || !row.created_at || !row.ticket_id) return null

  return {
    id: row.id,
    status: row.status,
    field_values: esRegistroCampo(row.field_values) ? row.field_values : {},
    template_id: row.template_id,
    created_at: row.created_at,
    ticket_id: row.ticket_id,
    rejection_reason: row.rejection_reason,
    document_templates: row.document_templates ?? null,
  }
}

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
      obtenerNombreResponsable(ticket),
      obtenerEtiquetaEstadoVisible(ticket),
      etiquetaPrioridad[ticket.priority],
    ].some(value => String(value).toLowerCase().includes(termino))
  })
})

const ticketsConReapertura = computed(() =>
  tickets.value.filter(t => t.reopen_requested)
)

const expandedRows = computed(() =>
  ticketExpandido.value ? { [ticketExpandido.value]: true } : {}
)

async function cargarTickets() {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return

  loading.value = true
  errorMsg.value = ''

  let query = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })

  if (profile.value?.role === 'abogado') {
    query = query.or(`assigned_to.eq.${authUser.id},and(status.eq.open,assigned_to.is.null)`)
  }

  const { data, error } = await query

  loading.value = false
  if (error) { errorMsg.value = error.message; return }

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

  if (ticketExpandido.value && !tickets.value.some(ticket => ticket.id === ticketExpandido.value)) {
    ticketExpandido.value = null
  }

  const abogadosIds = [...new Set((tickets.value ?? []).map(ticket => ticket.assigned_to).filter(Boolean))] as string[]

  if (abogadosIds.length) {
    const { data: perfiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, office_address')
      .in('user_id', abogadosIds)

    if (perfiles?.length) {
      perfilesAbogados.value = {
        ...perfilesAbogados.value,
        ...Object.fromEntries(
          perfiles.map((perfil) => [
            perfil.user_id,
            {
              display_name: perfil.display_name,
              office_address: perfil.office_address,
            } satisfies PerfilAbogado,
          ])
        ),
      }
    }
  }
}

async function cargarDocumentosTicket(ticketId: string) {
  const { data } = await supabase
    .from('documents')
    .select('id, status, field_values, template_id, created_at, ticket_id, rejection_reason, document_templates(title, content)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })

  documentosPorTicket.value[ticketId] = (data ?? [])
    .map((row) => normalizarDocumento(row as Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'ticket_id' | 'rejection_reason'> & {
      document_templates?: { title: string | null, content: string | null } | { title: string | null, content: string | null }[] | null
    }))
    .filter((documento): documento is Documento => documento !== null)
}

async function cargarPerfilAbogado(userId: string | null) {
  if (!userId || perfilesAbogados.value[userId]) return

  const { data } = await supabase
    .from('profiles')
    .select('display_name, office_address')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return

  perfilesAbogados.value = {
    ...perfilesAbogados.value,
    [userId]: data as PerfilAbogado
  }
}

async function toggleDocumentos(ticket: Ticket) {
  if (ticketExpandido.value === ticket.id) {
    ticketExpandido.value = null
  } else {
    ticketExpandido.value = ticket.id
    await Promise.all([
      cargarPerfilAbogado(ticket.assigned_to),
      cargarDocumentosTicket(ticket.id)
    ])
  }
}

function obtenerPlantillaDocumento(documento: Documento) {
  const template = documento.document_templates
  if (Array.isArray(template)) return template[0] ?? null
  return template ?? null
}

function obtenerValoresSistema(ticket: Ticket) {
  const abogadoAsignado = ticket.assigned_to
    ? perfilesAbogados.value[ticket.assigned_to]
    : null

  const datosActuales = profile.value?.role === 'abogado'
    ? {
        display_name: profile.value.display_name,
        office_address: profile.value.office_address,
      }
    : null

  const datos = abogadoAsignado ?? datosActuales

  return {
    nombre_notario: datos?.display_name ?? '',
    direccion_notario: datos?.office_address ?? '',
  }
}

function abrirDocumento(documento: Documento, ticket: Ticket) {
  const plantilla = obtenerPlantillaDocumento(documento)

  if (!plantilla?.content) {
    errorMsg.value = 'No se encontró la plantilla para previsualizar este documento.'
    return
  }

  const contenido = renderDocumentTemplate(
    plantilla.content,
    (documento.field_values as Record<string, FieldValue>) ?? {},
    obtenerValoresSistema(ticket)
  )

  documentoActivo.value = {
    id: documento.id,
    titulo: plantilla.title ?? 'Documento legal',
    contenido,
    status: documento.status,
    created_at: documento.created_at,
  }
}

async function abrirDocumentoDesdeTicket(ticket: Ticket) {
  await Promise.all([
    cargarPerfilAbogado(ticket.assigned_to),
    cargarDocumentosTicket(ticket.id),
  ])

  const documento = documentosPorTicket.value[ticket.id]?.[0]

  if (!documento) {
    errorMsg.value = 'Este ticket todavia no tiene documentos para previsualizar.'
    return
  }

  abrirDocumento(documento, ticket)
}

function cerrarDocumento() {
  documentoActivo.value = null
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function obtenerNombreResponsable(ticket: Ticket) {
  if (!ticket.assigned_to) {
    return ticket.status === 'open' ? 'Disponible' : 'Sin asignar'
  }

  return perfilesAbogados.value[ticket.assigned_to]?.display_name ?? 'Asignado'
}

function obtenerEstadoVisible(ticket: Ticket): TicketDisplayStatus {
  return getTicketDisplayStatus(ticket)
}

function obtenerEtiquetaEstadoVisible(ticket: Ticket) {
  return ticketDisplayStatusLabels[obtenerEstadoVisible(ticket)]
}

function obtenerColorEstadoVisible(ticket: Ticket) {
  return ticketDisplayStatusColors[obtenerEstadoVisible(ticket)]
}

function obtenerEtiquetaAccion(ticket: Ticket) {
  if (ticket.status === 'open') {
    return ticket.assigned_to ? 'Iniciar revision' : 'Tomar caso'
  }

  return etiquetaAccion[ticket.status] ?? 'Cambiar estado'
}

function obtenerMenuEstado(ticket: Ticket): DropdownMenuItem[][] {
  const items: DropdownMenuItem[][] = []

  if (ticket.reopen_requested) {
    items.push([
      {
        label: 'Aprobar reapertura',
        icon: 'i-lucide-rotate-ccw',
        onSelect: () => aprobarReapertura(ticket),
      },
      {
        label: 'Rechazar reapertura',
        icon: 'i-lucide-ban',
        color: 'error',
        onSelect: () => rechazarReapertura(ticket),
      },
    ])
  }

  if (siguienteEstado[ticket.status]) {
    items.push([
      {
        label: obtenerEtiquetaAccion(ticket),
        icon: 'i-lucide-arrow-right-circle',
        onSelect: () => avanzarEstado(ticket),
      },
    ])
  }

  if (!items.length) {
    items.push([
      {
        label: obtenerEtiquetaEstadoVisible(ticket),
        icon: 'i-lucide-check',
        disabled: true,
      },
    ])
  }

  return items
}

function obtenerMenuAcciones(ticket: Ticket): DropdownMenuItem[][] {
  const items: DropdownMenuItem[][] = [[
    {
      label: 'Ver detalle',
      icon: 'i-lucide-external-link',
      to: `/ticket/${ticket.id}`,
    },
    {
      label: 'Ver documento',
      icon: 'i-lucide-file-text',
      onSelect: () => abrirDocumentoDesdeTicket(ticket),
    },
  ]]

  if (ticket.reopen_requested) {
    items.push([
      {
        label: 'Aprobar reapertura',
        icon: 'i-lucide-rotate-ccw',
        onSelect: () => aprobarReapertura(ticket),
      },
      {
        label: 'Rechazar reapertura',
        icon: 'i-lucide-ban',
        color: 'error',
        onSelect: () => rechazarReapertura(ticket),
      },
    ])
  }

  if (siguienteEstado[ticket.status]) {
    items.push([
      {
        label: obtenerEtiquetaAccion(ticket),
        icon: 'i-lucide-arrow-right-circle',
        onSelect: () => avanzarEstado(ticket),
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
      row.original.reopen_requested
        ? h(UBadge, { color: 'warning', variant: 'subtle', class: 'mt-2' }, () => 'Reapertura solicitada')
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
    id: 'responsable',
    header: 'Responsable',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, obtenerNombreResponsable(row.original)),
    meta: {
      class: {
        th: 'w-40',
        td: 'align-top',
      },
    },
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => h(UDropdownMenu, {
      items: obtenerMenuEstado(row.original),
    }, {
      default: () => h(UButton, {
        size: 'sm',
        color: obtenerColorEstadoVisible(row.original),
        variant: 'soft',
        trailingIcon: 'i-lucide-chevron-down',
      }, () => obtenerEtiquetaEstadoVisible(row.original)),
    }),
    meta: {
      class: {
        th: 'w-40',
        td: 'align-top',
      },
    },
  },
  {
    id: 'documents',
    header: 'Documentos',
    cell: ({ row }) => h(UButton, {
      size: 'sm',
      color: 'neutral',
      variant: row.original.id === ticketExpandido.value ? 'soft' : 'outline',
      trailingIcon: row.original.id === ticketExpandido.value ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down',
      onClick: () => toggleDocumentos(row.original),
    }, () => row.original.id === ticketExpandido.value ? 'Ocultar' : 'Abrir'),
    meta: {
      class: {
        th: 'w-36',
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

async function aprobarDocumento(docId: string, ticketId: string) {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return

  const { error } = await supabase
    .from('documents')
    .update({ status: 'approved', reviewed_by: authUser.id })
    .eq('id', docId)

  if (error) { errorMsg.value = error.message; return }
  await cargarDocumentosTicket(ticketId)
}

function abrirModalRechazo(docId: string, ticketId: string) {
  motivoRechazo.value = ''
  rechazoDocumento.value = { docId, ticketId }
}

function cerrarModalRechazo() {
  rechazoDocumento.value = null
  motivoRechazo.value = ''
}

async function rechazarDocumento() {
  if (!rechazoDocumento.value) return

  const razon = motivoRechazo.value.trim()
  if (!razon) {
    errorMsg.value = 'Ingresá un motivo de rechazo para continuar.'
    return
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return

  const { error } = await supabase
    .from('documents')
    .update({ status: 'rejected', reviewed_by: authUser.id, rejection_reason: razon })
    .eq('id', rechazoDocumento.value.docId)

  if (error) { errorMsg.value = error.message; return }
  await cargarDocumentosTicket(rechazoDocumento.value.ticketId)
  cerrarModalRechazo()
}

async function avanzarEstado(t: Ticket) {
  const siguiente = siguienteEstado[t.status]
  if (!siguiente) return

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return

  loading.value = true

  const cambios: Record<string, unknown> = { status: siguiente }
  if (t.status === 'open') cambios.assigned_to = authUser.id

  const { error } = await supabase
    .from('tickets')
    .update(cambios)
    .eq('id', t.id)

  if (!error) {
    await supabase.from('ticket_historial').insert([{
      ticket_id: t.id,
      changed_by: authUser.id,
      old_status: t.status,
      new_status: siguiente
    }])
  }

  loading.value = false
  if (error) { errorMsg.value = error.message; return }
  await cargarTickets()
}

async function aprobarReapertura(t: Ticket) {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return

  loading.value = true

  const { error } = await supabase
    .from('tickets')
    .update({ status: 'open', reopen_requested: false })
    .eq('id', t.id)

  if (!error) {
    await supabase.from('ticket_historial').insert([{
      ticket_id: t.id,
      changed_by: authUser.id,
      old_status: t.status,
      new_status: 'open',
      notes: 'Reapertura aprobada por el abogado'
    }])
  }

  loading.value = false
  if (error) { errorMsg.value = error.message; return }
  await cargarTickets()
}

async function rechazarReapertura(t: Ticket) {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return

  loading.value = true

  const { error } = await supabase
    .from('tickets')
    .update({ reopen_requested: false })
    .eq('id', t.id)

  if (!error) {
    await supabase.from('ticket_historial').insert([{
      ticket_id: t.id,
      changed_by: authUser.id,
      old_status: t.status,
      new_status: t.status,
      notes: 'Solicitud de reapertura rechazada'
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
  <div class="mx-auto w-full max-w-7xl">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
        {{ profile?.role === 'admin' ? 'Todos los tickets' : 'Mis casos' }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          Revisá solicitudes activas, documentos y reaperturas desde una sola vista.
        </p>
      </div>
      <UButton color="neutral" variant="outline" :loading="loading" @click="cargarTickets">
        Actualizar
      </UButton>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo cargar la información"
      :description="errorMsg"
      class="mb-4"
    />

    <UCard v-if="ticketsConReapertura.length" class="mb-6">
      <template #header>
        <div>
          <h2 class="font-semibold text-highlighted">Solicitudes de reapertura</h2>
          <p class="mt-1 text-sm text-muted">Casos que requieren una decisión del abogado.</p>
        </div>
      </template>

      <div class="grid gap-3">
        <UCard
          v-for="t in ticketsConReapertura"
          :key="t.id"
          :ui="{ body: 'flex flex-wrap items-center justify-between gap-4 px-4 py-4' }"
        >
          <div>
            <p class="font-medium text-highlighted">{{ t.title }}</p>
            <UBadge :color="obtenerColorEstadoVisible(t)" variant="subtle" class="mt-2">
              {{ obtenerEtiquetaEstadoVisible(t) }}
            </UBadge>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton size="sm" :disabled="loading" @click="aprobarReapertura(t)">Aprobar</UButton>
            <UButton size="sm" color="error" variant="outline" :disabled="loading" @click="rechazarReapertura(t)">Rechazar</UButton>
          </div>
        </UCard>
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
              placeholder="Buscar por ticket, asunto, responsable o estado"
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
        :expanded="expandedRows"
        :get-row-id="(ticket) => ticket.id"
        :expanded-options="{ getRowCanExpand: () => true }"
        sticky="header"
        empty="No hay tickets para este filtro."
        :meta="{
          class: {
            tr: (row) => row.original.id === ticketExpandido ? 'bg-elevated/60' : ''
          }
        }"
      >
        <template #expanded="{ row }">
          <div class="min-w-0 max-w-full whitespace-normal px-1 py-2">
            <div class="min-w-0 overflow-hidden rounded-3xl border border-default bg-gradient-to-br from-elevated/70 via-default to-elevated/30">
              <div class="border-b border-default/70 px-4 py-4 sm:px-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge color="neutral" variant="soft">Documentos</UBadge>
                      <UBadge color="primary" variant="subtle">
                        {{ documentosPorTicket[row.original.id]?.length ?? 0 }}
                      </UBadge>
                      <span class="text-xs text-muted">Ticket #{{ String(row.original.id).slice(0, 8) }}</span>
                    </div>
                    <h3 class="mt-3 text-base font-semibold text-highlighted">{{ row.original.title }}</h3>
                    <p v-if="row.original.description" class="mt-1 max-w-3xl text-sm leading-6 text-muted">
                      {{ row.original.description }}
                    </p>
                  </div>

                  <div class="min-w-0">
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-file-text"
                      @click="abrirDocumentoDesdeTicket(row.original)"
                    >
                      Abrir mas reciente
                    </UButton>
                  </div>
                </div>
              </div>

              <div class="p-4 sm:p-5">
                <div
                  v-if="!documentosPorTicket[row.original.id]?.length"
                  class="rounded-2xl border border-dashed border-default bg-default/80 px-4 py-8 text-center"
                >
                  <p class="font-medium text-highlighted">Todavia no hay documentos en este ticket.</p>
                  <p class="mt-2 text-sm text-muted">
                    Cuando el cliente genere un documento, lo vas a poder revisar y aprobar desde aqui.
                  </p>
                </div>

                <div v-else class="grid gap-3 xl:grid-cols-2">
                  <UCard
                    v-for="d in documentosPorTicket[row.original.id]"
                    :key="d.id"
                    class="min-w-0 border border-default/80 bg-default/90 shadow-sm"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate font-medium text-highlighted">
                          {{ obtenerPlantillaDocumento(d)?.title ?? 'Documento legal' }}
                        </p>
                        <p class="mt-1 text-xs text-muted">
                          Generado {{ formatearFecha(d.created_at) }}
                        </p>
                      </div>

                      <UBadge :color="colorEstadoDocumento[d.status] ?? 'neutral'" variant="subtle">
                        {{ etiquetaEstadoDocumento[d.status] ?? 'Borrador' }}
                      </UBadge>
                    </div>

                    <div class="mt-4 min-w-0 rounded-2xl border border-default/70 bg-elevated/50 p-3">
                      <p class="break-words text-sm leading-6 text-muted">
                        Revisá el contenido legal completo con los datos ya integrados antes de aprobarlo o rechazarlo.
                      </p>
                    </div>

                    <UAlert
                      v-if="d.status === 'rejected' && d.rejection_reason"
                      color="error"
                      variant="soft"
                      title="Motivo del rechazo"
                      :description="d.rejection_reason"
                      class="mt-4"
                    />

                    <div class="mt-4 flex flex-wrap items-center gap-2">
                      <UButton size="sm" color="neutral" variant="outline" @click="abrirDocumento(d, row.original)">
                        Ver documento
                      </UButton>

                      <template v-if="d.status === 'submitted'">
                        <UButton size="sm" @click="aprobarDocumento(d.id, row.original.id)">
                          Aprobar
                        </UButton>
                        <UButton size="sm" color="error" variant="outline" @click="abrirModalRechazo(d.id, row.original.id)">
                          Rechazar
                        </UButton>
                      </template>
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal
      :open="!!documentoActivo"
      fullscreen
      :title="documentoActivo?.titulo"
      :description="documentoActivo ? new Date(documentoActivo.created_at).toLocaleString('es-CR') : ''"
      @close="cerrarDocumento"
    >
      <template #content>
        <div class="bg-elevated/50 p-4 sm:p-6">
          <div class="mx-auto mb-4 flex w-full max-w-3xl justify-end">
            <UButton color="neutral" variant="outline" leading-icon="i-lucide-x" @click="cerrarDocumento">
              Cerrar
            </UButton>
          </div>
          <article class="mx-auto w-full max-w-3xl rounded-2xl border border-default bg-default px-6 py-8 shadow-sm">
            <pre class="whitespace-pre-wrap font-serif text-sm leading-7 text-highlighted">{{ documentoActivo?.contenido }}</pre>
          </article>
        </div>
      </template>
    </UModal>

    <UModal
      :open="!!rechazoDocumento"
      title="Rechazar documento"
      description="Explicá claramente qué debe corregir el cliente antes de reenviar el documento."
      @close="cerrarModalRechazo"
    >
      <template #body>
        <div class="grid gap-4">
          <UFormField label="Motivo del rechazo" required>
            <UTextarea
              v-model="motivoRechazo"
              :rows="5"
              placeholder="Ejemplo: faltan datos obligatorios, hay un nombre incorrecto o la información no coincide con la cédula."
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-wrap justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="cerrarModalRechazo">
            Cancelar
          </UButton>
          <UButton color="error" :disabled="!motivoRechazo.trim()" @click="rechazarDocumento">
            Rechazar documento
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
