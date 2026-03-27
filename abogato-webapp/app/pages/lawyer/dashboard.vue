<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  documentStatusColors,
  documentStatusLabels,
  formatDateTime,
  formatShortDate,
  getFriendlyFirstName,
  getProfileDisplayName,
  normalizeDocumentStatus,
  normalizeTicketPriority,
  normalizeTicketStatus,
  percentage,
  ticketPriorityColors,
  ticketPriorityLabels,
  ticketStatusColors,
  ticketStatusLabels,
  type DocumentStatus,
  type TicketPriority,
  type TicketStatus,
} from '~/utils/dashboard'

definePageMeta({ layout: 'app', middleware: ['auth', 'lawyer'] })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { profile, cargarPerfil } = useUsuario()

type TicketRow = Database['public']['Tables']['tickets']['Row']
type NotificationRow = Database['public']['Tables']['notifications']['Row']
type DocumentRow = Pick<
  Database['public']['Tables']['documents']['Row'],
  'id' | 'status' | 'created_at' | 'ticket_id' | 'rejection_reason'
>
type ClientProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'user_id' | 'display_name' | 'first_name' | 'last_name' | 'contact_email'
>

type TicketSummary = {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  reopen_requested: boolean
}

type DocumentSummary = {
  id: string
  ticket_id: string
  status: DocumentStatus
  created_at: string
  rejection_reason: string | null
  templateTitle: string
}

type NotificationSummary = Pick<
  NotificationRow,
  'id' | 'title' | 'body' | 'link_path' | 'created_at' | 'read_at' | 'type'
>

type ClientSummary = {
  name: string
  email: string | null
}

type DashboardDocumentRow = DocumentRow & {
  document_templates?: { title: string | null } | { title: string | null }[] | null
}

const loading = ref(false)
const errorMsg = ref('')
const currentUserId = ref('')
const tickets = ref<TicketSummary[]>([])
const documents = ref<DocumentSummary[]>([])
const notifications = ref<NotificationSummary[]>([])
const clientsById = ref<Record<string, ClientSummary>>({})
const unreadNotificationsCount = ref(0)

const visibleName = computed(() => getProfileDisplayName(profile.value))
const friendlyName = computed(() => getFriendlyFirstName(profile.value))
const heroTitle = computed(() =>
  visibleName.value === 'Sin nombre disponible'
    ? 'Tu operacion legal de hoy'
    : `Hola, ${friendlyName.value}.`
)

const assignedTickets = computed(() =>
  tickets.value.filter(ticket => ticket.assigned_to === currentUserId.value)
)

const assignedActiveTickets = computed(() =>
  assignedTickets.value.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress')
)

const resolvedReadyToClose = computed(() =>
  assignedTickets.value.filter(ticket => ticket.status === 'resolved')
)

const availableQueue = computed(() =>
  tickets.value.filter(ticket => ticket.status === 'open' && !ticket.assigned_to)
)

const reopenRequests = computed(() =>
  assignedTickets.value.filter(ticket => ticket.reopen_requested)
)

const submittedDocuments = computed(() =>
  documents.value.filter(document => document.status === 'submitted')
)

const highPriorityAssigned = computed(() =>
  assignedActiveTickets.value.filter(ticket => ticket.priority === 'high')
)

const heroHighlights = computed(() => [
  {
    label: 'Casos activos a cargo',
    value: assignedActiveTickets.value.length,
    helper: resolvedReadyToClose.value.length
      ? `${resolvedReadyToClose.value.length} listos para cerrar`
      : 'Pendientes e internos en proceso',
  },
  {
    label: 'Documentos por revisar',
    value: submittedDocuments.value.length,
    helper: submittedDocuments.value.length
      ? 'Hay revision documental esperando respuesta'
      : 'No hay revision documental atrasada',
  },
  {
    label: 'Reaperturas pendientes',
    value: reopenRequests.value.length,
    helper: reopenRequests.value.length
      ? 'Casos que necesitan una decision'
      : 'No hay reaperturas esperando criterio',
  },
])

