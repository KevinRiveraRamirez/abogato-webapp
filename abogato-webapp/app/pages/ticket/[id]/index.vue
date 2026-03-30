<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  getEffectiveDocumentStatus,
  getDocumentWorkflowPhase,
  getTicketDisplayStatus,
  isReopenedHistoryEntry,
  ticketDisplayStatusColors,
  ticketDisplayStatusLabels,
  type TicketDisplayStatus,
} from '~/utils/dashboard'
import { isAdminLikeRole } from '~~/shared/roles'
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'
import { downloadPlainTextAsPdf } from '~/utils/download-plain-text-as-pdf'

definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const { profile, cargarPerfil } = useUsuario()
type DocumentRow = Database['public']['Tables']['documents']['Row']
type DocumentVersionRow = Database['public']['Tables']['document_versions']['Row']
type TicketFileRow = Database['public']['Tables']['ticket_files']['Row']

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
}

type Historial = {
  id: string
  ticket_id: string
  changed_by: string
  old_status: string | null
  new_status: string
  notes: string | null
  created_at: string
}

type Adjunto = {
  id: string
  name: string
  path: string
}

type Comentario = {
  id: string
  content: string
  is_internal: boolean
  author_id: string
  author_name: string | null
  created_at: string
}

type VersionDocumento = Pick<
  DocumentVersionRow,
  'id' | 'document_id' | 'version_number' | 'status' | 'source' | 'created_at' | 'updated_at' | 'rejection_reason'
>

const ticket = ref<Ticket | null>(null)
const abogadoAsignado = ref<{ display_name: string | null; office_address: string | null } | null>(null)
const historial = ref<Historial[]>([])
const adjuntos = ref<(Adjunto & { url: string })[]>([])
const comentarios = ref<Comentario[]>([])
const versionesDocumento = ref<VersionDocumento[]>([])

const nuevoComentario = ref('')
const comentarioInterno = ref(false)
const loadingComentario = ref(false)
const ticketSilenciado = ref(false)
const loadingSilencioTicket = ref(false)

const pageLoading = ref(true)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const editando = ref(false)
const editTitulo = ref('')
const editDescripcion = ref('')

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

const esCliente = computed(() => profile.value?.role === 'cliente')
const esAdmin = computed(() => isAdminLikeRole(profile.value?.role))
const esAbogado = computed(() => profile.value?.role === 'abogado')
const visibleTicketStatus = computed<TicketDisplayStatus>(() => {
  if (!ticket.value) return 'open'

  return getTicketDisplayStatus({
    status: ticket.value.status,
    wasReopened: ticket.value.status === 'open'
      && historial.value.some(entry => isReopenedHistoryEntry(entry)),
  })
})

const puedeEditarTicket = computed(() =>
  esCliente.value
  && ticket.value?.status === 'open'
  && !primerDocumentoRechazado.value
)

const puedeReabrir = computed(() =>
  esCliente.value &&
  (ticket.value?.status === 'resolved' || ticket.value?.status === 'closed') &&
  !ticket.value?.reopen_requested
)

const puedeAdjuntar = computed(() => !esAdmin.value)
const puedeComentar = computed(() => !esAdmin.value)

async function cargarTicket() {
  errorMsg.value = ''

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    errorMsg.value = 'Sesión no válida.'
    return
  }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', route.params.id as string)
    .maybeSingle()

  if (error || !data) {
    errorMsg.value = 'Ticket no encontrado.'
    return
  }

  const t = data as Ticket
  const esAbogado = profile.value?.role === 'abogado'
  const puedeVerComoAbogado = esAbogado && (t.assigned_to === authUser.id || (t.status === 'open' && !t.assigned_to))
  const tieneAcceso = isAdminLikeRole(profile.value?.role) || t.created_by === authUser.id || puedeVerComoAbogado

  if (!tieneAcceso) {
    errorMsg.value = 'No tenés acceso a este ticket.'
    return
  }

  ticket.value = t
  editTitulo.value = t.title
  editDescripcion.value = t.description ?? ''
  await cargarAbogadoAsignado(t.assigned_to)

  await Promise.all([cargarHistorial(), cargarAdjuntos(), cargarComentarios()])
}

