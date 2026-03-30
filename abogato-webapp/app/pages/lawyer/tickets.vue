<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { DropdownMenuItem, TableColumn } from '#ui/types'
import type { Database } from '~/types/database.types'
import {
  getEffectiveDocumentStatus,
  getDocumentWorkflowPhase,
  getReopenedTicketIds,
  getTicketDisplayStatus,
  ticketDisplayStatusColors,
  ticketDisplayStatusLabels,
  type TicketDisplayStatus,
} from '~/utils/dashboard'
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'

definePageMeta({ layout: 'app', middleware: ['auth', 'lawyer'] })

const supabase = useSupabaseClient()
const authUser = useSupabaseUser()
const { profile, cargarPerfil } = useUsuario()
const { syncLatestDocumentVersionReview } = useDocumentWorkflow()
type FieldValue = string | number | null | undefined
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
  reopen_requested: boolean
  wasReopened: boolean
}

type Documento = {
  id: string
  status: string
  field_values: Record<string, FieldValue>
  template_id: string
  created_at: string
  updated_at: string | null
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

type VersionDocumento = Pick<
  DocumentVersionRow,
  'id' | 'document_id' | 'version_number' | 'status' | 'source' | 'created_at' | 'updated_at' | 'rejection_reason'
>

const tickets = ref<Ticket[]>([])
const loading = ref(false)
const errorMsg = ref('')
const filtrosEstadoSeleccionados = ref<Ticket['status'][]>([])
const busqueda = ref('')
const paginaActual = ref(1)
const cantidadPorPagina = ref(10)
const resumenDocumentoPorTicket = ref<Record<string, {
  id: string
  status: string
  latestVersionStatus: string | null
  latestVersionSource: string | null
  rejectionReason: string | null
}>>({})
const documentosPorTicket = ref<Record<string, Documento[]>>({})
const versionesPorDocumento = ref<Record<string, VersionDocumento[]>>({})
const perfilesAbogados = ref<Record<string, PerfilAbogado>>({})
const ticketExpandido = ref<string | null>(null)
const documentoActivo = ref<DocumentoModal | null>(null)
const rechazoDocumento = ref<{ docId: string, ticketId: string } | null>(null)
const motivoRechazo = ref('')
const rechazandoDocumento = ref(false)

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

const filtrosEstado = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const
const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

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
  row: Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'updated_at' | 'ticket_id' | 'rejection_reason'> & {
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
    updated_at: row.updated_at,
    ticket_id: row.ticket_id,
    rejection_reason: row.rejection_reason,
    document_templates: row.document_templates ?? null,
  }
}

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
      obtenerNombreResponsable(ticket),
      obtenerEtiquetaEstadoVisible(ticket),
      etiquetaPrioridad[ticket.priority],
    ].some(value => String(value).toLowerCase().includes(termino))
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

const currentLawyerId = computed(() =>
  profile.value?.user_id ?? authUser.value?.id ?? null
)

const filtrosAplicadosCount = computed(() =>
  filtrosEstadoSeleccionados.value.length
)

const ticketsConReapertura = computed(() =>
  tickets.value.filter(t => t.reopen_requested)
)

const expandedRows = computed(() =>
  ticketExpandido.value ? { [ticketExpandido.value]: true } : {}
)

function limpiarFiltros() {
  busqueda.value = ''
  filtrosEstadoSeleccionados.value = []
}

function ticketAsignadoAlAbogado(ticket: Ticket) {
  return Boolean(currentLawyerId.value && ticket.assigned_to === currentLawyerId.value)
}

function abogadoDebeTomarCaso(ticket: Ticket) {
  return profile.value?.role === 'abogado' && !ticketAsignadoAlAbogado(ticket)
}

function toggleFiltroEstado(estado: Ticket['status']) {
  filtrosEstadoSeleccionados.value = filtrosEstadoSeleccionados.value.includes(estado)
    ? filtrosEstadoSeleccionados.value.filter(item => item !== estado)
    : [...filtrosEstadoSeleccionados.value, estado]
}

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

  await cargarResumenDocumentosTickets(tickets.value.map(ticket => ticket.id))
}