const summaryCards = computed(() => [
  {
    label: 'Casos activos a cargo',
    value: assignedActiveTickets.value.length,
    helper: highPriorityAssigned.value.length
      ? `${highPriorityAssigned.value.length} tienen prioridad alta.`
      : 'La carga activa esta bajo control.',
    icon: 'i-lucide-briefcase-business',
  },
  {
    label: 'Documentos por revisar',
    value: submittedDocuments.value.length,
    helper: submittedDocuments.value.length
      ? 'Documentos enviados esperando tu visto bueno.'
      : 'No hay documentos nuevos en espera.',
    icon: 'i-lucide-files',
  },
  {
    label: 'Reaperturas pendientes',
    value: reopenRequests.value.length,
    helper: reopenRequests.value.length
      ? 'Clientes esperando una decision sobre reapertura.'
      : 'No hay reaperturas pendientes ahora.',
    icon: 'i-lucide-rotate-ccw',
  },
  {
    label: 'Cola disponible',
    value: availableQueue.value.length,
    helper: availableQueue.value.length
      ? 'Casos abiertos listos para ser tomados.'
      : 'No hay tickets abiertos sin asignacion.',
    icon: 'i-lucide-list-todo',
  },
])

const workloadOverview = computed(() => [
  { key: 'open', label: ticketStatusLabels.open, value: assignedTickets.value.filter(ticket => ticket.status === 'open').length },
  {
    key: 'in_progress',
    label: ticketStatusLabels.in_progress,
    value: assignedTickets.value.filter(ticket => ticket.status === 'in_progress').length,
  },
  {
    key: 'resolved',
    label: ticketStatusLabels.resolved,
    value: assignedTickets.value.filter(ticket => ticket.status === 'resolved').length,
  },
  { key: 'closed', label: ticketStatusLabels.closed, value: assignedTickets.value.filter(ticket => ticket.status === 'closed').length },
  {
    key: 'cancelled',
    label: ticketStatusLabels.cancelled,
    value: assignedTickets.value.filter(ticket => ticket.status === 'cancelled').length,
  },
])

const ticketsById = computed<Record<string, TicketSummary>>(() =>
  Object.fromEntries(tickets.value.map(ticket => [ticket.id, ticket]))
)

const submittedDocumentsByTicketId = computed<Record<string, number>>(() =>
  submittedDocuments.value.reduce<Record<string, number>>((accumulator, document) => {
    accumulator[document.ticket_id] = (accumulator[document.ticket_id] ?? 0) + 1
    return accumulator
  }, {})
)

const focusTickets = computed(() =>
  [...assignedTickets.value]
    .filter(ticket => ticket.status !== 'closed' && ticket.status !== 'cancelled')
    .sort((a, b) => {
      const scoreDifference = getAttentionScore(b) - getAttentionScore(a)
      if (scoreDifference !== 0) return scoreDifference
      return Date.parse(a.created_at) - Date.parse(b.created_at)
    })
    .slice(0, 5)
)

const queuePreview = computed(() =>
  [...availableQueue.value]
    .sort((a, b) => {
      const priorityDifference = getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
      if (priorityDifference !== 0) return priorityDifference
      return Date.parse(a.created_at) - Date.parse(b.created_at)
    })
    .slice(0, 5)
)

const documentsPreview = computed(() =>
  [...documents.value]
    .filter(document => document.status === 'submitted' || document.status === 'rejected')
    .sort((a, b) => {
      const statusDifference = getDocumentPriority(b.status) - getDocumentPriority(a.status)
      if (statusDifference !== 0) return statusDifference
      return Date.parse(b.created_at) - Date.parse(a.created_at)
    })
    .slice(0, 5)
)

const recentNotifications = computed(() => notifications.value.slice(0, 4))