async function cargarAbogadoAsignado(userId: string | null) {
  if (!userId) {
    abogadoAsignado.value = null
    return
  }

  const { data } = await supabase
    .from('profiles')
    .select('display_name, office_address')
    .eq('user_id', userId)
    .maybeSingle()

  abogadoAsignado.value = data ?? null
}

async function cargarHistorial() {
  const { data } = await supabase
    .from('ticket_historial')
    .select('*')
    .eq('ticket_id', route.params.id as string)
    .order('created_at', { ascending: false })

  historial.value = (data ?? []) as Historial[]
}

async function cargarAdjuntos() {
  const { data: filesData, error } = await supabase
    .from('ticket_files')
    .select('id, file_name, file_path, created_at')
    .eq('ticket_id', route.params.id as string)
    .order('created_at', { ascending: false })

  if (error) {
    errorMsg.value = error.message
    return
  }

  if ((filesData ?? []).length) {
    adjuntos.value = await Promise.all(
      ((filesData ?? []) as Pick<TicketFileRow, 'id' | 'file_name' | 'file_path'>[]).map(async (file) => {
        const { data: signed } = await supabase.storage
          .from('ticket-adjuntos')
          .createSignedUrl(file.file_path, 60)

        return {
          id: file.id,
          name: file.file_name,
          path: file.file_path,
          url: signed?.signedUrl ?? '',
        }
      })
    )

    return
  }

  const { data: storageFiles } = await supabase.storage
    .from('ticket-adjuntos')
    .list(route.params.id as string)

  const archivos = (storageFiles ?? []) as Array<{ id: string; name: string }>

  adjuntos.value = await Promise.all(
    archivos.map(async (a) => {
      const filePath = `${ticket.value!.id}/${a.name}`
      const { data: signed } = await supabase.storage
        .from('ticket-adjuntos')
        .createSignedUrl(filePath, 60)

      return {
        id: a.id,
        name: a.name,
        path: filePath,
        url: signed?.signedUrl ?? '',
      }
    })
  )
}

async function cargarVersionesDocumento() {
  const { data, error } = await supabase
    .from('document_versions')
    .select('id, document_id, version_number, status, source, created_at, updated_at, rejection_reason')
    .eq('ticket_id', route.params.id as string)
    .order('version_number', { ascending: false })

  if (error) {
    errorMsg.value = error.message
    return
  }

  versionesDocumento.value = (data ?? []) as VersionDocumento[]
}

async function cargarComentarios() {
  const esAdminOAbogado = esAdmin.value || profile.value?.role === 'abogado'

  let query = supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', route.params.id as string)
    .order('created_at', { ascending: true })

  if (!esAdminOAbogado) {
    query = query.eq('is_internal', false)
  }

  const { data, error } = await query
  if (error) {
    errorMsg.value = error.message
    return
  }

  const comentariosBase = (data ?? []) as Omit<Comentario, 'author_name'>[]
  const authorIds = [...new Set(comentariosBase.map(c => c.author_id).filter(Boolean))]

  if (!authorIds.length) {
    comentarios.value = comentariosBase.map(c => ({ ...c, author_name: null }))
    return
  }

  const { data: perfiles, error: perfilesError } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', authorIds)

  if (perfilesError) {
    errorMsg.value = perfilesError.message
    comentarios.value = comentariosBase.map(c => ({ ...c, author_name: null }))
    return
  }

  const nombresPorUsuario = new Map(
    (perfiles ?? []).map(profile => [profile.user_id, profile.display_name])
  )

  comentarios.value = comentariosBase.map(c => ({
    ...c,
    author_name: nombresPorUsuario.get(c.author_id) ?? null,
  }))
}