async function cargarResumenDocumentosTickets(ticketIds: string[]) {
  if (!ticketIds.length) {
    resumenDocumentoPorTicket.value = {}
    return
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, ticket_id, status, updated_at, rejection_reason')
    .in('ticket_id', ticketIds)
    .order('updated_at', { ascending: false })

  if (error) {
    errorMsg.value = error.message
    return
  }

  const documentos = (data ?? []) as Array<Pick<DocumentRow, 'id' | 'ticket_id' | 'status' | 'updated_at' | 'rejection_reason'>>
  const documentIds = documentos.map(documento => documento.id).filter(Boolean)
  const latestVersionByDocumentId: Record<string, { status: string | null, source: string | null, rejectionReason: string | null }> = {}

  if (documentIds.length) {
    const { data: versionesData, error: versionesError } = await supabase
      .from('document_versions')
      .select('document_id, status, source, rejection_reason, version_number')
      .in('document_id', documentIds)
      .order('version_number', { ascending: false })

    if (versionesError) {
      errorMsg.value = versionesError.message
      return
    }

    for (const version of (versionesData ?? []) as Array<Pick<DocumentVersionRow, 'document_id' | 'status' | 'source' | 'rejection_reason' | 'version_number'>>) {
      if (!version.document_id || latestVersionByDocumentId[version.document_id]) continue

      latestVersionByDocumentId[version.document_id] = {
        status: version.status,
        source: version.source,
        rejectionReason: version.rejection_reason ?? null,
      }
    }
  }

  const siguienteResumen: Record<string, {
    id: string
    status: string
    latestVersionStatus: string | null
    latestVersionSource: string | null
    rejectionReason: string | null
  }> = {}

  for (const documento of documentos) {
    if (!documento.id || !documento.status || !documento.ticket_id || siguienteResumen[documento.ticket_id]) continue

    const latestVersion = latestVersionByDocumentId[documento.id]
    siguienteResumen[documento.ticket_id] = {
      id: documento.id,
      status: documento.status,
      latestVersionStatus: latestVersion?.status ?? null,
      latestVersionSource: latestVersion?.source ?? null,
      rejectionReason: latestVersion?.rejectionReason ?? documento.rejection_reason ?? null,
    }
  }

  resumenDocumentoPorTicket.value = siguienteResumen
}

async function cargarDocumentosTicket(ticketId: string) {
  const { data } = await supabase
    .from('documents')
    .select('id, status, field_values, template_id, created_at, updated_at, ticket_id, rejection_reason, document_templates(title, content)')
    .eq('ticket_id', ticketId)
    .order('updated_at', { ascending: false })

  documentosPorTicket.value[ticketId] = (data ?? [])
    .map((row) => normalizarDocumento(row as Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'updated_at' | 'ticket_id' | 'rejection_reason'> & {
      document_templates?: { title: string | null, content: string | null } | { title: string | null, content: string | null }[] | null
    }))
    .filter((documento): documento is Documento => documento !== null)

  await cargarVersionesDocumentos(
    documentosPorTicket.value[ticketId]?.map(documento => documento.id) ?? []
  )

  sincronizarResumenDocumento(ticketId)
}

async function cargarVersionesDocumentos(documentIds: string[]) {
  if (!documentIds.length) return

  const { data } = await supabase
    .from('document_versions')
    .select('id, document_id, version_number, status, source, created_at, updated_at, rejection_reason')
    .in('document_id', documentIds)
    .order('version_number', { ascending: false })

  const grouped: Record<string, VersionDocumento[]> = {}

  for (const version of (data ?? []) as VersionDocumento[]) {
    if (!version.document_id) continue
    grouped[version.document_id] = [...(grouped[version.document_id] ?? []), version]
  }

  versionesPorDocumento.value = {
    ...versionesPorDocumento.value,
    ...grouped,
  }
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

async function actualizarFilaExpandida(ticket: Ticket, open: boolean) {
  if (!open) {
    if (ticketExpandido.value === ticket.id) ticketExpandido.value = null
    return
  }

  if (ticketExpandido.value !== ticket.id) {
    ticketExpandido.value = ticket.id
  }

  await Promise.all([
    cargarPerfilAbogado(ticket.assigned_to),
    cargarDocumentosTicket(ticket.id),
  ])
}

function obtenerPlantillaDocumento(documento: Documento) {
  const template = documento.document_templates
  if (Array.isArray(template)) return template[0] ?? null
  return template ?? null
}

function obtenerDocumentoActual(ticketId: string) {
  return documentosPorTicket.value[ticketId]?.[0] ?? null
}

function obtenerResumenDocumento(ticketId: string) {
  const documentoActual = obtenerDocumentoActual(ticketId)

  if (documentoActual) {
    const ultimaVersion = obtenerUltimaVersionDocumento(documentoActual.id)
    return {
      id: documentoActual.id,
      status: documentoActual.status,
      latestVersionStatus: ultimaVersion?.status ?? null,
      latestVersionSource: ultimaVersion?.source ?? null,
      rejectionReason: ultimaVersion?.rejection_reason ?? documentoActual.rejection_reason ?? null,
    }
  }

  return resumenDocumentoPorTicket.value[ticketId] ?? null
}

function obtenerEstadoWorkflowDocumento(documento: Documento | null | undefined, ticketId?: string) {
  const resumen = documento ? null : (ticketId ? obtenerResumenDocumento(ticketId) : null)

  return getEffectiveDocumentStatus({
    documentStatus: documento?.status ?? resumen?.status,
    latestVersionStatus: documento ? obtenerUltimaVersionDocumento(documento.id)?.status : resumen?.latestVersionStatus,
  })
}

function obtenerMotivoRechazoDocumento(documento: Documento | null | undefined, ticketId?: string) {
  if (documento) {
    const ultimaVersion = obtenerUltimaVersionDocumento(documento.id)

    if (ultimaVersion?.status === 'rejected' && ultimaVersion.rejection_reason) {
      return ultimaVersion.rejection_reason
    }

    return documento.rejection_reason ?? null
  }

  return ticketId ? (obtenerResumenDocumento(ticketId)?.rejectionReason ?? null) : null
}

function sincronizarResumenDocumento(ticketId: string) {
  const documentoActual = obtenerDocumentoActual(ticketId)

  if (!documentoActual) return

  const ultimaVersion = obtenerUltimaVersionDocumento(documentoActual.id)

  resumenDocumentoPorTicket.value = {
    ...resumenDocumentoPorTicket.value,
    [ticketId]: {
      id: documentoActual.id,
      status: documentoActual.status,
      latestVersionStatus: ultimaVersion?.status ?? null,
      latestVersionSource: ultimaVersion?.source ?? null,
      rejectionReason: ultimaVersion?.rejection_reason ?? documentoActual.rejection_reason ?? null,
    },
  }
}

function ticketEnEsperaDeCorreccionCliente(ticket: Ticket) {
  return obtenerEstadoWorkflowDocumento(obtenerDocumentoActual(ticket.id), ticket.id) === 'rejected'
}

function obtenerVersionesDocumento(documentId: string) {
  return versionesPorDocumento.value[documentId] ?? []
}

function obtenerUltimaVersionDocumento(documentId: string | null | undefined) {
  if (!documentId) return null
  return obtenerVersionesDocumento(documentId)[0] ?? null
}

function obtenerMarcaTiempoDocumento(documento: Pick<Documento, 'updated_at' | 'created_at'>) {
  return new Date(documento.updated_at ?? documento.created_at).getTime()
}

function actualizarDocumentoEnMemoria(
  ticketId: string,
  documentId: string,
  changes: Partial<Pick<Documento, 'status' | 'updated_at' | 'rejection_reason'>>
) {
  const documentos = documentosPorTicket.value[ticketId]
  if (!documentos?.length) return

  documentosPorTicket.value[ticketId] = documentos
    .map(documento => documento.id === documentId ? { ...documento, ...changes } : documento)
    .sort((a, b) => obtenerMarcaTiempoDocumento(b) - obtenerMarcaTiempoDocumento(a))
}

function actualizarVersionRecienteEnMemoria(
  documentId: string,
  changes: Partial<Pick<VersionDocumento, 'status' | 'updated_at' | 'rejection_reason'>>
) {
  const versiones = versionesPorDocumento.value[documentId]
  if (!versiones?.length) return

  versionesPorDocumento.value = {
    ...versionesPorDocumento.value,
    [documentId]: versiones.map((version, index) => index === 0 ? { ...version, ...changes } : version),
  }
}

function obtenerFaseDocumento(ticket: Ticket, documento = obtenerDocumentoActual(ticket.id)) {
  const resumen = documento ? null : obtenerResumenDocumento(ticket.id)

  return getDocumentWorkflowPhase({
    documentStatus: documento?.status ?? resumen?.status,
    latestVersionStatus: documento ? obtenerUltimaVersionDocumento(documento.id)?.status : resumen?.latestVersionStatus,
    ticketStatus: ticket.status,
    assignedTo: ticket.assigned_to,
    audience: 'lawyer',
    latestVersionSource: documento ? obtenerUltimaVersionDocumento(documento.id)?.source : resumen?.latestVersionSource,
  })
}

function obtenerVisualEstadoDocumento(ticket: Ticket, documento: Documento) {
  if (obtenerDocumentoActual(ticket.id)?.id === documento.id) {
    const fase = obtenerFaseDocumento(ticket, documento)
    return {
      label: fase.label,
      color: fase.color,
    }
  }

  const estadoWorkflow = obtenerEstadoWorkflowDocumento(documento)

  return {
    label: etiquetaEstadoDocumento[estadoWorkflow] ?? 'Borrador',
    color: colorEstadoDocumento[estadoWorkflow] ?? 'neutral',
  }
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
  if (abogadoDebeTomarCaso(ticket)) {
    errorMsg.value = 'Tomá el caso antes de abrir o revisar el documento.'
    return
  }

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
  if (abogadoDebeTomarCaso(ticket)) {
    errorMsg.value = 'Tomá el caso antes de abrir o revisar el documento.'
    return
  }

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

function obtenerEtiquetaEstadoOperacion(ticket: Ticket) {
  return obtenerEtiquetaEstadoVisible(ticket)
}

function obtenerColorEstadoOperacion(ticket: Ticket) {
  return obtenerColorEstadoVisible(ticket)
}

function obtenerEtiquetaAccion(ticket: Ticket) {
  if (ticketEnEsperaDeCorreccionCliente(ticket)) {
    return 'Esperando corrección del cliente'
  }

  if (ticket.status === 'open') {
    return ticket.assigned_to ? 'Iniciar revision' : 'Tomar caso'
  }

  return etiquetaAccion[ticket.status] ?? 'Cambiar estado'
}

function obtenerResumenCompactoTicket(ticket: Ticket) {
  if (ticket.reopen_requested) return 'Reapertura solicitada'
  if (obtenerResumenDocumento(ticket.id) || obtenerDocumentoActual(ticket.id)) {
    return obtenerFaseDocumento(ticket).label
  }
  if (ticket.wasReopened) return 'Reabierto'

  return 'Bandeja legal'
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

  if (siguienteEstado[ticket.status] && !ticketEnEsperaDeCorreccionCliente(ticket)) {
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
        label: obtenerEtiquetaEstadoOperacion(ticket),
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
  ]]

  if (ticketAsignadoAlAbogado(ticket)) {
    items[0]?.push({
      label: 'Ver documento',
      icon: 'i-lucide-file-text',
      onSelect: () => abrirDocumentoDesdeTicket(ticket),
    })
  }

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

  if (siguienteEstado[ticket.status] && !ticketEnEsperaDeCorreccionCliente(ticket)) {
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

async function aprobarDocumento(docId: string, ticket: Ticket) {
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return

  if (ticket.assigned_to !== currentUser.id) {
    errorMsg.value = 'Tomá el caso antes de aprobar el documento.'
    return
  }

  const { error } = await supabase
    .from('documents')
    .update({ status: 'approved', reviewed_by: currentUser.id, updated_at: new Date().toISOString() })
    .eq('id', docId)

  if (error) { errorMsg.value = error.message; return }
  try {
    await syncLatestDocumentVersionReview({
      documentId: docId,
      status: 'approved',
      reviewedBy: currentUser.id,
      rejectionReason: null,
    })
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'No se pudo actualizar el historial de versiones.'
    return
  }
  await cargarDocumentosTicket(ticket.id)
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
  if (!rechazoDocumento.value || rechazandoDocumento.value) return

  const payload = { ...rechazoDocumento.value }

  const razon = motivoRechazo.value.trim()
  if (!razon) {
    errorMsg.value = 'Ingresá un motivo de rechazo para continuar.'
    return
  }

  const ticket = tickets.value.find(item => item.id === payload.ticketId)
  if (!ticket) {
    errorMsg.value = 'No se encontró el ticket asociado al documento.'
    return
  }

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return

  if (ticket.assigned_to !== currentUser.id) {
    errorMsg.value = 'Tomá el caso antes de rechazar el documento.'
    return
  }

  const marcaTiempo = new Date().toISOString()
  errorMsg.value = ''
  rechazandoDocumento.value = true

  try {
    const { error: documentError } = await supabase
      .from('documents')
      .update({ status: 'rejected', reviewed_by: currentUser.id, rejection_reason: razon, updated_at: marcaTiempo })
      .eq('id', payload.docId)

    if (documentError) {
      throw new Error(documentError.message)
    }

    await syncLatestDocumentVersionReview({
      documentId: payload.docId,
      status: 'rejected',
      reviewedBy: currentUser.id,
      rejectionReason: razon,
    })

    const { error: ticketError } = await supabase
      .from('tickets')
      .update({
        status: 'open',
        assigned_to: currentUser.id,
      })
      .eq('id', ticket.id)

    if (ticketError) {
      throw new Error(ticketError.message)
    }

    const { error: historialError } = await supabase.from('ticket_historial').insert([{
      ticket_id: ticket.id,
      changed_by: currentUser.id,
      old_status: ticket.status,
      new_status: 'open',
      notes: 'Documento rechazado para corrección del cliente',
    }])

    if (historialError) {
      throw new Error(historialError.message)
    }

    ticket.status = 'open'
    ticket.assigned_to = currentUser.id
    actualizarDocumentoEnMemoria(payload.ticketId, payload.docId, {
      status: 'rejected',
      updated_at: marcaTiempo,
      rejection_reason: razon,
    })
    actualizarVersionRecienteEnMemoria(payload.docId, {
      status: 'rejected',
      updated_at: marcaTiempo,
      rejection_reason: razon,
    })
    sincronizarResumenDocumento(payload.ticketId)

    cerrarModalRechazo()
    void Promise.allSettled([
      cargarDocumentosTicket(payload.ticketId),
      cargarTickets(),
    ])
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'No se pudo rechazar el documento.'
  } finally {
    rechazandoDocumento.value = false
  }
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
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <AppPageHeader
      :eyebrow="profile?.role === 'admin' ? 'Admin' : 'Abogado'"
      :title="profile?.role === 'admin' ? 'Todos los tickets' : 'Mis casos'"
      description="Revisá solicitudes activas, documentos y reaperturas desde una sola vista."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :loading="loading" @click="cargarTickets">
          Actualizar
        </UButton>
      </template>
    </AppPageHeader>

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
        <AppFilterToolbar
          v-model:search-term="busqueda"
          v-model:per-page="cantidadPorPagina"
          title="Bandeja de tickets"
          search-placeholder="Buscar por ticket, asunto, responsable o estado"
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
                @update:open="(open) => actualizarFilaExpandida(ticket, open)"
              >
                <template #default="{ open }">
                  <div
                    role="button"
                    tabindex="0"
                    class="grid w-full grid-cols-[10rem_minmax(18rem,2fr)_11rem_9rem] gap-4 pl-5 pr-9 py-4 text-left transition hover:bg-primary/5 sm:pr-10"
                    :class="[
                      open ? 'bg-primary/6' : '',
                      ticket.reopen_requested ? 'bg-warning/5 hover:bg-warning/8' : ''
                    ]"
                    :aria-label="open ? `Minimizar ticket ${ticket.id}` : `Expandir ticket ${ticket.id}`"
                    :aria-expanded="open"
                    @click="void actualizarFilaExpandida(ticket, !open)"
                    @keydown.enter.prevent="void actualizarFilaExpandida(ticket, !open)"
                    @keydown.space.prevent="void actualizarFilaExpandida(ticket, !open)"
                  >
                    <div class="min-w-0">
                      <p class="font-semibold text-highlighted">
                        #{{ String(ticket.id).slice(0, 8) }}
                      </p>
                      <p class="mt-1 text-xs text-muted">
                        {{ obtenerResumenCompactoTicket(ticket) }}
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
                      <UBadge class="self-start" :color="obtenerColorEstadoOperacion(ticket)" variant="subtle">
                        {{ obtenerEtiquetaEstadoOperacion(ticket) }}
                      </UBadge>
                    </div>

                    <div class="whitespace-nowrap text-sm text-muted">
                      {{ formatearFecha(ticket.created_at) }}
                    </div>
                  </div>
                </template>

                <template #content>
                  <div class="border-t border-default/60 bg-elevated/35 px-5 py-5">
                    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                      <div class="grid gap-4 md:grid-cols-2">
                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Estado</p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <UBadge :color="obtenerColorEstadoOperacion(ticket)" variant="subtle">
                              {{ obtenerEtiquetaEstadoOperacion(ticket) }}
                            </UBadge>
                            <UBadge :color="colorPrioridad[ticket.priority]" variant="outline">
                              {{ etiquetaPrioridad[ticket.priority] }}
                            </UBadge>
                          </div>
                          <p class="mt-3 text-sm text-muted">
                            {{
                              ticket.reopen_requested
                                ? 'Hay una solicitud de reapertura esperando tu decisión.'
                                : obtenerFaseDocumento(ticket).description
                            }}
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Responsable y fecha</p>
                          <p class="mt-2 text-sm font-medium text-highlighted">
                            {{ obtenerNombreResponsable(ticket) }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            Creado {{ formatearFecha(ticket.created_at) }}
                          </p>
                          <p class="mt-3 text-xs text-muted">
                            {{ ticket.assigned_to ? 'Ya está asignado a un abogado.' : 'Todavía no fue tomado por nadie.' }}
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
                            {{
                              ticketEnEsperaDeCorreccionCliente(ticket)
                                ? obtenerFaseDocumento(ticket).description
                                : 'Entrá al detalle, abrí el documento vigente o cambiá el estado del caso desde un menú rápido.'
                            }}
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
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-file-text"
                          class="justify-center"
                          :disabled="abogadoDebeTomarCaso(ticket)"
                          @click="abrirDocumentoDesdeTicket(ticket)"
                        >
                          Abrir mas reciente
                        </UButton>

                        <UDropdownMenu :items="obtenerMenuEstado(ticket)">
                          <UButton
                            color="primary"
                            variant="soft"
                            trailing-icon="i-lucide-chevron-down"
                            class="justify-center"
                          >
                            Cambiar estado
                          </UButton>
                        </UDropdownMenu>

                        <template v-if="ticket.reopen_requested">
                          <UButton
                            color="warning"
                            variant="soft"
                            class="justify-center"
                            @click="aprobarReapertura(ticket)"
                          >
                            Aprobar reapertura
                          </UButton>
                          <UButton
                            color="error"
                            variant="outline"
                            class="justify-center"
                            @click="rechazarReapertura(ticket)"
                          >
                            Rechazar reapertura
                          </UButton>
                        </template>

                        <UAlert
                          v-if="abogadoDebeTomarCaso(ticket)"
                          color="warning"
                          variant="soft"
                          title="Documento bloqueado hasta tomar el caso"
                          description="Primero asignate este ticket para poder abrir, aprobar o rechazar el documento."
                        />

                        <UAlert
                          v-else-if="ticketEnEsperaDeCorreccionCliente(ticket)"
                          color="warning"
                          variant="soft"
                          title="Esperando corrección del cliente"
                          description="Ya registraste el rechazo. Cuando el cliente reenvíe una versión corregida, el ticket volverá a revisión."
                        />
                      </div>
                    </div>

                    <section class="mt-4 rounded-[1.75rem] border border-default/80 bg-default/90 p-4 shadow-sm sm:p-5">
                      <div class="flex flex-col gap-4 border-b border-default/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
                        <div class="min-w-0">
                          <div class="flex flex-wrap items-center gap-2">
                            <UBadge color="neutral" variant="soft">Documento legal</UBadge>
                            <UBadge color="primary" variant="subtle">
                              {{ documentosPorTicket[ticket.id]?.length ?? 0 }}
                            </UBadge>
                            <UBadge :color="obtenerFaseDocumento(ticket).color" variant="subtle">
                              {{ obtenerFaseDocumento(ticket).label }}
                            </UBadge>
                          </div>
                          <p class="mt-3 text-sm text-muted">
                            {{ obtenerFaseDocumento(ticket).description }}
                          </p>
                        </div>

                        <p class="text-xs text-toned">
                          Ticket #{{ String(ticket.id).slice(0, 8) }}
                        </p>
                      </div>

                      <div
                        v-if="!documentosPorTicket[ticket.id]?.length"
                        class="mt-4 rounded-2xl border border-dashed border-default bg-elevated/40 px-4 py-8 text-center"
                      >
                        <p class="font-medium text-highlighted">Todavia no hay documentos en este ticket.</p>
                        <p class="mt-2 text-sm text-muted">
                          Cuando el cliente genere un documento, lo vas a poder revisar y aprobar desde aquí.
                        </p>
                      </div>

                      <div v-else class="mt-4 grid gap-4">
                        <article
                          v-for="d in documentosPorTicket[ticket.id]"
                          :key="d.id"
                          class="rounded-[1.4rem] border border-default/80 bg-elevated/35 p-4"
                        >
                          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div class="min-w-0">
                              <div class="flex flex-wrap items-center gap-2">
                                <p class="truncate font-medium text-highlighted">
                                  {{ obtenerPlantillaDocumento(d)?.title ?? 'Documento legal' }}
                                </p>
                                <UBadge :color="obtenerVisualEstadoDocumento(ticket, d).color" variant="subtle">
                                  {{ obtenerVisualEstadoDocumento(ticket, d).label }}
                                </UBadge>
                              </div>

                              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-toned">
                                <span>Última actualización: {{ formatearFecha(d.updated_at ?? d.created_at) }}</span>
                                <span v-if="obtenerUltimaVersionDocumento(d.id)">
                                  Versión {{ obtenerUltimaVersionDocumento(d.id)?.version_number }}
                                  · {{ obtenerUltimaVersionDocumento(d.id)?.source === 'correction' ? 'Corrección del cliente' : obtenerUltimaVersionDocumento(d.id)?.source === 'manual' ? 'Ajuste manual' : 'Versión inicial' }}
                                </span>
                              </div>

                              <p class="mt-3 text-sm leading-6 text-muted">
                                Revisá el contenido legal completo con los datos ya integrados antes de aprobarlo o devolverlo con observaciones.
                              </p>
                            </div>

                            <div class="flex flex-wrap items-center gap-2">
                              <UButton
                                size="sm"
                                color="neutral"
                                variant="outline"
                                :disabled="abogadoDebeTomarCaso(ticket)"
                                @click="abrirDocumento(d, ticket)"
                              >
                                Ver documento
                              </UButton>

                              <template v-if="obtenerEstadoWorkflowDocumento(d) === 'submitted' && ticketAsignadoAlAbogado(ticket)">
                                <UButton size="sm" @click="aprobarDocumento(d.id, ticket)">
                                  Aprobar
                                </UButton>
                                <UButton size="sm" color="error" variant="outline" @click="abrirModalRechazo(d.id, ticket.id)">
                                  Rechazar
                                </UButton>
                              </template>
                            </div>
                          </div>

                          <UAlert
                            v-if="obtenerEstadoWorkflowDocumento(d) === 'rejected' && obtenerMotivoRechazoDocumento(d)"
                            color="error"
                            variant="soft"
                            title="Motivo del rechazo"
                            :description="obtenerMotivoRechazoDocumento(d)"
                            class="mt-4"
                          />

                          <div
                            v-if="obtenerVersionesDocumento(d.id).length"
                            class="mt-4 rounded-[1.25rem] border border-default/70 bg-default/80 px-4 py-4"
                          >
                            <div class="flex items-center justify-between gap-3">
                              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Historial de versiones</p>
                              <span class="text-xs text-toned">{{ obtenerVersionesDocumento(d.id).length }} registro(s)</span>
                            </div>

                            <div class="mt-3 grid gap-2">
                              <div
                                v-for="version in obtenerVersionesDocumento(d.id)"
                                :key="version.id"
                                class="rounded-2xl border border-default/70 bg-elevated/35 px-4 py-3"
                              >
                                <div class="flex flex-wrap items-center gap-2">
                                  <UBadge color="primary" variant="soft">
                                    Versión {{ version.version_number }}
                                  </UBadge>
                                  <UBadge :color="colorEstadoDocumento[version.status] ?? 'neutral'" variant="subtle">
                                    {{ etiquetaEstadoDocumento[version.status] ?? 'Borrador' }}
                                  </UBadge>
                                  <span class="text-xs text-toned">
                                    {{ version.source === 'correction' ? 'Corrección del cliente' : version.source === 'manual' ? 'Ajuste manual' : 'Versión inicial' }}
                                  </span>
                                  <span class="text-xs text-toned">
                                    {{ new Date(version.updated_at ?? version.created_at).toLocaleString('es-CR') }}
                                  </span>
                                </div>
                                <p v-if="version.rejection_reason" class="mt-2 text-sm text-error">
                                  {{ version.rejection_reason }}
                                </p>
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>
                    </section>
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

    <UModal
      :open="!!documentoActivo"
      :title="documentoActivo?.titulo"
      :description="documentoActivo ? new Date(documentoActivo.created_at).toLocaleString('es-CR') : 'Vista previa del documento legal'"
      :close="{ color: 'neutral', variant: 'outline' }"
      :ui="{
        overlay: 'fixed inset-0 bg-slate-950/72 backdrop-blur-md',
        content: 'w-[min(100vw-2rem,72rem)] max-w-5xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] shadow-[0_40px_120px_-36px_rgba(15,23,42,0.75)] backdrop-blur-2xl focus:outline-none dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]',
        header: 'min-h-0 items-start gap-4 border-b border-default/70 px-5 py-5 sm:px-6',
        body: 'overflow-y-auto bg-slate-950/4 px-4 py-4 sm:px-6 sm:py-6 dark:bg-white/0',
        footer: 'justify-end border-t border-default/70 px-5 py-4 sm:px-6',
        wrapper: 'min-w-0 pr-12',
        title: 'text-lg font-semibold text-highlighted',
        description: 'mt-2 text-sm text-muted',
        close: 'absolute top-5 end-5',
      }"
      @update:open="(open) => { if (!open) cerrarDocumento() }"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="neutral" variant="soft">Vista previa</UBadge>
          <UBadge color="primary" variant="subtle">Documento legal</UBadge>
          <UBadge color="neutral" variant="outline">Solo lectura</UBadge>
        </div>
      </template>

      <template #body>
        <article class="mx-auto w-full max-w-3xl rounded-[1.75rem] border border-default/80 bg-default/96 px-6 py-8 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.45)] sm:px-8 sm:py-10">
          <pre class="whitespace-pre-wrap font-serif text-[15px] leading-8 text-highlighted">{{ documentoActivo?.contenido }}</pre>
        </article>
      </template>
    </UModal>

    <UModal
      :open="!!rechazoDocumento"
      title="Rechazar documento"
      description="Explicá claramente qué debe corregir el cliente antes de reenviar el documento."
      @update:open="(open) => { if (!open) cerrarModalRechazo() }"
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
          <UButton color="neutral" variant="ghost" :disabled="rechazandoDocumento" @click="cerrarModalRechazo">
            Cancelar
          </UButton>
          <UButton color="error" :loading="rechazandoDocumento" :disabled="!motivoRechazo.trim() || rechazandoDocumento" @click="rechazarDocumento">
            Rechazar documento
          </UButton>
        </div>
      </template>
    </UModal>

  </div>
</template>