const attentionItems = computed(() => {
  const items: Array<{
    title: string
    description: string
    to: string
    button: string
    color: 'primary' | 'neutral' | 'warning' | 'success' | 'error' | 'info'
    icon: string
  }> = []

  if (submittedDocuments.value.length) {
    items.push({
      title: 'Revisa documentos enviados',
      description: `${submittedDocuments.value.length} documento(s) esperan aprobacion o rechazo con observaciones.`,
      to: '/lawyer/tickets',
      button: 'Abrir bandeja',
      color: 'warning',
      icon: 'i-lucide-file-search',
    })
  }

  if (reopenRequests.value.length) {
    items.push({
      title: 'Responde solicitudes de reapertura',
      description: `${reopenRequests.value.length} caso(s) tienen solicitud activa y conviene resolverlos pronto.`,
      to: '/lawyer/tickets',
      button: 'Ver reaperturas',
      color: 'error',
      icon: 'i-lucide-rotate-ccw',
    })
  }

  if (availableQueue.value.length) {
    items.push({
      title: 'Toma casos disponibles',
      description: `${availableQueue.value.length} ticket(s) abiertos estan listos para que alguien del equipo los asuma.`,
      to: '/lawyer/tickets',
      button: 'Ver cola',
      color: 'primary',
      icon: 'i-lucide-hand-helping',
    })
  }

  if (!profile.value?.office_address?.trim()) {
    items.push({
      title: 'Completa tu perfil profesional',
      description: 'Falta tu direccion profesional o de notaria, un dato util para documentos y contexto interno.',
      to: '/account/profile',
      button: 'Actualizar perfil',
      color: 'neutral',
      icon: 'i-lucide-building-2',
    })
  }

  if (unreadNotificationsCount.value) {
    items.push({
      title: 'Hay actividad nueva',
      description: `Tenes ${unreadNotificationsCount.value} notificacion(es) sin leer en tu bandeja.`,
      to: recentNotifications.value[0]?.link_path ?? '/lawyer/tickets',
      button: 'Abrir actividad',
      color: 'info',
      icon: 'i-lucide-bell-ring',
    })
  }

  if (!items.length) {
    items.push({
      title: 'Bandeja al dia',
      description: 'No hay documentos, reaperturas ni tickets sin asignar reclamando atencion inmediata.',
      to: '/lawyer/tickets',
      button: 'Ver mis casos',
      color: 'success',
      icon: 'i-lucide-circle-check-big',
    })
  }

  return items.slice(0, 4)
})

const quickLinks = [
  {
    title: 'Mis casos',
    description: 'Abrir la bandeja completa para tomar o actualizar tickets.',
    to: '/lawyer/tickets',
    icon: 'i-lucide-scale',
  },
  {
    title: 'Perfil profesional',
    description: 'Mantener visible tu informacion de oficina y contacto.',
    to: '/account/profile',
    icon: 'i-lucide-user-circle-2',
  },
  {
    title: 'Tickets disponibles',
    description: 'Volver rapido a la cola abierta sin asignacion.',
    to: '/lawyer/tickets',
    icon: 'i-lucide-list-todo',
  },
]

function getPriorityWeight(priority: TicketPriority) {
  if (priority === 'high') return 3
  if (priority === 'normal') return 2
  return 1
}

function getDocumentPriority(status: DocumentStatus) {
  if (status === 'submitted') return 2
  if (status === 'rejected') return 1
  return 0
}

function getAttentionScore(ticket: TicketSummary) {
  let score = 0

  if (ticket.reopen_requested) score += 100
  if (ticket.priority === 'high') score += 60
  if (ticket.status === 'open') score += 30
  if (ticket.status === 'in_progress') score += 20
  if (ticket.status === 'resolved') score += 10

  return score
}

function getDocumentTemplateTitle(
  value: DashboardDocumentRow['document_templates']
) {
  const relation = Array.isArray(value) ? value[0] : value
  return relation?.title?.trim() || 'Documento sin titulo'
}