async function agregarComentario() {
  if (!ticket.value) return
  if (esAdmin.value) {
    errorMsg.value = 'La cuenta admin solo puede consultar el detalle del ticket.'
    return
  }

  const texto = nuevoComentario.value.trim()
  if (!texto) return

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser?.id) {
    errorMsg.value = authError?.message || 'Sesión no válida.'
    return
  }

  loadingComentario.value = true

  const { error } = await supabase.from('ticket_comments').insert([{
    ticket_id: ticket.value.id,
    author_id: authUser.id,
    content: texto,
    is_internal: esAdmin.value || profile.value?.role === 'abogado' ? comentarioInterno.value : false
  }])

  loadingComentario.value = false
  if (error) { errorMsg.value = error.message; return }

  nuevoComentario.value = ''
  comentarioInterno.value = false
  await cargarComentarios()
}

async function guardarEdicion() {
  if (!ticket.value) return
  if (esAdmin.value) {
    errorMsg.value = 'La cuenta admin no puede editar tickets desde esta vista.'
    return
  }

  const titulo = editTitulo.value.trim()
  if (!titulo) { errorMsg.value = 'El título no puede estar vacío.'; return }

  loading.value = true
  const { error } = await supabase
    .from('tickets')
    .update({ title: titulo, description: editDescripcion.value.trim() || null })
    .eq('id', ticket.value.id)

  loading.value = false
  if (error) { errorMsg.value = error.message; return }

  editando.value = false
  await cargarTicket()
}

async function solicitarReapertura() {
  if (!ticket.value) return
  if (!confirm('¿Solicitar reapertura de este ticket?')) return

  loading.value = true
  const { error } = await supabase
    .from('tickets')
    .update({ reopen_requested: true })
    .eq('id', ticket.value.id)

  loading.value = false
  if (error) { errorMsg.value = error.message; return }

  await cargarTicket()
}

async function subirArchivo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !ticket.value) return
  if (esAdmin.value) {
    errorMsg.value = 'La cuenta admin no puede adjuntar archivos desde esta vista.'
    return
  }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  if (authError || !authUser?.id) {
    errorMsg.value = authError?.message || 'Sesión no válida.'
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    errorMsg.value = 'El archivo no puede superar 10MB.'
    return
  }

  const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  if (!tiposPermitidos.includes(file.type)) {
    errorMsg.value = 'Solo se permiten archivos PDF, JPG o PNG.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const ruta = `${ticket.value.id}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage
    .from('ticket-adjuntos')
    .upload(ruta, file)

  if (error) {
    loading.value = false
    input.value = ''
    errorMsg.value = error.message
    return
  }

  const { error: fileInsertError } = await supabase
    .from('ticket_files')
    .insert([{
      ticket_id: ticket.value.id,
      file_name: file.name,
      file_path: ruta,
      file_size: file.size,
      file_type: file.type || null,
      uploaded_by: authUser.id,
    }])

  loading.value = false
  input.value = ''

  if (fileInsertError) {
    errorMsg.value = fileInsertError.message
    return
  }

  successMsg.value = 'Archivo subido correctamente.'
  await cargarAdjuntos()
}
type Documento = {
  id: string
  status: string
  field_values: Record<string, string | number | null | undefined>
  template_id: string
  created_at: string
  updated_at: string | null
  rejection_reason?: string | null
  document_templates?: { title: string | null; content: string | null } | null
}
const documentos = ref<Documento[]>([])

const documentoActual = computed(() => documentos.value[0] ?? null)

function obtenerVersionesPorDocumento(documentId: string) {
  return versionesDocumento.value.filter(version => version.document_id === documentId)
}

function obtenerUltimaVersionDocumento(documentId: string | null | undefined) {
  if (!documentId) return null
  return obtenerVersionesPorDocumento(documentId)[0] ?? null
}

function obtenerEstadoWorkflowDocumento(documento: Documento | null | undefined) {
  return getEffectiveDocumentStatus({
    documentStatus: documento?.status,
    latestVersionStatus: obtenerUltimaVersionDocumento(documento?.id)?.status,
  })
}

