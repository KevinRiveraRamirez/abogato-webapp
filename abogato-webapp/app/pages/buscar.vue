<script setup lang="ts">
import type { Database } from '~/types/database.types'

definePageMeta({ layout: 'app', middleware: 'auth' })

type SearchSource = 'tickets' | 'documents' | 'vehicle_transfers'

type SearchResult = {
  id: string
  source: SearchSource
  title: string
  description: string
  statusKey: string
  statusLabel: string
  href: string
  createdAt: string
  meta: string[]
  searchText: string
}

type TicketRow = Database['public']['Tables']['tickets']['Row']
type DocumentRow = Pick<
  Database['public']['Tables']['documents']['Row'],
  'id' | 'status' | 'ticket_id' | 'template_id' | 'rejection_reason' | 'created_at'
>
type VehicleTransferRow = Pick<
  Database['public']['Tables']['vehicle_transfer_documents']['Row'],
  'id' | 'ticket_id' | 'owner_profile_id' | 'nombre_propietario' | 'placa' | 'marca' | 'modelo' | 'categoria' | 'estado_tributario' | 'created_at'
>
type DocumentTemplateRow = Pick<
  Database['public']['Tables']['document_templates']['Row'],
  'id' | 'title'
>

const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { profile, cargarPerfil } = useUsuario()

const busqueda = ref('')
const fuentesSeleccionadas = ref<SearchSource[]>([])
const estadosSeleccionados = ref<string[]>([])
const cantidadPorPagina = ref(10)
const paginaActual = ref(1)
const loading = ref(false)
const errorMsg = ref('')
const resultados = ref<SearchResult[]>([])

const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

const etiquetaEstadoTicket: Record<string, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

const etiquetaEstadoDocumento: Record<string, string> = {
  submitted: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Requiere correcciones',
  draft: 'Borrador',
}

const metaFuente: Record<SearchSource, {
  label: string
  icon: string
  badgeColor: 'primary' | 'info' | 'success'
}> = {
  tickets: {
    label: 'Tickets',
    icon: 'i-lucide-ticket',
    badgeColor: 'primary',
  },
  documents: {
    label: 'Documentos',
    icon: 'i-lucide-file-check-2',
    badgeColor: 'success',
  },
  vehicle_transfers: {
    label: 'Trámites',
    icon: 'i-lucide-car-front',
    badgeColor: 'info',
  },
}

const resultadosPorFuente = computed(() => {
  return fuentesSeleccionadas.value.length
    ? resultados.value.filter(resultado => fuentesSeleccionadas.value.includes(resultado.source))
    : resultados.value
})

const opcionesEstado = computed(() => {
  const labels = new Map<string, string>()

  resultadosPorFuente.value.forEach((resultado) => {
    if (!labels.has(resultado.statusKey)) {
      labels.set(resultado.statusKey, resultado.statusLabel)
    }
  })

  return Array.from(labels.entries()).map(([value, label]) => ({
    value,
    label,
  }))
})

const resultadosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return resultadosPorFuente.value.filter((resultado) => {
    const coincideEstado = !estadosSeleccionados.value.length
      || estadosSeleccionados.value.includes(resultado.statusKey)

    if (!coincideEstado) return false
    if (!termino) return true

    return resultado.searchText.includes(termino)
  })
})

const totalResultados = computed(() => resultadosFiltrados.value.length)
const totalPaginas = computed(() => Math.max(1, Math.ceil(totalResultados.value / cantidadPorPagina.value)))

const resultadosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value
  return resultadosFiltrados.value.slice(inicio, inicio + cantidadPorPagina.value)
})

const resumenPaginacion = computed(() => {
  if (!totalResultados.value) {
    return { inicio: 0, fin: 0 }
  }

  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value + 1
  const fin = Math.min(inicio + cantidadPorPagina.value - 1, totalResultados.value)

  return { inicio, fin }
})

const hayFiltrosActivos = computed(() =>
  Boolean(busqueda.value.trim()) || fuentesSeleccionadas.value.length > 0 || estadosSeleccionados.value.length > 0
)

const filtrosAplicadosCount = computed(() =>
  fuentesSeleccionadas.value.length + estadosSeleccionados.value.length
)

const resumenFuentes = computed(() => ({
  tickets: resultados.value.filter(resultado => resultado.source === 'tickets').length,
  documents: resultados.value.filter(resultado => resultado.source === 'documents').length,
  vehicle_transfers: resultados.value.filter(resultado => resultado.source === 'vehicle_transfers').length,
}))

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function normalizarTexto(value: string | null | undefined) {
  return value?.trim() || ''
}

function normalizarStatusTramite(value: string | null | undefined) {
  const limpio = normalizarTexto(value)
  return limpio ? limpio.toLowerCase() : 'tramite'
}

