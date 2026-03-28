<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()
const route = useRoute()

type Ticket = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
  priority: 'low' | 'normal' | 'high'
  created_by: string
  assigned_to: string | null
  created_at: string
}

const tickets = ref<Ticket[]>([])
const loading = ref(false)
const errorMsg = ref('')

const ticketDestacado = computed(() => route.query.ticket as string | undefined)
const keywordsVehiculo = ['vehiculo', 'vehículo', 'carro', 'auto', 'automovil', 'automóvil', 'vin', 'placa', 'traspaso']

const etiquetaEstado: Record<Ticket['status'], string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

const colorEstado: Record<Ticket['status'], 'warning' | 'info' | 'success' | 'neutral' | 'error'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
  cancelled: 'error',
}

function normalizarTexto(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function pareceTicketVehiculo(ticket: Ticket, templatesPorTicket: Map<string, string[]>, ticketsConTraspaso: Set<string>) {
  if (ticketsConTraspaso.has(ticket.id)) return true

  const contenido = [
    ticket.title,
    ticket.description,
    ...(templatesPorTicket.get(ticket.id) ?? []),
  ]
    .map(normalizarTexto)
    .join(' ')

  return keywordsVehiculo.some(keyword => contenido.includes(normalizarTexto(keyword)))
}

async function cargarTickets() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return

  loading.value = true
  errorMsg.value = ''

  let query = supabase
    .from('tickets')
    .select('id, title, description, status, priority, created_by, assigned_to, created_at')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (profile.value?.role !== 'admin' && profile.value?.role !== 'abogado') {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  const ticketsBase = (data ?? []) as Ticket[]

  if (!ticketsBase.length) {
    tickets.value = []
    return
  }

  const ticketIds = ticketsBase.map(ticket => ticket.id)

  const [documentosResult, traspasosResult] = await Promise.all([
    supabase
      .from('documents')
      .select('ticket_id, document_templates(title)')
      .in('ticket_id', ticketIds),
    supabase
      .from('vehicle_transfer_documents')
      .select('ticket_id')
      .in('ticket_id', ticketIds),
  ])

  if (documentosResult.error) {
    errorMsg.value = documentosResult.error.message
    tickets.value = []
    return
  }

  if (traspasosResult.error) {
    errorMsg.value = traspasosResult.error.message
    tickets.value = []
    return
  }

  const templatesPorTicket = new Map<string, string[]>()

  for (const documento of (documentosResult.data ?? []) as Array<{ ticket_id: string | null, document_templates?: { title: string | null } | { title: string | null }[] | null }>) {
    if (!documento.ticket_id) continue

    const templates = Array.isArray(documento.document_templates)
      ? documento.document_templates
      : documento.document_templates
        ? [documento.document_templates]
        : []

    const titulos = templates
      .map(template => template.title ?? '')
      .filter(Boolean)

    if (!titulos.length) continue

    templatesPorTicket.set(documento.ticket_id, [
      ...(templatesPorTicket.get(documento.ticket_id) ?? []),
      ...titulos,
    ])
  }

  const ticketsConTraspaso = new Set(
    ((traspasosResult.data ?? []) as Array<{ ticket_id: string | null }>)
      .map(item => item.ticket_id)
      .filter((ticketId): ticketId is string => Boolean(ticketId))
  )

  tickets.value = ticketsBase.filter(ticket =>
    pareceTicketVehiculo(ticket, templatesPorTicket, ticketsConTraspaso)
  )
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
        <h1 class="text-2xl font-semibold text-highlighted">Traspaso de carro</h1>
        <p class="mt-1 text-sm text-muted">
          Elegí un ticket vinculado a vehículo para cargar o consultar la información del traspaso.
        </p>
      </div>
      <UButton color="neutral" variant="outline" :loading="loading" @click="cargarTickets">
        Actualizar
      </UButton>
    </div>

    <UAlert
      v-if="ticketDestacado"
      color="success"
      variant="soft"
      title="Ticket listo para continuar"
      description="Seleccioná el ticket recién creado para abrir el flujo de traspaso."
      class="mb-4"
    />

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo cargar la lista"
      :description="errorMsg"
      class="mb-4"
    />

    <SkeletonListCards v-if="loading && !tickets.length" :items="3" />

    <UCard v-else-if="!tickets.length">
      <p class="text-sm text-muted">No hay tickets de vehículo disponibles para iniciar un traspaso.</p>
    </UCard>

    <div v-else class="grid gap-3">
      <UCard
        v-for="ticket in tickets"
        :key="ticket.id"
        :class="ticketDestacado === ticket.id ? 'ring-2 ring-primary/50' : ''"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium text-highlighted">{{ ticket.title }}</p>
              <UBadge :color="colorEstado[ticket.status]" variant="subtle">
                {{ etiquetaEstado[ticket.status] }}
              </UBadge>
            </div>
            <p v-if="ticket.description" class="mt-2 text-sm text-muted">
              {{ ticket.description }}
            </p>
            <p class="mt-2 text-xs text-toned">
              {{ new Date(ticket.created_at).toLocaleDateString('es-CR') }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton :to="`/traspaso-carro/${ticket.id}`">
              Abrir traspaso
            </UButton>
            <UButton :to="`/ticket/${ticket.id}`" color="neutral" variant="outline">
              Ver ticket
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