function obtenerMotivoRechazoDocumento(documento: Documento | null | undefined) {
  const ultimaVersion = obtenerUltimaVersionDocumento(documento?.id)

  if (ultimaVersion?.status === 'rejected' && ultimaVersion.rejection_reason) {
    return ultimaVersion.rejection_reason
  }

  return documento?.rejection_reason ?? null
}

const primerDocumentoRechazado = computed(() =>
  obtenerEstadoWorkflowDocumento(documentoActual.value) === 'rejected' ? documentoActual.value : null
)

const audienciaFlujoDocumento = computed(() => {
  if (esAbogado.value) return 'lawyer'
  if (esAdmin.value) return 'admin'
  return 'client'
})

const faseDocumentoActual = computed(() =>
  getDocumentWorkflowPhase({
    documentStatus: documentoActual.value?.status,
    latestVersionStatus: ultimaVersionDocumentoActual.value?.status,
    ticketStatus: ticket.value?.status,
    assignedTo: ticket.value?.assigned_to,
    audience: audienciaFlujoDocumento.value,
    latestVersionSource: ultimaVersionDocumentoActual.value?.source,
  })
)

function esRegistroDocumento(value: unknown): value is Record<string, string | number | null | undefined> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizarDocumento(
  row: Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'updated_at' | 'rejection_reason'> & {
    document_templates?: { title: string | null; content: string | null } | null
  }
): Documento | null {
  if (!row.status || !row.template_id || !row.created_at) return null

  return {
    id: row.id,
    status: row.status,
    field_values: esRegistroDocumento(row.field_values) ? row.field_values : {},
    template_id: row.template_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    rejection_reason: row.rejection_reason,
    document_templates: row.document_templates ?? null,
  }
}

function obtenerVariablesSistemaDocumento() {
  return {
    nombre_notario: abogadoAsignado.value?.display_name ?? null,
    direccion_notario: abogadoAsignado.value?.office_address ?? null
  }
}

async function cargarDocumentos() {
  const { data } = await supabase
    .from('documents')
    .select('*, document_templates(title, content)')
    .order('updated_at', { ascending: false })
    .eq('ticket_id', route.params.id as string)
  documentos.value = (data ?? [])
    .map((row) => normalizarDocumento(row as Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'updated_at' | 'rejection_reason'> & {
      document_templates?: { title: string | null; content: string | null } | null
    }))
    .filter((documento): documento is Documento => documento !== null)
}

async function cargarSilencioTicket() {
  if (!ticket.value || !user.value?.id) {
    ticketSilenciado.value = false
    return
  }

  const { data, error } = await supabase
    .from('ticket_notification_mutes')
    .select('ticket_id')
    .eq('ticket_id', ticket.value.id)
    .eq('user_id', user.value.id)
    .maybeSingle()

  if (error) {
    errorMsg.value = error.message
    return
  }

  ticketSilenciado.value = Boolean(data)
}

async function toggleSilencioTicket() {
  if (!ticket.value) return

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser?.id) {
    errorMsg.value = authError?.message || 'Sesión no válida.'
    return
  }

  loadingSilencioTicket.value = true
  errorMsg.value = ''
  successMsg.value = ''

  let error: { message: string } | null = null

  if (ticketSilenciado.value) {
    const result = await supabase
      .from('ticket_notification_mutes')
      .delete()
      .eq('user_id', authUser.id)
      .eq('ticket_id', ticket.value.id)

    error = result.error
  } else {
    const result = await supabase
      .from('ticket_notification_mutes')
      .upsert({
        user_id: authUser.id,
        ticket_id: ticket.value.id,
      }, {
        onConflict: 'user_id,ticket_id',
      })

    error = result.error
  }

  loadingSilencioTicket.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  ticketSilenciado.value = !ticketSilenciado.value
  successMsg.value = ticketSilenciado.value
    ? 'Silenciaste las notificaciones internas de este ticket.'
    : 'Volviste a activar las notificaciones internas de este ticket.'
}

async function cargarDetalleInicial() {
  pageLoading.value = true

  try {
    await Promise.all([cargarTicket(), cargarDocumentos(), cargarVersionesDocumento()])
    await cargarSilencioTicket()
  } finally {
    pageLoading.value = false
  }
}

