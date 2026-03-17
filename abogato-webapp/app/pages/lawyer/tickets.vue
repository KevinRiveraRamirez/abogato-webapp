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
  <div class="mx-auto max-w-5xl">
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
            <UBadge :color="colorEstado[t.status]" variant="subtle" class="mt-2">
              {{ etiquetaEstado[t.status] }}
            </UBadge>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton size="sm" :disabled="loading" @click="aprobarReapertura(t)">Aprobar</UButton>
            <UButton size="sm" color="error" variant="outline" :disabled="loading" @click="rechazarReapertura(t)">Rechazar</UButton>
          </div>
        </UCard>
      </div>
    </UCard>

    <div class="mb-4 flex flex-wrap gap-2">
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

    <UCard v-if="loading">
      <p class="text-sm text-muted">Cargando...</p>
    </UCard>

    <UCard v-else-if="ticketsFiltrados.length === 0">
      <p class="text-sm text-muted">No hay tickets{{ filtroEstado !== 'todos' ? ' con ese estado' : '' }}.</p>
    </UCard>

    <div v-else class="grid gap-3">
      <UCard v-for="t in ticketsFiltrados" :key="t.id">
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <NuxtLink :to="`/ticket/${t.id}`" class="font-medium text-highlighted hover:text-primary">
              {{ t.title }}
            </NuxtLink>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <UBadge :color="colorEstado[t.status]" variant="subtle">
                {{ etiquetaEstado[t.status] }}
              </UBadge>
              <UBadge :color="colorPrioridad[t.priority]" variant="outline">Prioridad: {{ etiquetaPrioridad[t.priority] }}</UBadge>
            </div>
            <p class="mt-1 text-xs text-toned">{{ new Date(t.created_at).toLocaleDateString('es-CR') }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton :to="`/ticket/${t.id}`" size="sm" color="neutral" variant="outline">
              Ver detalle
            </UButton>
            <UButton size="sm" color="neutral" variant="outline" @click="toggleDocumentos(t)">
              {{ ticketExpandido === t.id ? 'Ocultar docs' : 'Ver documentos' }}
            </UButton>
            <UButton v-if="siguienteEstado[t.status]" size="sm" :disabled="loading" @click="avanzarEstado(t)">
              {{ etiquetaAccion[t.status] }}
            </UButton>
            <span v-else class="self-center text-xs text-toned">
              {{ t.status === 'cancelled' ? 'Cancelado por cliente' : 'Cerrado' }}
            </span>
          </div>
        </div>

        <p v-if="t.description" class="mt-3 text-sm text-muted">{{ t.description }}</p>

        <div v-if="ticketExpandido === t.id" class="mt-4 border-t border-default pt-4">
          <p class="mb-3 text-sm font-medium text-highlighted">Documentos generados</p>
          <div v-if="!documentosPorTicket[t.id]?.length" class="text-sm text-muted">
            No hay documentos para este ticket.
          </div>
          <div v-else class="grid gap-3">
            <UCard v-for="d in documentosPorTicket[t.id]" :key="d.id">
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-highlighted">{{ obtenerPlantillaDocumento(d)?.title ?? 'Documento legal' }}</span>
                <UBadge :color="colorEstadoDocumento[d.status] ?? 'neutral'" variant="subtle">
                  {{ etiquetaEstadoDocumento[d.status] ?? 'Borrador' }}
                </UBadge>
              </div>
              <div class="mb-3 rounded-2xl bg-elevated/60 p-3">
                <p class="text-xs text-muted">
                  Abrí el documento para revisar el texto legal completo con los datos ya integrados.
                </p>
                <UButton size="xs" color="neutral" variant="outline" class="mt-3" @click="abrirDocumento(d, t)">
                  Ver documento
                </UButton>
              </div>
              <div v-if="d.status === 'submitted'" class="flex flex-wrap gap-2">
                <UButton size="xs" @click="aprobarDocumento(d.id, t.id)">
                  Aprobar
                </UButton>
                <UButton size="xs" color="error" variant="outline" @click="rechazarDocumento(d.id, t.id)">
                  Rechazar
                </UButton>
              </div>
            </UCard>
          </div>
        </div>
      </UCard>
    </div>

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
  </div>
</template>
