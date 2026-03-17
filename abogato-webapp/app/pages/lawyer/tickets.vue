<script setup lang="ts">
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'

definePageMeta({ layout: 'app', middleware: ['auth', 'lawyer'] })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()
type FieldValue = string | number | null | undefined

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

type Documento = {
  id: string
  status: string
  field_values: any
  template_id: string
  created_at: string
  ticket_id: string
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
const documentosPorTicket = ref<Record<string, Documento[]>>({})
const perfilesAbogados = ref<Record<string, PerfilAbogado>>({})
const ticketExpandido = ref<string | null>(null)
const documentoActivo = ref<DocumentoModal | null>(null)

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

const ticketsFiltrados = computed(() => {
  if (filtroEstado.value === 'todos') return tickets.value
  return tickets.value.filter(t => t.status === filtroEstado.value)
})

const ticketsConReapertura = computed(() =>
  tickets.value.filter(t => t.reopen_requested)
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
  tickets.value = data ?? []
}

async function cargarDocumentosTicket(ticketId: string) {
  const { data } = await supabase
    .from('documents')
    .select('id, status, field_values, template_id, created_at, ticket_id, document_templates(title, content)')
    .eq('ticket_id', ticketId)
  documentosPorTicket.value[ticketId] = (data ?? []) as Documento[]
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

function cerrarDocumento() {
  documentoActivo.value = null
}

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

async function rechazarDocumento(docId: string, ticketId: string) {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return

  const { error } = await supabase
    .from('documents')
    .update({ status: 'rejected', reviewed_by: authUser.id })
    .eq('id', docId)

  if (error) { errorMsg.value = error.message; return }
  await cargarDocumentosTicket(ticketId)
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
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">
        {{ profile?.role === 'admin' ? 'Todos los tickets' : 'Mis casos' }}
      </h1>
      <button class="text-sm border px-3 py-1 rounded" :disabled="loading" @click="cargarTickets">
        Actualizar
      </button>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{{ errorMsg }}</div>

    <div v-if="ticketsConReapertura.length" class="border border-amber-300 rounded p-4 mb-6 bg-amber-50">
      <h2 class="font-medium text-amber-800 mb-3">Solicitudes de reapertura</h2>
      <div class="grid gap-3">
        <div v-for="t in ticketsConReapertura" :key="t.id"
          class="flex justify-between items-center gap-2 flex-wrap bg-white rounded p-3 border border-amber-200">
          <div>
            <p class="font-medium text-sm">{{ t.title }}</p>
            <span class="text-xs px-2 py-0.5 rounded-full" :class="claseEstado[t.status]">
              {{ etiquetaEstado[t.status] }}
            </span>
          </div>
          <div class="flex gap-2">
            <button class="text-sm bg-green-600 text-white px-3 py-1 rounded" :disabled="loading" @click="aprobarReapertura(t)">Aprobar</button>
            <button class="text-sm border border-red-300 text-red-600 px-3 py-1 rounded" :disabled="loading" @click="rechazarReapertura(t)">Rechazar</button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-wrap mb-4">
      <button v-for="f in ['todos', 'open', 'in_progress', 'resolved', 'closed', 'cancelled']" :key="f"
        class="px-3 py-1 rounded border text-sm"
        :class="filtroEstado === f ? 'bg-green-600 text-white border-green-600' : 'border-gray-300'"
        @click="filtroEstado = f">
        {{ f === 'todos' ? 'Todos' : etiquetaEstado[f] }}
      </button>
    </div>

    <p v-if="loading" class="text-gray-500 text-sm">Cargando...</p>

    <div v-else-if="ticketsFiltrados.length === 0" class="text-center py-10 text-gray-400">
      <p>No hay tickets{{ filtroEstado !== 'todos' ? ' con ese estado' : '' }}.</p>
    </div>

    <div v-else class="grid gap-3">
        <div v-for="t in ticketsFiltrados" :key="t.id" class="border rounded p-4">
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <NuxtLink :to="`/ticket/${t.id}`" class="font-medium hover:underline">
              {{ t.title }}
            </NuxtLink>
            <div class="flex gap-2 mt-1 flex-wrap items-center">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="claseEstado[t.status]">
                {{ etiquetaEstado[t.status] }}
              </span>
              <span class="text-xs text-gray-500">Prioridad: {{ etiquetaPrioridad[t.priority] }}</span>
            </div>
            <p class="text-xs text-gray-400 mt-1">{{ new Date(t.created_at).toLocaleDateString('es-CR') }}</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            <NuxtLink
              :to="`/ticket/${t.id}`"
              class="text-sm border px-3 py-1 rounded"
            >
              Ver detalle
            </NuxtLink>
            <button
              class="text-sm border px-3 py-1 rounded"
              @click="toggleDocumentos(t)">
              {{ ticketExpandido === t.id ? 'Ocultar docs' : 'Ver documentos' }}
            </button>
            <button v-if="siguienteEstado[t.status]"
              class="bg-green-600 text-white text-sm px-3 py-1 rounded"
              :disabled="loading" @click="avanzarEstado(t)">
              {{ etiquetaAccion[t.status] }}
            </button>
            <span v-else class="text-xs text-gray-400 self-center">
              {{ t.status === 'cancelled' ? 'Cancelado por cliente' : 'Cerrado' }}
            </span>
          </div>
        </div>

        <p v-if="t.description" class="text-sm text-gray-600 mt-2">{{ t.description }}</p>

        <!-- Documentos del ticket -->
        <div v-if="ticketExpandido === t.id" class="mt-4 border-t pt-4">
          <p class="text-sm font-medium mb-3">Documentos generados</p>
          <div v-if="!documentosPorTicket[t.id]?.length" class="text-sm text-gray-400">
            No hay documentos para este ticket.
          </div>
          <div v-else class="grid gap-3">
            <div v-for="d in documentosPorTicket[t.id]" :key="d.id"
              class="border rounded p-3 text-sm">
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium">{{ obtenerPlantillaDocumento(d)?.title ?? 'Documento legal' }}</span>
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
              <div class="bg-gray-50 rounded p-3 mb-3">
                <p class="text-xs text-gray-600">
                  Abrí el documento para revisar el texto legal completo con los datos ya integrados.
                </p>
                <button
                  class="mt-3 inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  @click="abrirDocumento(d, t)"
                >
                  Ver documento
                </button>
              </div>
              <div v-if="d.status === 'submitted'" class="flex gap-2">
                <button class="bg-green-600 text-white px-3 py-1 rounded text-xs" @click="aprobarDocumento(d.id, t.id)">
                  Aprobar
                </button>
                <button class="border border-red-300 text-red-600 px-3 py-1 rounded text-xs" @click="rechazarDocumento(d.id, t.id)">
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="documentoActivo"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      @click.self="cerrarDocumento"
    >
      <div class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ documentoActivo.titulo }}</h2>
            <p class="mt-1 text-xs text-gray-500">
              {{ new Date(documentoActivo.created_at).toLocaleString('es-CR') }}
            </p>
          </div>
          <button
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            @click="cerrarDocumento"
          >
            Cerrar
          </button>
        </div>

        <div class="overflow-y-auto bg-gray-50 px-5 py-5">
          <article class="mx-auto w-full max-w-3xl rounded-xl border bg-white px-6 py-8 shadow-sm">
            <pre class="whitespace-pre-wrap font-serif text-sm leading-7 text-gray-800">{{ documentoActivo.contenido }}</pre>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