const ultimaVersionDocumentoActual = computed(() =>
  documentoActual.value ? obtenerUltimaVersionDocumento(documentoActual.value.id) : null
)

const puedeCorregirDocumentoActual = computed(() =>
  esCliente.value
  && obtenerEstadoWorkflowDocumento(documentoActual.value) === 'rejected'
  && !['resolved', 'closed', 'cancelled'].includes(ticket.value?.status ?? '')
)

const clienteTieneCorreccionEnRevision = computed(() =>
  esCliente.value
  && obtenerEstadoWorkflowDocumento(documentoActual.value) === 'submitted'
  && ultimaVersionDocumentoActual.value?.source === 'correction'
)

const abogadoRecibioCorreccion = computed(() =>
  esAbogado.value
  && obtenerEstadoWorkflowDocumento(documentoActual.value) === 'submitted'
  && ultimaVersionDocumentoActual.value?.source === 'correction'
)

function obtenerVisualEstadoDocumento(documento: Documento) {
  if (documentoActual.value?.id === documento.id) {
    return {
      label: faseDocumentoActual.value.label,
      color: faseDocumentoActual.value.color,
    }
  }

  const estadoWorkflow = obtenerEstadoWorkflowDocumento(documento)

  return {
    label: etiquetaEstadoDocumento[estadoWorkflow] ?? 'Borrador',
    color: colorEstadoDocumento[estadoWorkflow] ?? 'neutral',
  }
}

function etiquetaFuenteVersion(source: string) {
  if (source === 'correction') return 'Corrección del cliente'
  if (source === 'manual') return 'Ajuste manual'
  return 'Versión inicial'
}

function obtenerMensajeExitoDesdeRuta(status: string) {
  if (status === 'document-corrected') return 'Documento corregido en espera de aprobación.'
  if (status === 'document-updated') return 'Se guardó una nueva versión del documento para continuar con la revisión.'
  return ''
}

function descargarDocumento(doc: Documento) {
  const template = doc.document_templates
  if (!template?.content) return

  const contenido = renderDocumentTemplate(
    template.content,
    doc.field_values ?? {},
    obtenerVariablesSistemaDocumento()
  )

  const titulo = template.title ?? 'documento'
  downloadPlainTextAsPdf(titulo, contenido)
}

async function abrirCorreccionDocumento(documentId?: string | null) {
  if (!ticket.value) return

  errorMsg.value = ''
  await navigateTo({
    path: `/ticket/${ticket.value.id}/documento`,
    query: documentId ? { document: documentId } : {},
  })
}

onMounted(async () => {
  await cargarPerfil()
  await cargarDetalleInicial()

  const status = typeof route.query.status === 'string' ? route.query.status : ''
  const message = obtenerMensajeExitoDesdeRuta(status)

  if (message) {
    successMsg.value = message
    await navigateTo({
      path: route.path,
      query: Object.fromEntries(
        Object.entries(route.query).filter(([key]) => key !== 'status')
      ),
    }, { replace: true })
  }
})

watch(user, async (newUser) => {
  if (newUser) {
    await cargarPerfil()
    await cargarDetalleInicial()
  }
})
</script>