function getClientName(userId: string) {
  return clientsById.value[userId]?.name ?? 'Cliente sin nombre'
}

function getClientEmail(userId: string) {
  return clientsById.value[userId]?.email ?? null
}

function getTicketClientName(ticketId: string) {
  const ticket = ticketsById.value[ticketId]
  if (!ticket) return 'Cliente sin identificar'
  return getClientName(ticket.created_by)
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message
  }

  return 'No se pudo cargar el dashboard del abogado.'
}

async function resolveCurrentUserId() {
  if (user.value?.id) return user.value.id

  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return data.user?.id ?? null
}

async function cargarDashboard() {
  loading.value = true
  errorMsg.value = ''

  try {
    await cargarPerfil()

    const userId = await resolveCurrentUserId()

    if (!userId) {
      throw new Error('No se pudo identificar tu sesion.')
    }

    currentUserId.value = userId

    const [ticketsResult, notificationsResult, unreadResult] = await Promise.all([
      supabase
        .from('tickets')
        .select('id, title, status, priority, created_by, assigned_to, created_at, updated_at, reopen_requested')
        .or(`assigned_to.eq.${userId},and(status.eq.open,assigned_to.is.null)`)
        .order('created_at', { ascending: false }),
      supabase
        .from('notifications')
        .select('id, title, body, link_path, created_at, read_at, type')
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', userId)
        .is('read_at', null),
    ])

    if (ticketsResult.error) throw ticketsResult.error
    if (notificationsResult.error) throw notificationsResult.error

    tickets.value = (ticketsResult.data ?? []).map((row) => {
      const ticket = row as Pick<
        TicketRow,
        'id' | 'title' | 'status' | 'priority' | 'created_by' | 'assigned_to' | 'created_at' | 'updated_at' | 'reopen_requested'
      >

      return {
        id: ticket.id,
        title: ticket.title,
        status: normalizeTicketStatus(ticket.status),
        priority: normalizeTicketPriority(ticket.priority),
        created_by: ticket.created_by,
        assigned_to: ticket.assigned_to,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        reopen_requested: ticket.reopen_requested,
      }
    })

    notifications.value = (notificationsResult.data ?? []) as NotificationSummary[]
    unreadNotificationsCount.value = unreadResult.error
      ? notifications.value.filter(notification => !notification.read_at).length
      : unreadResult.count ?? 0

    documents.value = []
    clientsById.value = {}

    const ticketIds = tickets.value.map(ticket => ticket.id)
    const clientIds = [...new Set(tickets.value.map(ticket => ticket.created_by).filter(Boolean))]

    if (ticketIds.length) {
      const documentsResult = await supabase
        .from('documents')
        .select('id, status, created_at, ticket_id, rejection_reason, document_templates(title)')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false })

      if (documentsResult.error) throw documentsResult.error

      documents.value = (documentsResult.data ?? []).flatMap((row) => {
        const document = row as DashboardDocumentRow

        if (!document.ticket_id || !document.created_at) return []

        return [{
          id: document.id,
          ticket_id: document.ticket_id,
          status: normalizeDocumentStatus(document.status),
          created_at: document.created_at,
          rejection_reason: document.rejection_reason,
          templateTitle: getDocumentTemplateTitle(document.document_templates),
        }]
      })
    }

    if (clientIds.length) {
      const clientsResult = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, contact_email')
        .in('user_id', clientIds)

      if (clientsResult.error) throw clientsResult.error

      clientsById.value = Object.fromEntries(
        (clientsResult.data ?? []).map((client) => {
          const row = client as ClientProfileRow

          return [
            row.user_id,
            {
              name: getProfileDisplayName(row),
              email: row.contact_email,
            } satisfies ClientSummary,
          ]
        })
      )
    }
  } catch (error) {
    errorMsg.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargarDashboard()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] p-8 shadow-[0_32px_80px_-44px_rgba(15,23,42,0.25)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]">
      <div class="flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-3xl">
          <p class="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
            Abogado
          </p>
          <h1 class="mt-3 text-3xl font-semibold text-highlighted sm:text-4xl">
            {{ heroTitle }}
          </h1>
          <p class="mt-3 text-sm leading-6 text-muted sm:text-base">
            Un tablero operativo para priorizar casos, revisar documentos pendientes y detectar rapido donde hace falta criterio legal o asignacion.
          </p>
          <p v-if="profile?.office_address" class="mt-4 text-sm text-toned">
            {{ profile.office_address }}
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton color="primary" to="/lawyer/tickets">
            Abrir mis casos
          </UButton>
          <UButton color="neutral" variant="outline" to="/account/profile">
            Perfil profesional
          </UButton>
          <UButton color="neutral" variant="ghost" :loading="loading" @click="cargarDashboard">
            Actualizar
          </UButton>
        </div>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <div
          v-for="item in heroHighlights"
          :key="item.label"
          class="rounded-[1.5rem] border border-white/50 bg-white/65 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
        >
          <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">{{ item.label }}</p>
          <p class="mt-3 text-3xl font-semibold text-highlighted">{{ item.value }}</p>
          <p class="mt-2 text-sm text-muted">{{ item.helper }}</p>
        </div>
      </div>
    </section>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo cargar el dashboard"
      :description="errorMsg"
    />

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard
        v-for="card in summaryCards"
        :key="card.label"
        class="border border-default/80 bg-default/90 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">{{ card.label }}</p>
            <p class="mt-3 text-3xl font-semibold text-highlighted">{{ card.value }}</p>
          </div>
          <div class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UIcon :name="card.icon" class="size-5" />
          </div>
        </div>
        <p class="mt-3 text-sm text-muted">{{ card.helper }}</p>
      </UCard>
    </div>

    <div v-if="loading && !tickets.length && !documents.length" class="py-12 text-center text-sm text-muted">
      Cargando tu panorama operativo...
    </div>

    <template v-else>
      <div class="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">Foco del dia</h2>
                <p class="mt-1 text-sm text-muted">Casos propios ordenados por urgencia real y contexto.</p>
              </div>
              <UBadge color="neutral" variant="outline">
                {{ visibleName }}
              </UBadge>
            </div>
          </template>

          <div v-if="focusTickets.length" class="grid gap-3">
            <div
              v-for="ticket in focusTickets"
              :key="ticket.id"
              class="rounded-[1.5rem] border border-default/80 bg-default/90 p-4"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge :color="ticketStatusColors[ticket.status]" variant="subtle">
                      {{ ticketStatusLabels[ticket.status] }}
                    </UBadge>
                    <UBadge :color="ticketPriorityColors[ticket.priority]" variant="outline">
                      {{ ticketPriorityLabels[ticket.priority] }}
                    </UBadge>
                    <UBadge v-if="ticket.reopen_requested" color="warning" variant="soft">
                      Reapertura
                    </UBadge>
                    <UBadge
                      v-if="submittedDocumentsByTicketId[ticket.id]"
                      color="primary"
                      variant="soft"
                    >
                      {{ submittedDocumentsByTicketId[ticket.id] }} doc(s) pendientes
                    </UBadge>
                  </div>

                  <p class="mt-3 font-semibold text-highlighted">{{ ticket.title }}</p>
                  <div class="mt-2 grid gap-1 text-sm text-muted">
                    <p>Cliente: {{ getClientName(ticket.created_by) }}</p>
                    <p v-if="getClientEmail(ticket.created_by)">Correo: {{ getClientEmail(ticket.created_by) }}</p>
                    <p>Creado: {{ formatShortDate(ticket.created_at) }}</p>
                    <p>Ultima actualizacion: {{ formatDateTime(ticket.updated_at) }}</p>
                  </div>
                </div>

                <UButton :to="`/ticket/${ticket.id}`" color="neutral" variant="ghost">
                  Ver ticket
                </UButton>
              </div>
            </div>
          </div>

          <div v-else class="rounded-[1.5rem] border border-dashed border-default px-5 py-10 text-center text-sm text-muted">
            Cuando tomes casos o te asignen expedientes, esta vista va a priorizarlos automaticamente.
          </div>
        </UCard>

        <div class="grid gap-6">
          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Alertas operativas</h2>
                <p class="mt-1 text-sm text-muted">Atajos a lo que conviene resolver primero.</p>
              </div>
            </template>

            <div class="grid gap-4">
              <div
                v-for="item in attentionItems"
                :key="item.title"
                class="rounded-[1.5rem] border border-default/80 bg-elevated/50 p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-3">
                      <div class="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <UIcon :name="item.icon" class="size-5" />
                      </div>
                      <p class="font-medium text-highlighted">{{ item.title }}</p>
                    </div>
                    <p class="mt-3 text-sm leading-6 text-muted">{{ item.description }}</p>
                  </div>

                  <UButton :to="item.to" :color="item.color" variant="soft">
                    {{ item.button }}
                  </UButton>
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Carga por estado</h2>
                <p class="mt-1 text-sm text-muted">Como esta distribuida tu cartera actualmente.</p>
              </div>
            </template>

            <div class="grid gap-4">
              <div
                v-for="item in workloadOverview"
                :key="item.key"
                class="rounded-[1.5rem] border border-default/80 bg-elevated/50 p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="font-medium text-highlighted">{{ item.label }}</p>
                    <p class="mt-1 text-sm text-muted">{{ item.value }} ticket(s)</p>
                  </div>
                  <p class="text-lg font-semibold text-highlighted">
                    {{ percentage(item.value, assignedTickets.length) }}%
                  </p>
                </div>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    class="h-full rounded-full bg-primary transition-all duration-300"
                    :style="{ width: `${percentage(item.value, assignedTickets.length)}%` }"
                  />
                </div>
              </div>
            </div>

            <div class="mt-6 grid gap-3 md:grid-cols-3">
              <div class="rounded-2xl border border-default/80 bg-default/80 px-4 py-3">
                <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Alta prioridad</p>
                <p class="mt-2 text-2xl font-semibold text-highlighted">{{ highPriorityAssigned.length }}</p>
              </div>
              <div class="rounded-2xl border border-default/80 bg-default/80 px-4 py-3">
                <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Listos para cerrar</p>
                <p class="mt-2 text-2xl font-semibold text-highlighted">{{ resolvedReadyToClose.length }}</p>
              </div>
              <div class="rounded-2xl border border-default/80 bg-default/80 px-4 py-3">
                <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Sin leer</p>
                <p class="mt-2 text-2xl font-semibold text-highlighted">{{ unreadNotificationsCount }}</p>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">Cola disponible</h2>
                <p class="mt-1 text-sm text-muted">Tickets abiertos sin asignacion para tomar desde la bandeja legal.</p>
              </div>
              <UButton to="/lawyer/tickets" color="neutral" variant="outline">
                Ver bandeja
              </UButton>
            </div>
          </template>

          <div v-if="queuePreview.length" class="grid gap-3">
            <div
              v-for="ticket in queuePreview"
              :key="ticket.id"
              class="rounded-[1.5rem] border border-default/80 bg-default/90 p-4"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge color="warning" variant="subtle">
                      Sin asignar
                    </UBadge>
                    <UBadge :color="ticketPriorityColors[ticket.priority]" variant="outline">
                      {{ ticketPriorityLabels[ticket.priority] }}
                    </UBadge>
                  </div>

                  <p class="mt-3 font-semibold text-highlighted">{{ ticket.title }}</p>
                  <div class="mt-2 grid gap-1 text-sm text-muted">
                    <p>Cliente: {{ getClientName(ticket.created_by) }}</p>
                    <p v-if="getClientEmail(ticket.created_by)">Correo: {{ getClientEmail(ticket.created_by) }}</p>
                    <p>Creado: {{ formatDateTime(ticket.created_at) }}</p>
                  </div>
                </div>

                <UButton :to="`/ticket/${ticket.id}`" color="neutral" variant="ghost">
                  Revisar
                </UButton>
              </div>
            </div>
          </div>

          <div v-else class="rounded-[1.5rem] border border-dashed border-default px-5 py-10 text-center text-sm text-muted">
            No hay tickets abiertos sin asignacion en este momento.
          </div>
        </UCard>

        <div class="grid gap-6">
          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Documentos por revisar</h2>
                <p class="mt-1 text-sm text-muted">Revision documental reciente dentro de tu radio de trabajo.</p>
              </div>
            </template>

            <div v-if="documentsPreview.length" class="grid gap-3">
              <div
                v-for="document in documentsPreview"
                :key="document.id"
                class="rounded-2xl border border-default/80 bg-elevated/50 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">{{ document.templateTitle }}</p>
                    <p class="mt-1 text-sm text-muted">
                      {{ getTicketClientName(document.ticket_id) }}
                    </p>
                    <p class="mt-1 text-xs text-toned">
                      Ticket #{{ document.ticket_id.slice(0, 8) }}
                    </p>
                    <p class="mt-2 text-xs text-toned">{{ formatDateTime(document.created_at) }}</p>
                    <p v-if="document.rejection_reason" class="mt-2 text-sm text-error">
                      {{ document.rejection_reason }}
                    </p>
                  </div>

                  <div class="flex flex-col items-end gap-2">
                    <UBadge :color="documentStatusColors[document.status]" variant="subtle">
                      {{ documentStatusLabels[document.status] }}
                    </UBadge>
                    <UButton :to="`/ticket/${document.ticket_id}`" color="neutral" variant="ghost">
                      Abrir
                    </UButton>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="rounded-2xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
              Cuando un cliente envie o corrija documentos, apareceran aqui para tu revision.
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Actividad reciente</h2>
                <p class="mt-1 text-sm text-muted">Notificaciones nuevas vinculadas a tu trabajo.</p>
              </div>
            </template>

            <div v-if="recentNotifications.length" class="grid gap-3">
              <div
                v-for="notification in recentNotifications"
                :key="notification.id"
                class="rounded-2xl border border-default/80 bg-elevated/50 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <UBadge v-if="!notification.read_at" color="primary" variant="soft">
                        Nuevo
                      </UBadge>
                      <span class="text-xs uppercase tracking-[0.16em] text-toned">{{ notification.type }}</span>
                    </div>
                    <p class="mt-3 font-medium text-highlighted">{{ notification.title }}</p>
                    <p class="mt-2 text-sm text-muted">{{ notification.body }}</p>
                  </div>

                  <UButton :to="notification.link_path" color="neutral" variant="ghost">
                    Abrir
                  </UButton>
                </div>

                <p class="mt-3 text-xs text-toned">{{ formatDateTime(notification.created_at) }}</p>
              </div>
            </div>

            <div v-else class="rounded-2xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
              No hay actividad reciente en notificaciones.
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Accesos rapidos</h2>
                <p class="mt-1 text-sm text-muted">Entradas utiles para moverte dentro del flujo legal.</p>
              </div>
            </template>

            <div class="grid gap-3">
              <NuxtLink
                v-for="item in quickLinks"
                :key="item.title"
                :to="item.to"
                class="rounded-2xl border border-default/80 bg-elevated/50 p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UIcon :name="item.icon" class="size-5" />
                  </div>
                  <div>
                    <p class="font-medium text-highlighted">{{ item.title }}</p>
                    <p class="mt-1 text-sm text-muted">{{ item.description }}</p>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </div>
</template>
