<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const { profile, cargarPerfil } = useUsuario()

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

const claseEstado: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700'
}

const etiquetaPrioridad: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta'
}

const esCliente = computed(() => !!ticket.value)
const esAdmin = computed(() => profile.value?.role === 'admin')

const puedeEditar = computed(() =>
  (esCliente.value || esAdmin.value) && ticket.value?.status === 'open'
)

const puedeReabrir = computed(() =>
  esCliente.value &&
  (ticket.value?.status === 'resolved' || ticket.value?.status === 'closed') &&
  !ticket.value?.reopen_requested
)

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

  await Promise.all([cargarHistorial(), cargarAdjuntos(), cargarComentarios()])
  loading.value = false
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
// --- Generación de documentos ---
type Field = { key: string; label: string; type: 'text' | 'date' | 'number' }
type Template = { id: string; title: string; content: string; fields: Field[]; servicio_id: number }
type Documento = { id: string; status: string; field_values: any; template_id: string; created_at: string }

const mostrarGenerador = ref(false)
const plantillas = ref<Template[]>([])
const plantillaSeleccionada = ref<Template | null>(null)
const fieldValues = ref<Record<string, string>>({})
const pasoDoc = ref<'seleccionar' | 'llenar' | 'previsualizar'>('seleccionar')
const documentos = ref<Documento[]>([])
const loadingDoc = ref(false)

const documentoGenerado = computed(() => {
  if (!plantillaSeleccionada.value) return ''
  let content = plantillaSeleccionada.value.content
  for (const [key, value] of Object.entries(fieldValues.value)) {
    content = content.replaceAll(`{{${key}}}`, value || `[${key}]`)
  }
  return content
})

async function cargarPlantillas() {
  const { data } = await supabase.from('document_templates').select('*').eq('activo', true)
  plantillas.value = data ?? []
}

async function cargarDocumentos() {
  const { data } = await supabase
    .from('documents')
    .select('*, document_templates(title, content)')
    .eq('ticket_id', route.params.id as string)
  documentos.value = data ?? []
}

function descargarDocumento(doc: any) {
  const template = doc.document_templates
  if (!template) return

  let contenido = template.content
  for (const [key, value] of Object.entries(doc.field_values as Record<string, string>)) {
    contenido = contenido.replaceAll(`{{${key}}}`, value)
  }

  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.title}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function seleccionarPlantilla(p: Template) {
  plantillaSeleccionada.value = p
  fieldValues.value = {}
  p.fields.forEach(f => { fieldValues.value[f.key] = '' })
  pasoDoc.value = 'llenar'
}

function previsualizarDoc() {
  const vacios = plantillaSeleccionada.value?.fields.filter(f => !fieldValues.value[f.key]?.trim())
  if (vacios?.length) { errorMsg.value = 'Completá todos los campos.'; return }
  errorMsg.value = ''
  pasoDoc.value = 'previsualizar'
}

async function enviarDocumento() {
  if (!plantillaSeleccionada.value) return
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) { errorMsg.value = 'Sesión no válida.'; return }
  
  loadingDoc.value = true
  const { error } = await supabase.from('documents').insert([{
    ticket_id: route.params.id as string,
    template_id: plantillaSeleccionada.value.id,
    field_values: fieldValues.value,
    status: 'submitted',
    created_by: authUser.id
  }])
  loadingDoc.value = false
  if (error) { errorMsg.value = error.message; return }
  mostrarGenerador.value = false
  pasoDoc.value = 'seleccionar'
  plantillaSeleccionada.value = null
  successMsg.value = 'Documento enviado al abogado correctamente.'
  await cargarDocumentos()
}
onMounted(async () => {
  await cargarPerfil()
  await cargarTicket()
  await Promise.all([cargarPlantillas(), cargarDocumentos()])
})