<template>
  <div class="mx-auto max-w-5xl">

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

    <SkeletonTicketDetail v-if="pageLoading" />

    <div v-else-if="ticket" class="grid gap-6">
      <AppPageHeader
        eyebrow="Ticket"
        :title="ticket.title"
        :description="ticket.description || 'Seguimiento completo del trámite, documentos, comentarios e historial.'"
      >
        <template #leading>
          <UButton
            :to="isAdminLikeRole(profile?.role) ? '/admin/tickets' : profile?.role === 'abogado' ? '/lawyer/tickets' : '/tickets'"
            color="neutral"
            variant="ghost"
            leading-icon="i-lucide-arrow-left"
          >
            Volver
          </UButton>
        </template>

        <template #titleMeta>
          <UBadge :color="ticketDisplayStatusColors[visibleTicketStatus]" variant="subtle">
            {{ ticketDisplayStatusLabels[visibleTicketStatus] }}
          </UBadge>
          <UBadge :color="colorPrioridad[ticket.priority]" variant="outline">
            Prioridad: {{ etiquetaPrioridad[ticket.priority] }}
          </UBadge>
        </template>

        <template #meta>
          <p class="text-xs text-toned">
            Creado: {{ new Date(ticket.created_at).toLocaleString('es-CR') }}
          </p>
        </template>

        <template #actions>
          <UButton
            color="neutral"
            :variant="ticketSilenciado ? 'soft' : 'outline'"
            :loading="loadingSilencioTicket"
            :icon="ticketSilenciado ? 'i-lucide-bell-off' : 'i-lucide-bell-ring'"
            @click="toggleSilencioTicket"
          >
            {{ ticketSilenciado ? 'Activar notificaciones' : 'Silenciar notificaciones' }}
          </UButton>
          <UButton
            v-if="puedeCorregirDocumentoActual"
            color="warning"
            variant="soft"
            icon="i-lucide-file-warning"
            @click="void abrirCorreccionDocumento(primerDocumentoRechazado?.id)"
          >
            Corregir documento
          </UButton>
          <UButton
            v-else-if="puedeEditarTicket && !editando"
            color="neutral"
            variant="outline"
            @click="editando = true"
          >
            Editar
          </UButton>
          <UButton
            v-if="puedeReabrir"
            color="warning"
            variant="outline"
            :disabled="loading"
            @click="solicitarReapertura"
          >
            Solicitar reapertura
          </UButton>
        </template>
      </AppPageHeader>

      <UAlert
        v-if="ticket.reopen_requested"
        color="warning"
        variant="soft"
        title="Solicitud de reapertura enviada"
        description="Estamos esperando la respuesta del abogado asignado."
      />

      <UAlert
        v-if="ticketSilenciado"
        color="neutral"
        variant="soft"
        title="Notificaciones silenciadas en este ticket"
        description="No vas a recibir avisos nuevos de este trámite en la campana hasta que las vuelvas a activar."
      />

      <UAlert
        v-if="puedeCorregirDocumentoActual"
        color="warning"
        variant="soft"
        :title="faseDocumentoActual.label"
        :description="obtenerMotivoRechazoDocumento(primerDocumentoRechazado) || faseDocumentoActual.description"
      >
        <template #actions>
          <UButton
            size="sm"
            color="warning"
            variant="solid"
            @click="void abrirCorreccionDocumento(primerDocumentoRechazado?.id)"
          >
            Abrir corrección
          </UButton>
        </template>
      </UAlert>

      <UAlert
        v-else-if="clienteTieneCorreccionEnRevision && !successMsg"
        color="info"
        variant="soft"
        :title="faseDocumentoActual.label"
        :description="faseDocumentoActual.description"
      />

      <UAlert
        v-else-if="abogadoRecibioCorreccion"
        color="info"
        variant="soft"
        :title="faseDocumentoActual.label"
        :description="faseDocumentoActual.description"
      />

      <UCard v-if="editando">
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Editar ticket</h2>
            <p class="mt-1 text-sm text-muted">Podés ajustar el título y la descripción mientras el ticket esté abierto.</p>
          </div>
        </template>
        <div class="grid gap-4">
          <UFormField label="Título" required>
            <UInput
              v-model="editTitulo"
              placeholder="Título *"
            />
          </UFormField>
          <UFormField label="Descripción">
            <UTextarea
              v-model="editDescripcion"
              placeholder="Descripción"
              :rows="4"
            />
          </UFormField>
          <div class="flex flex-wrap gap-2">
            <UButton :loading="loading" @click="guardarEdicion">
              Guardar
            </UButton>
            <UButton color="neutral" variant="ghost" @click="editando = false">
              Cancelar
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard v-else>
        <p v-if="ticket.description" class="text-sm text-muted">{{ ticket.description }}</p>
        <p v-else class="text-sm italic text-toned">Sin descripción.</p>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Documento legal</h2>
            <p class="mt-1 text-sm text-muted">Estado del documento legal asociado a este ticket.</p>
          </div>
        </template>

        <div v-if="documentos.length" class="grid gap-3">
          <UCard v-for="d in documentos" :key="d.id">
            <div class="flex justify-between items-center gap-3">
              <span class="text-sm text-highlighted">{{ d.document_templates?.title ?? 'Documento generado' }}</span>
              <UBadge :color="obtenerVisualEstadoDocumento(d).color" variant="subtle">
                {{ obtenerVisualEstadoDocumento(d).label }}
              </UBadge>
            </div>
            <p class="mt-2 text-xs text-muted">
              {{ new Date(d.updated_at ?? d.created_at).toLocaleString('es-CR') }}
            </p>
            <UAlert
              v-if="obtenerEstadoWorkflowDocumento(d) === 'rejected' && obtenerMotivoRechazoDocumento(d) && documentoActual?.id === d.id"
              color="error"
              variant="soft"
              title="Motivo del rechazo"
              :description="obtenerMotivoRechazoDocumento(d)"
              class="mt-3"
            />
            <div v-if="esCliente && obtenerEstadoWorkflowDocumento(d) === 'submitted' && documentoActual?.id === d.id" class="mt-3 rounded-2xl border border-default/80 bg-elevated/50 px-4 py-3 text-sm text-muted">
              {{ faseDocumentoActual.description }}
            </div>
            <div v-if="esAbogado && obtenerEstadoWorkflowDocumento(d) === 'submitted' && documentoActual?.id === d.id && ultimaVersionDocumentoActual?.source === 'correction'" class="mt-3 rounded-2xl border border-info/20 bg-info/5 px-4 py-3 text-sm text-info">
              {{ faseDocumentoActual.description }}
            </div>
            <div v-if="esCliente && obtenerEstadoWorkflowDocumento(d) === 'approved' && documentoActual?.id === d.id" class="mt-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
              {{ faseDocumentoActual.description }}
            </div>
            <div v-if="puedeCorregirDocumentoActual && documentoActual?.id === d.id" class="mt-3 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">
              {{ faseDocumentoActual.description }}
            </div>
            <div v-else-if="esCliente && obtenerEstadoWorkflowDocumento(d) === 'rejected' && documentoActual?.id === d.id" class="mt-3 rounded-2xl border border-default/80 bg-elevated/50 px-4 py-3 text-sm text-muted">
              Este ticket ya no admite correcciones. La observación queda visible solo como referencia del historial.
            </div>
            <UButton
              v-if="obtenerEstadoWorkflowDocumento(d) === 'approved'"
              size="sm"
              class="mt-3"
              @click="descargarDocumento(d)"
            >
              Descargar documento
            </UButton>
            <UButton
              v-if="puedeCorregirDocumentoActual && documentoActual?.id === d.id"
              size="sm"
              color="warning"
              variant="solid"
              class="mt-3"
              @click="void abrirCorreccionDocumento(d.id)"
            >
              Corregir documento
            </UButton>

            <div v-if="obtenerVersionesPorDocumento(d.id).length" class="mt-5 rounded-[1.4rem] border border-default/70 bg-elevated/40 px-4 py-4">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Historial de versiones</p>
              <div class="mt-3 grid gap-3">
                <div
                  v-for="version in obtenerVersionesPorDocumento(d.id)"
                  :key="version.id"
                  class="rounded-2xl border border-default/70 bg-default/80 px-4 py-3"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge color="primary" variant="soft">
                      Versión {{ version.version_number }}
                    </UBadge>
                    <UBadge :color="colorEstadoDocumento[version.status] ?? 'neutral'" variant="subtle">
                      {{ etiquetaEstadoDocumento[version.status] ?? 'Borrador' }}
                    </UBadge>
                    <span class="text-xs text-toned">{{ etiquetaFuenteVersion(version.source) }}</span>
                  </div>
                  <p class="mt-2 text-xs text-muted">
                    {{ new Date(version.created_at).toLocaleString('es-CR') }}
                  </p>
                  <p v-if="version.rejection_reason" class="mt-2 text-sm text-error">
                    {{ version.rejection_reason }}
                  </p>
                </div>
              </div>
            </div>
          </UCard>
        </div>
        <div v-else>
          <p class="text-sm text-muted">
            Los datos del documento ya se completan al crear el ticket. Cuando el abogado lo revise, aparecerá aquí.
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Documentos adjuntos</h2>
            <p class="mt-1 text-sm text-muted">Archivos de soporte del trámite.</p>
          </div>
        </template>

        <div v-if="adjuntos.length" class="grid gap-2">
          <UCard
            v-for="a in adjuntos"
            :key="a.id"
            :ui="{ body: 'flex items-center justify-between gap-3 px-4 py-3 text-sm' }"
          >
            <span class="truncate text-muted">{{ a.name }}</span>
            <UButton
              :href="a.url"
              target="_blank"
              size="sm"
              color="neutral"
              variant="outline"
            >
              Descargar
            </UButton>
          </UCard>
        </div>
        <p v-else class="text-sm text-muted">No hay archivos adjuntos.</p>

        <div v-if="puedeAdjuntar" class="mt-4">
          <label class="inline-flex cursor-pointer items-center gap-2">
            <UButton as="span" color="neutral" variant="outline">
              Adjuntar archivo
            </UButton>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              class="hidden"
              :disabled="loading"
              @change="subirArchivo"
            >
          </label>
          <p class="mt-2 text-xs text-toned">PDF, JPG o PNG. Máximo 10MB.</p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Comentarios</h2>
            <p class="mt-1 text-sm text-muted">Conversación del trámite y notas internas cuando correspondan.</p>
          </div>
        </template>

        <div v-if="comentarios.length" class="mb-4 grid gap-3">
          <UCard
            v-for="c in comentarios"
            :key="c.id"
            :variant="c.is_internal ? 'soft' : 'outline'"
          >
            <p class="text-sm text-muted">{{ c.content }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <UBadge v-if="c.is_internal" color="warning" variant="subtle">Interno</UBadge>
              <span class="text-xs text-muted">{{ c.author_name || 'Usuario' }}</span>
              <span class="text-xs text-toned">{{ new Date(c.created_at).toLocaleString('es-CR') }}</span>
            </div>
          </UCard>
        </div>
        <p v-else class="mb-4 text-sm text-muted">Sin comentarios.</p>

        <div v-if="puedeComentar" class="grid gap-3">
          <UFormField label="Nuevo comentario">
            <UTextarea
              v-model="nuevoComentario"
              placeholder="Escribir comentario..."
              :rows="3"
            />
          </UFormField>
          <div class="flex items-center justify-between flex-wrap gap-3">
            <UCheckbox
              v-if="esAbogado"
              v-model="comentarioInterno"
              label="Solo interno (no visible al cliente)"
            />
            <UButton
              :disabled="loadingComentario || !nuevoComentario.trim()"
              :loading="loadingComentario"
              @click="agregarComentario"
            >
              Agregar
            </UButton>
          </div>
        </div>
        <p v-else class="text-sm text-muted">
          La cuenta admin puede revisar la conversación, pero no agregar comentarios desde esta pantalla.
        </p>
      </UCard>

      <UCard v-if="historial.length">
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Historial</h2>
            <p class="mt-1 text-sm text-muted">Cambios de estado y notas registradas en el caso.</p>
          </div>
        </template>
        <div class="border-l-2 border-default pl-4 grid gap-4">
          <div v-for="h in historial" :key="h.id">
            <p class="text-sm text-muted">
              <span v-if="h.old_status">
                {{ etiquetaEstado[h.old_status] ?? h.old_status }} →
              </span>
              <strong>{{ etiquetaEstado[h.new_status] ?? h.new_status }}</strong>
            </p>
            <p v-if="h.notes" class="text-sm text-muted">{{ h.notes }}</p>
            <p class="text-xs text-toned">
              {{ new Date(h.created_at).toLocaleString('es-CR') }}
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