function construirSearchText(partes: Array<string | null | undefined>) {
  return partes
    .map(parte => normalizarTexto(parte))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function toggleFuente(source: SearchSource) {
  fuentesSeleccionadas.value = fuentesSeleccionadas.value.includes(source)
    ? fuentesSeleccionadas.value.filter(item => item !== source)
    : [...fuentesSeleccionadas.value, source]
}

function toggleEstado(statusKey: string) {
  estadosSeleccionados.value = estadosSeleccionados.value.includes(statusKey)
    ? estadosSeleccionados.value.filter(item => item !== statusKey)
    : [...estadosSeleccionados.value, statusKey]
}

function limpiarFiltros() {
  busqueda.value = ''
  fuentesSeleccionadas.value = []
  estadosSeleccionados.value = []
}

function obtenerDescripcionDocumento(ticketTitle: string, document: DocumentRow) {
  if (document.status === 'rejected' && document.rejection_reason) {
    return `Documento del ticket "${ticketTitle}" con cambios solicitados: ${document.rejection_reason}`
  }

  return `Documento vinculado al ticket "${ticketTitle}".`
}

function obtenerDescripcionTramite(documento: VehicleTransferRow) {
  const detalles = [
    documento.nombre_propietario ? `Propietario: ${documento.nombre_propietario}` : null,
    documento.placa ? `Placa ${documento.placa}` : null,
    documento.marca || documento.modelo ? [documento.marca, documento.modelo].filter(Boolean).join(' ') : null,
  ].filter(Boolean)

  return detalles.join(' · ') || 'Trámite vehicular registrado en la plataforma.'
}

async function resolveAuthUser() {
  if (user.value?.id) {
    return user.value
  }

  const { data } = await supabase.auth.getUser()
  return data.user
}

async function cargarResultados() {
  const authUser = await resolveAuthUser()

  if (!authUser?.id) {
    errorMsg.value = 'Sesión no válida.'
    resultados.value = []
    return
  }

  if (!profile.value) {
    await cargarPerfil()
  }

  loading.value = true
  errorMsg.value = ''

  try {
    let ticketsQuery = supabase
      .from('tickets')
      .select('id, title, description, status, priority, created_at, assigned_to, created_by')
      .order('created_at', { ascending: false })

    if (profile.value?.role === 'cliente') {
      ticketsQuery = ticketsQuery.eq('created_by', authUser.id)
    } else if (profile.value?.role === 'abogado') {
      ticketsQuery = ticketsQuery.or(`assigned_to.eq.${authUser.id},and(status.eq.open,assigned_to.is.null)`)
    }

    const { data: ticketsData, error: ticketsError } = await ticketsQuery

    if (ticketsError) {
      throw new Error(ticketsError.message)
    }

    const tickets = (ticketsData ?? []) as TicketRow[]
    const ticketsPorId = new Map(tickets.map(ticket => [ticket.id, ticket]))
    const ticketIds = tickets.map(ticket => ticket.id)

    let documents: DocumentRow[] = []
    let templatesPorId = new Map<string, DocumentTemplateRow>()

    if (ticketIds.length) {
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('id, status, ticket_id, template_id, rejection_reason, created_at')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false })

      if (documentsError) {
        throw new Error(documentsError.message)
      }

      documents = (documentsData ?? []) as DocumentRow[]

      const templateIds = [...new Set(documents.map(document => document.template_id).filter(Boolean))] as string[]

      if (templateIds.length) {
        const { data: templatesData, error: templatesError } = await supabase
          .from('document_templates')
          .select('id, title')
          .in('id', templateIds)

        if (templatesError) {
          throw new Error(templatesError.message)
        }

        templatesPorId = new Map(
          ((templatesData ?? []) as DocumentTemplateRow[]).map(template => [template.id, template])
        )
      }
    }

    let vehicleTransferQuery = supabase
      .from('vehicle_transfer_documents')
      .select('id, ticket_id, owner_profile_id, nombre_propietario, placa, marca, modelo, categoria, estado_tributario, created_at')
      .order('created_at', { ascending: false })

    if (profile.value?.role === 'cliente') {
      vehicleTransferQuery = vehicleTransferQuery.eq('owner_profile_id', authUser.id)
    } else if (profile.value?.role === 'abogado') {
      if (!ticketIds.length) {
        vehicleTransferQuery = vehicleTransferQuery.in('ticket_id', ['00000000-0000-0000-0000-000000000000'])
      } else {
        vehicleTransferQuery = vehicleTransferQuery.in('ticket_id', ticketIds)
      }
    }

    const { data: vehicleTransfersData, error: vehicleTransfersError } = await vehicleTransferQuery

    if (vehicleTransfersError) {
      throw new Error(vehicleTransfersError.message)
    }

    const vehicleTransfers = (vehicleTransfersData ?? []) as VehicleTransferRow[]

    const ticketResults: SearchResult[] = tickets.map((ticket) => ({
      id: ticket.id,
      source: 'tickets',
      title: ticket.title,
      description: ticket.description || 'Ticket sin descripción adicional.',
      statusKey: `ticket:${ticket.status}`,
      statusLabel: etiquetaEstadoTicket[ticket.status] ?? 'Ticket',
      href: `/ticket/${ticket.id}`,
      createdAt: ticket.created_at,
      meta: [
        `#${ticket.id.slice(0, 8)}`,
        ticket.priority === 'high' ? 'Prioridad alta' : ticket.priority === 'normal' ? 'Prioridad normal' : 'Prioridad baja',
      ],
      searchText: construirSearchText([
        ticket.id,
        ticket.title,
        ticket.description,
        etiquetaEstadoTicket[ticket.status],
        ticket.priority,
      ]),
    }))

    const documentResults: SearchResult[] = documents.flatMap((document) => {
      if (!document.ticket_id) return []

      const ticket = ticketsPorId.get(document.ticket_id)
      if (!ticket) return []

      const template = document.template_id ? templatesPorId.get(document.template_id) : null
      const title = template?.title || `Documento ${document.id.slice(0, 8)}`
      const statusLabel = etiquetaEstadoDocumento[document.status] ?? 'Documento'

      return [{
        id: document.id,
        source: 'documents',
        title,
        description: obtenerDescripcionDocumento(ticket.title, document),
        statusKey: `document:${document.status}`,
        statusLabel,
        href: `/ticket/${document.ticket_id}`,
        createdAt: document.created_at ?? ticket.created_at,
        meta: [
          `Ticket: ${ticket.title}`,
          `#${document.ticket_id.slice(0, 8)}`,
        ],
        searchText: construirSearchText([
          title,
          ticket.title,
          document.rejection_reason,
          document.status,
          statusLabel,
        ]),
      }]
    })

    const vehicleTransferResults: SearchResult[] = vehicleTransfers.map((transfer) => {
      const title = transfer.placa
        ? `Traspaso de vehículo ${transfer.placa}`
        : `Trámite vehicular ${transfer.id.slice(0, 8)}`
      const statusLabel = normalizarTexto(transfer.estado_tributario) || 'Trámite vehicular'

      return {
        id: transfer.id,
        source: 'vehicle_transfers',
        title,
        description: obtenerDescripcionTramite(transfer),
        statusKey: `vehicle_transfer:${normalizarStatusTramite(transfer.estado_tributario)}`,
        statusLabel,
        href: transfer.ticket_id ? `/traspaso-carro/${transfer.ticket_id}` : '/traspaso-carro',
        createdAt: transfer.created_at,
        meta: [
          normalizarTexto(transfer.categoria) || 'Vehículo',
          transfer.ticket_id ? `Ticket: #${transfer.ticket_id.slice(0, 8)}` : 'Sin ticket vinculado',
        ],
        searchText: construirSearchText([
          title,
          transfer.nombre_propietario,
          transfer.placa,
          transfer.marca,
          transfer.modelo,
          transfer.categoria,
          transfer.estado_tributario,
        ]),
      }
    })

    resultados.value = [...ticketResults, ...documentResults, ...vehicleTransferResults]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
  } catch (error) {
    console.error(error)
    errorMsg.value = error instanceof Error ? error.message : 'No se pudo cargar la búsqueda global.'
    resultados.value = []
  } finally {
    loading.value = false
  }
}

