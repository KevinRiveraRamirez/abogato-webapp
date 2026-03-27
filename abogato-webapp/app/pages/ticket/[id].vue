<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'

definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const { profile, cargarPerfil } = useUsuario()
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
  name: string
  id: string
}

type Comentario = {
  id: string
  content: string
  is_internal: boolean
  author_id: string
  author_name: string | null
  created_at: string
}

const ticket = ref<Ticket | null>(null)
const abogadoAsignado = ref<{ display_name: string | null; office_address: string | null } | null>(null)
const historial = ref<Historial[]>([])
const adjuntos = ref<(Adjunto & { url: string })[]>([])
const comentarios = ref<Comentario[]>([])

const nuevoComentario = ref('')
const comentarioInterno = ref(false)
const loadingComentario = ref(false)

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

const colorEstado: Record<string, 'warning' | 'info' | 'success' | 'neutral' | 'error'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
  cancelled: 'error'
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
const esAdmin = computed(() => profile.value?.role === 'admin')
const esAbogado = computed(() => profile.value?.role === 'abogado')

const puedeEditar = computed(() =>
  esCliente.value && ticket.value?.status === 'open'
)

const puedeReabrir = computed(() =>
  esCliente.value &&
  (ticket.value?.status === 'resolved' || ticket.value?.status === 'closed') &&
  !ticket.value?.reopen_requested
)

const puedeAdjuntar = computed(() => !esAdmin.value)
const puedeComentar = computed(() => !esAdmin.value)

async function cargarTicket() {
  loading.value = true
  errorMsg.value = ''

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    errorMsg.value = 'Sesión no válida.'
    loading.value = false
    return
  }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', route.params.id as string)
    .maybeSingle()

  if (error || !data) {
    errorMsg.value = 'Ticket no encontrado.'
    loading.value = false
    return
  }

  const t = data as Ticket
  const esAbogado = profile.value?.role === 'abogado'
  const puedeVerComoAbogado = esAbogado && (t.assigned_to === authUser.id || (t.status === 'open' && !t.assigned_to))
  const tieneAcceso = profile.value?.role === 'admin' || t.created_by === authUser.id || puedeVerComoAbogado

  if (!tieneAcceso) {
    errorMsg.value = 'No tenés acceso a este ticket.'
    loading.value = false
    return
  }

  ticket.value = t
  editTitulo.value = t.title
  editDescripcion.value = t.description ?? ''
  await cargarAbogadoAsignado(t.assigned_to)

  await Promise.all([cargarHistorial(), cargarAdjuntos(), cargarComentarios()])
  loading.value = false
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
  const { data } = await supabase.storage
    .from('ticket-adjuntos')
    .list(route.params.id as string)

  const archivos = (data ?? []) as Adjunto[]

  adjuntos.value = await Promise.all(
    archivos.map(async (a) => {
      const { data: signed } = await supabase.storage
        .from('ticket-adjuntos')
        .createSignedUrl(`${ticket.value!.id}/${a.name}`, 60)
      return { ...a, url: signed?.signedUrl ?? '' }
    })
  )
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

  loading.value = false
  input.value = ''

  if (error) { errorMsg.value = error.message; return }

  successMsg.value = 'Archivo subido correctamente.'
  await cargarAdjuntos()
}
type Documento = {
  id: string
  status: string
  field_values: Record<string, string | number | null | undefined>
  template_id: string
  created_at: string
  rejection_reason?: string | null
  document_templates?: { title: string | null; content: string | null } | null
}
const documentos = ref<Documento[]>([])

function esRegistroDocumento(value: unknown): value is Record<string, string | number | null | undefined> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizarDocumento(
  row: Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'rejection_reason'> & {
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
    .order('created_at', { ascending: false })
    .eq('ticket_id', route.params.id as string)
  documentos.value = (data ?? [])
    .map((row) => normalizarDocumento(row as Pick<DocumentRow, 'id' | 'status' | 'field_values' | 'template_id' | 'created_at' | 'rejection_reason'> & {
      document_templates?: { title: string | null; content: string | null } | null
    }))
    .filter((documento): documento is Documento => documento !== null)
}

function descargarDocumento(doc: Documento) {
  const template = doc.document_templates
  if (!template?.content) return

  const contenido = renderDocumentTemplate(
    template.content,
    doc.field_values ?? {},
    obtenerVariablesSistemaDocumento()
  )

  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.title ?? 'documento'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
onMounted(async () => {
  await cargarPerfil()
  await Promise.all([cargarTicket(), cargarDocumentos()])
})

watch(user, async (newUser) => {
  if (newUser) {
    await cargarPerfil()
    await Promise.all([cargarTicket(), cargarDocumentos()])
  }
})
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-6">
      <UButton
        :to="profile?.role === 'admin' ? '/admin/tickets' : profile?.role === 'abogado' ? '/lawyer/tickets' : '/tickets'"
        color="neutral"
        variant="ghost"
        leading-icon="i-lucide-arrow-left"
      >
        Volver
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

    <UCard v-if="loading">
      <p class="text-sm text-muted">Cargando...</p>
    </UCard>

    <div v-else-if="ticket" class="grid gap-6">
      <UCard>
        <div class="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h1 class="text-2xl font-semibold text-highlighted">{{ ticket.title }}</h1>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <UBadge :color="colorEstado[ticket.status]" variant="subtle">
                {{ etiquetaEstado[ticket.status] }}
              </UBadge>
              <UBadge :color="colorPrioridad[ticket.priority]" variant="outline">
                Prioridad: {{ etiquetaPrioridad[ticket.priority] }}
              </UBadge>
            </div>
            <p class="mt-1 text-xs text-toned">
              Creado: {{ new Date(ticket.created_at).toLocaleString('es-CR') }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="puedeEditar && !editando"
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
          </div>
        </div>
        <UAlert
          v-if="ticket.reopen_requested"
          color="warning"
          variant="soft"
          title="Solicitud de reapertura enviada"
          description="Estamos esperando la respuesta del abogado asignado."
          class="mt-4"
        />
      </UCard>

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
              <UBadge :color="colorEstadoDocumento[d.status] ?? 'neutral'" variant="subtle">
                {{ etiquetaEstadoDocumento[d.status] ?? 'Borrador' }}
              </UBadge>
            </div>
            <p class="mt-2 text-xs text-muted">
              {{ new Date(d.created_at).toLocaleString('es-CR') }}
            </p>
            <UAlert
              v-if="d.status === 'rejected' && d.rejection_reason"
              color="error"
              variant="soft"
              title="Motivo del rechazo"
              :description="d.rejection_reason"
              class="mt-3"
            />
            <UButton
              v-if="d.status === 'approved'"
              size="sm"
              class="mt-3"
              @click="descargarDocumento(d)"
            >
              Descargar documento
            </UButton>
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