watch(user, async (newUser) => {
  if (newUser) {
    await cargarPerfil()
    await cargarTicket()
    await Promise.all([cargarPlantillas(), cargarDocumentos()])
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4">
    <NuxtLink :to="profile?.role === 'abogado' || profile?.role === 'admin' ? '/lawyer/tickets' : '/tickets'" class="text-sm text-gray-500 hover:underline mb-6 inline-block">
      ← Volver
    </NuxtLink>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
      {{ successMsg }}
    </div>

    <p v-if="loading" class="text-gray-500 text-sm">Cargando...</p>

    <div v-else-if="ticket">
      <div class="flex justify-between items-start gap-3 flex-wrap mb-4">
        <div>
          <h1 class="text-2xl font-semibold">{{ ticket.title }}</h1>
          <div class="flex gap-2 mt-2 items-center flex-wrap">
            <span class="text-xs px-2 py-0.5 rounded-full" :class="claseEstado[ticket.status]">
              {{ etiquetaEstado[ticket.status] }}
            </span>
            <span class="text-xs text-gray-500">
              Prioridad: {{ etiquetaPrioridad[ticket.priority] }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-1">
            Creado: {{ new Date(ticket.created_at).toLocaleString('es-CR') }}
          </p>
          <p v-if="ticket.reopen_requested" class="text-xs text-amber-600 mt-1">
            Solicitud de reapertura enviada — esperando respuesta del abogado.
          </p>
        </div>

        <div class="flex gap-2 flex-wrap">
          <button
            v-if="puedeEditar && !editando"
            class="text-sm border px-3 py-1 rounded"
            @click="editando = true"
          >
            Editar
          </button>
          <button
            v-if="puedeReabrir"
            class="text-sm border px-3 py-1 rounded"
            :disabled="loading"
            @click="solicitarReapertura"
          >
            Solicitar reapertura
          </button>
        </div>
      </div>

      <div v-if="editando" class="border rounded p-4 mb-6 bg-gray-50">
        <h2 class="font-medium mb-3">Editar ticket</h2>
        <div class="grid gap-3">
          <input
            v-model="editTitulo"
            class="border rounded px-3 py-2 w-full"
            placeholder="Título *"
          />
          <textarea
            v-model="editDescripcion"
            class="border rounded px-3 py-2 w-full"
            placeholder="Descripción"
            rows="4"
          />
          <div class="flex gap-2">
            <button
              class="bg-green-600 text-white px-4 py-2 rounded text-sm"
              :disabled="loading"
              @click="guardarEdicion"
            >
              Guardar
            </button>
            <button class="border px-4 py-2 rounded text-sm" @click="editando = false">
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <div v-else class="mb-6">
        <p v-if="ticket.description" class="text-gray-700">{{ ticket.description }}</p>
        <p v-else class="text-gray-400 italic text-sm">Sin descripción.</p>
      </div>

      <!-- Generación de documentos legales -->
<div class="mb-6">
  <div class="flex items-center justify-between mb-3">
    <h2 class="font-medium">Documento legal</h2>
    <button
      v-if="esCliente && ticket.status === 'open' && !documentos.length"
      class="text-sm bg-green-600 text-white px-3 py-1 rounded"
      @click="mostrarGenerador = !mostrarGenerador"
    >
      {{ mostrarGenerador ? 'Cancelar' : 'Generar documento' }}
    </button>
  </div>

 <div v-if="documentos.length" class="grid gap-2 mb-3">
  <div v-for="d in documentos" :key="d.id" class="border rounded px-3 py-2 text-sm">
    <div class="flex justify-between items-center">
      <span class="text-gray-700">{{ d.document_templates?.title ?? 'Documento generado' }}</span>
      <span class="text-xs px-2 py-0.5 rounded-full"
        :class="{
          'bg-yellow-100 text-yellow-800': d.status === 'submitted',
          'bg-green-100 text-green-800': d.status === 'approved',
          'bg-red-100 text-red-800': d.status === 'rejected',
          'bg-gray-100 text-gray-600': d.status === 'draft'
        }">
        {{ d.status === 'submitted' ? 'En revisión' : d.status === 'approved' ? 'Aprobado' : d.status === 'rejected' ? 'Rechazado' : 'Borrador' }}
      </span>
    </div>
    <button
      v-if="d.status === 'approved'"
      class="text-xs text-green-600 hover:underline mt-2"
      @click="descargarDocumento(d)"
    >
      Descargar documento
    </button>
  </div>
</div>

  <div v-if="mostrarGenerador" class="border rounded-xl p-4 mt-3">
    <div v-if="pasoDoc === 'seleccionar'">
      <p class="text-sm font-medium mb-3">Seleccioná el tipo de documento</p>
      <div v-if="!plantillas.length" class="text-sm text-gray-400">No hay plantillas disponibles.</div>
      <div class="grid gap-2">
        <div v-for="p in plantillas" :key="p.id"
          class="border rounded-lg p-3 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors text-sm"
          @click="seleccionarPlantilla(p)">
          <p class="font-medium">{{ p.title }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ p.fields.length }} campos</p>
        </div>
      </div>
    </div>

    <div v-if="pasoDoc === 'llenar'">
      <div class="flex justify-between items-center mb-3">
        <p class="text-sm font-medium">{{ plantillaSeleccionada?.title }}</p>
        <button class="text-xs text-gray-500 hover:underline" @click="pasoDoc = 'seleccionar'">← Cambiar</button>
      </div>
      <div class="grid gap-3">
        <div v-for="f in plantillaSeleccionada?.fields" :key="f.key" class="grid gap-1">
          <label class="text-xs font-medium">{{ f.label }} *</label>
          <input v-model="fieldValues[f.key]"
            :type="f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'"
            class="border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500"
            :placeholder="f.label" />
        </div>
      </div>
      <button class="mt-4 bg-green-600 text-white px-4 py-2 rounded text-sm" @click="previsualizarDoc">
        Previsualizar →
      </button>
    </div>

    <div v-if="pasoDoc === 'previsualizar'">
      <div class="flex justify-between items-center mb-3">
        <p class="text-sm font-medium">Previsualización</p>
        <button class="text-xs text-gray-500 hover:underline" @click="pasoDoc = 'llenar'">← Editar</button>
      </div>
      <div class="border rounded p-4 text-sm font-serif leading-relaxed whitespace-pre-wrap mb-4 bg-gray-50">
        {{ documentoGenerado }}
      </div>
      <div class="flex gap-2">
        <button class="bg-green-600 text-white px-4 py-2 rounded text-sm" :disabled="loadingDoc" @click="enviarDocumento">
          {{ loadingDoc ? 'Enviando...' : 'Enviar al abogado' }}
        </button>
        <button class="border px-4 py-2 rounded text-sm" @click="pasoDoc = 'llenar'">Corregir</button>
      </div>
    </div>
  </div>
</div>
      <div class="mb-6">
        <h2 class="font-medium mb-3">Documentos adjuntos</h2>

        <div v-if="adjuntos.length" class="grid gap-2 mb-3">
          <div
            v-for="a in adjuntos"
            :key="a.id"
            class="flex items-center justify-between border rounded px-3 py-2 text-sm"
          >
            <span class="text-gray-700 truncate">{{ a.name }}</span>
            <a
              :href="a.url"
              target="_blank"
              class="text-green-600 hover:underline ml-4 shrink-0"
            >
              Descargar
            </a>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400 mb-3">No hay archivos adjuntos.</p>

        <label class="flex items-center gap-2 cursor-pointer w-fit">
          <span class="border px-3 py-1 rounded text-sm">Adjuntar archivo</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            class="hidden"
            :disabled="loading"
            @change="subirArchivo"
          />
        </label>
        <p class="text-xs text-gray-400 mt-1">PDF, JPG o PNG. Máximo 10MB.</p>
      </div>

      <div class="mt-6">
        <h2 class="font-medium mb-3">Comentarios</h2>

        <div v-if="comentarios.length" class="grid gap-3 mb-4">
          <div
            v-for="c in comentarios"
            :key="c.id"
            class="border rounded px-3 py-2 text-sm"
            :class="c.is_internal ? 'bg-amber-50 border-amber-200' : 'bg-white'"
          >
            <p class="text-gray-700">{{ c.content }}</p>
            <div class="flex gap-2 mt-1 items-center">
              <span v-if="c.is_internal" class="text-xs text-amber-600">Interno</span>
              <span class="text-xs text-gray-500">
                {{ c.author_name || 'Usuario' }}
              </span>
              <span class="text-xs text-gray-400">
                {{ new Date(c.created_at).toLocaleString('es-CR') }}
              </span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400 mb-4">Sin comentarios.</p>

        <div class="grid gap-2">
          <textarea
            v-model="nuevoComentario"
            class="border rounded px-3 py-2 w-full text-sm"
            placeholder="Escribir comentario..."
            rows="3"
          />
          <div class="flex items-center justify-between flex-wrap gap-2">
            <label v-if="esAdmin || profile?.role === 'abogado'" class="flex items-center gap-2 text-sm">
              <input v-model="comentarioInterno" type="checkbox" />
              Solo interno (no visible al cliente)
            </label>
            <button
              class="bg-green-600 text-white px-4 py-2 rounded text-sm w-fit"
              :disabled="loadingComentario || !nuevoComentario.trim()"
              @click="agregarComentario"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>

      <div v-if="historial.length" class="mt-6">
        <h2 class="font-medium mb-3">Historial</h2>
        <div class="border-l-2 border-gray-200 pl-4 grid gap-4">
          <div v-for="h in historial" :key="h.id">
            <p class="text-sm text-gray-700">
              <span v-if="h.old_status">
                {{ etiquetaEstado[h.old_status] ?? h.old_status }} →
              </span>
              <strong>{{ etiquetaEstado[h.new_status] ?? h.new_status }}</strong>
            </p>
            <p v-if="h.notes" class="text-sm text-gray-500">{{ h.notes }}</p>
            <p class="text-xs text-gray-400">
              {{ new Date(h.created_at).toLocaleString('es-CR') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