watch([busqueda, fuentesSeleccionadas, estadosSeleccionados, cantidadPorPagina], () => {
  paginaActual.value = 1
})

watch(opcionesEstado, (options) => {
  const keys = new Set(options.map(option => option.value))
  estadosSeleccionados.value = estadosSeleccionados.value.filter(value => keys.has(value))
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) {
    paginaActual.value = total
  }
})

onMounted(async () => {
  await cargarPerfil()
  await cargarResultados()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <AppPageHeader
      eyebrow="Buscar"
      title="Buscador global"
      description="Encontrá tickets, documentos y trámites desde un mismo lugar, con filtros claros y resultados rápidos."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" @click="cargarResultados">
          Actualizar
        </UButton>
      </template>
    </AppPageHeader>

    <div class="grid gap-4 md:grid-cols-3">
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Tickets</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumenFuentes.tickets }}</p>
        <p class="mt-2 text-sm text-muted">Casos listos para revisar o retomar.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Documentos</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumenFuentes.documents }}</p>
        <p class="mt-2 text-sm text-muted">Archivos legales vinculados a tus casos.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Trámites</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumenFuentes.vehicle_transfers }}</p>
        <p class="mt-2 text-sm text-muted">Gestiones vehiculares y registros asociados.</p>
      </UCard>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo cargar la búsqueda"
      :description="errorMsg"
    />

    <UCard>
      <template #header>
        <AppFilterToolbar
          v-model:search-term="busqueda"
          v-model:per-page="cantidadPorPagina"
          title="Resultados"
          description="Buscá por palabras clave, combiná fuentes y filtrá por estado cuando haya muchos resultados."
          search-placeholder="Buscar por título, placa, ticket, estado o descripción"
          :results-label="`Mostrando ${resumenPaginacion.inicio}-${resumenPaginacion.fin} de ${totalResultados}`"
          :per-page-options="opcionesCantidadPorPagina"
          :has-active-filters="hayFiltrosActivos"
          :active-filter-count="filtrosAplicadosCount"
          @clear-filters="limpiarFiltros"
        >
          <template #filters>
            <div class="grid gap-4">
              <div class="grid gap-2">
                <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Fuente</p>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    size="sm"
                    :color="fuentesSeleccionadas.length === 0 ? 'primary' : 'neutral'"
                    :variant="fuentesSeleccionadas.length === 0 ? 'solid' : 'outline'"
                    @click="fuentesSeleccionadas = []"
                  >
                    Todas
                  </UButton>

                  <UButton
                    v-for="source in (Object.keys(metaFuente) as SearchSource[])"
                    :key="source"
                    size="sm"
                    :icon="metaFuente[source].icon"
                    :color="fuentesSeleccionadas.includes(source) ? 'primary' : 'neutral'"
                    :variant="fuentesSeleccionadas.includes(source) ? 'solid' : 'outline'"
                    @click="toggleFuente(source)"
                  >
                    {{ metaFuente[source].label }}
                  </UButton>
                </div>
              </div>

              <div class="grid gap-2">
                <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Estado</p>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    size="sm"
                    :color="estadosSeleccionados.length === 0 ? 'primary' : 'neutral'"
                    :variant="estadosSeleccionados.length === 0 ? 'solid' : 'outline'"
                    @click="estadosSeleccionados = []"
                  >
                    Todos
                  </UButton>

                  <UButton
                    v-for="status in opcionesEstado"
                    :key="status.value"
                    size="sm"
                    :color="estadosSeleccionados.includes(status.value) ? 'primary' : 'neutral'"
                    :variant="estadosSeleccionados.includes(status.value) ? 'solid' : 'outline'"
                    @click="toggleEstado(status.value)"
                  >
                    {{ status.label }}
                  </UButton>
                </div>
              </div>
            </div>
          </template>
        </AppFilterToolbar>
      </template>

      <SkeletonListCards v-if="loading && !resultados.length" :items="4" />

      <div v-else-if="!resultadosFiltrados.length" class="py-12 text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-elevated text-toned">
          <UIcon name="i-lucide-search-x" class="size-6" />
        </div>
        <p class="mt-4 font-medium text-highlighted">No encontramos coincidencias.</p>
        <p class="mt-2 text-sm text-muted">
          Probá con otra palabra clave o ajustá las fuentes y estados para ampliar la búsqueda.
        </p>
      </div>

      <div v-else class="grid gap-3">
        <NuxtLink
          v-for="resultado in resultadosPaginados"
          :key="`${resultado.source}-${resultado.id}`"
          :to="resultado.href"
          class="group rounded-[1.5rem] border border-default/80 bg-default/90 px-5 py-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.26)] transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_24px_56px_-36px_rgba(15,23,42,0.32)] focus-visible:outline-none"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="metaFuente[resultado.source].badgeColor" variant="soft" size="sm">
                  <UIcon :name="metaFuente[resultado.source].icon" class="mr-1 size-3.5" />
                  {{ metaFuente[resultado.source].label }}
                </UBadge>

                <UBadge color="neutral" variant="outline" size="sm">
                  {{ resultado.statusLabel }}
                </UBadge>
              </div>

              <p class="mt-3 text-base font-semibold text-highlighted">
                {{ resultado.title }}
              </p>
              <p class="mt-2 text-sm leading-6 text-muted">
                {{ resultado.description }}
              </p>

              <div class="mt-3 flex flex-wrap gap-2 text-xs text-toned">
                <span
                  v-for="item in resultado.meta"
                  :key="item"
                  class="rounded-full bg-elevated px-2.5 py-1"
                >
                  {{ item }}
                </span>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2 text-sm text-muted">
              <span>{{ formatearFecha(resultado.createdAt) }}</span>
              <UIcon name="i-lucide-arrow-up-right" class="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </NuxtLink>
      </div>

      <template v-if="totalResultados">
        <USeparator class="mt-6" />

        <div class="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">
            Página {{ paginaActual }} de {{ totalPaginas }}
          </p>

          <UPagination
            v-model:page="paginaActual"
            :total="totalResultados"
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
