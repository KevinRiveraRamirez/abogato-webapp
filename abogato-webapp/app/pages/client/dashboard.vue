<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  documentStatusColors,
  documentStatusLabels,
  formatDateTime,
  formatShortDate,
  getFriendlyFirstName,
  getProfileDisplayName,
  getReopenedTicketIds,
  getTicketDisplayStatus,
  normalizeDocumentStatus,
  normalizeTicketPriority,
  normalizeTicketStatus,
  percentage,
  ticketDisplayStatusColors,
  ticketDisplayStatusLabels,
  ticketPriorityColors,
  ticketPriorityLabels,
  ticketStatusLabels,
  type DocumentStatus,
  type TicketDisplayStatus,
  type TicketPriority,
  type TicketStatus,
} from '~/utils/dashboard'

definePageMeta({ layout: 'app', middleware: ['auth', 'client'] })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { profile, cargarPerfil } = useUsuario()

type TicketRow = Database['public']['Tables']['tickets']['Row']
type NotificationRow = Database['public']['Tables']['notifications']['Row']
type DocumentRow = Pick<
  Database['public']['Tables']['documents']['Row'],
  'id' | 'status' | 'created_at' | 'ticket_id' | 'rejection_reason'
>
type LawyerProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'user_id' | 'display_name' | 'first_name' | 'last_name' | 'office_address'
>

type TicketSummary = {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  assigned_to: string | null
  created_at: string
  updated_at: string
  reopen_requested: boolean
  wasReopened: boolean
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

type LawyerSummary = {
  name: string
  officeAddress: string | null
}

type DashboardDocumentRow = DocumentRow & {
  document_templates?: { title: string | null } | { title: string | null }[] | null
}

const loading = ref(false)
const errorMsg = ref('')
const tickets = ref<TicketSummary[]>([])
const documents = ref<DocumentSummary[]>([])
const notifications = ref<NotificationSummary[]>([])
const lawyersById = ref<Record<string, LawyerSummary>>({})
const unreadNotificationsCount = ref(0)

const visibleName = computed(() => getProfileDisplayName(profile.value))
const friendlyName = computed(() => getFriendlyFirstName(profile.value))
const heroTitle = computed(() =>
  visibleName.value === 'Sin nombre disponible'
    ? 'Tu panel legal en un vistazo'
    : `Hola, ${friendlyName.value}.`
)

const activeTickets = computed(() =>
  tickets.value.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress')
)

const waitingAssignmentCount = computed(() =>
  activeTickets.value.filter(ticket => !ticket.assigned_to).length
)

const closedTicketsCount = computed(() =>
  tickets.value.filter(ticket => ticket.status === 'resolved' || ticket.status === 'closed').length
)

const uniqueLawyersCount = computed(() =>
  new Set(activeTickets.value.map(ticket => ticket.assigned_to).filter(Boolean)).size
)

const documentCounts = computed(() => ({
  submitted: documents.value.filter(document => document.status === 'submitted').length,
  approved: documents.value.filter(document => document.status === 'approved').length,
  rejected: documents.value.filter(document => document.status === 'rejected').length,
  draft: documents.value.filter(document => document.status === 'draft').length,
}))

const profileChecks = computed(() => [
  Boolean(profile.value?.first_name?.trim()),
  Boolean(profile.value?.last_name?.trim()),
  Boolean(profile.value?.contact_email?.trim()),
  Boolean(profile.value?.contact_phone?.trim()),
  Boolean(profile.value?.personal_address?.trim()),
])

const profileCompletion = computed(() =>
  percentage(profileChecks.value.filter(Boolean).length, profileChecks.value.length)
)

const pendingProfileFields = computed(() =>
  profileChecks.value.filter(complete => !complete).length
)

const heroHighlights = computed(() => [
  {
    label: 'Casos activos',
    value: activeTickets.value.length,
    helper: waitingAssignmentCount.value
      ? `${waitingAssignmentCount.value} esperando asignacion`
      : 'Seguimiento visible en tiempo real',
  },
  {
    label: 'Documentos aprobados',
    value: documentCounts.value.approved,
    helper: documentCounts.value.submitted
      ? `${documentCounts.value.submitted} todavia en revision`
      : 'Listos para descargar o revisar',
  },
  {
    label: 'Perfil listo',
    value: `${profileCompletion.value}%`,
    helper: pendingProfileFields.value
      ? `${pendingProfileFields.value} dato(s) pendientes`
      : 'Informacion completa para nuevos tramites',
  },
])

const summaryCards = computed(() => [
  {
    label: 'Casos activos',
    value: activeTickets.value.length,
    helper: waitingAssignmentCount.value
      ? `${waitingAssignmentCount.value} siguen esperando asignacion.`
      : 'Todos tus casos activos ya tienen seguimiento visible.',
    icon: 'i-lucide-scale',
  },
  {
    label: 'Documentos en revision',
    value: documentCounts.value.submitted,
    helper: documentCounts.value.approved
      ? `${documentCounts.value.approved} ya fueron aprobados.`
      : 'Aparecen aqui mientras el abogado los revisa.',
    icon: 'i-lucide-files',
  },
  {
    label: 'Correcciones pendientes',
    value: documentCounts.value.rejected,
    helper: documentCounts.value.rejected
      ? 'Revisa las observaciones y volve a enviar.'
      : 'No tenes documentos observados en este momento.',
    icon: 'i-lucide-file-warning',
  },
  {
    label: 'Notificaciones sin leer',
    value: unreadNotificationsCount.value,
    helper: unreadNotificationsCount.value
      ? 'Hay novedades recientes para revisar.'
      : 'No hay alertas pendientes por ahora.',
    icon: 'i-lucide-bell-ring',
  },
])

const statusOverview = computed(() => [
  { key: 'open', label: ticketStatusLabels.open, value: tickets.value.filter(ticket => ticket.status === 'open').length },
  {
    key: 'in_progress',
    label: ticketStatusLabels.in_progress,
    value: tickets.value.filter(ticket => ticket.status === 'in_progress').length,
  },
  {
    key: 'resolved',
    label: ticketStatusLabels.resolved,
    value: tickets.value.filter(ticket => ticket.status === 'resolved').length,
  },
  { key: 'closed', label: ticketStatusLabels.closed, value: tickets.value.filter(ticket => ticket.status === 'closed').length },
  {
    key: 'cancelled',
    label: ticketStatusLabels.cancelled,
    value: tickets.value.filter(ticket => ticket.status === 'cancelled').length,
  },
])

const recentTickets = computed(() =>
  [...tickets.value]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 5)
)

const recentDocuments = computed(() =>
  [...documents.value]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 5)
)

const recentNotifications = computed(() => notifications.value.slice(0, 4))

const firstRejectedDocument = computed(() =>
  documents.value.find(document => document.status === 'rejected')
)

const firstUnreadNotification = computed(() =>
  notifications.value.find(notification => !notification.read_at)
)

function getVisibleTicketStatus(ticket: TicketSummary): TicketDisplayStatus {
  return getTicketDisplayStatus(ticket)
}

const actionItems = computed(() => {
  const items: Array<{
    title: string
    description: string
    to: string
    button: string
    color: 'primary' | 'neutral' | 'warning' | 'success' | 'error' | 'info'
    icon: string
  }> = []

  if (!tickets.value.length) {
    items.push({
      title: 'Inicia tu primer tramite',
      description: 'Todavia no tenes tickets creados. Desde aqui podes arrancar un caso nuevo con contexto claro.',
      to: '/tickets',
      button: 'Crear ticket',
      color: 'primary',
      icon: 'i-lucide-rocket',
    })
  }

  if (documentCounts.value.rejected) {
    items.push({
      title: 'Corregi documentos observados',
      description: firstRejectedDocument.value?.rejection_reason
        ?? `Tenes ${documentCounts.value.rejected} documento(s) con observaciones por corregir.`,
      to: firstRejectedDocument.value ? `/ticket/${firstRejectedDocument.value.ticket_id}` : '/tickets',
      button: 'Abrir ticket',
      color: 'error',
      icon: 'i-lucide-file-warning',
    })
  }

  if (waitingAssignmentCount.value) {
    items.push({
      title: 'Seguimiento pendiente de asignacion',
      description: `${waitingAssignmentCount.value} de tus casos activos aun no tienen abogado asignado.`,
      to: '/tickets',
      button: 'Ver mis tickets',
      color: 'warning',
      icon: 'i-lucide-hourglass',
    })
  }

  if (pendingProfileFields.value) {
    items.push({
      title: 'Completa tu perfil',
      description: `Faltan ${pendingProfileFields.value} dato(s) para dejar tu ficha lista y agilizar nuevos tramites.`,
      to: '/account/profile',
      button: 'Actualizar perfil',
      color: 'neutral',
      icon: 'i-lucide-user-round-pen',
    })
  }

  if (unreadNotificationsCount.value) {
    items.push({
      title: 'Revisa novedades recientes',
      description: `Tenes ${unreadNotificationsCount.value} notificacion(es) sin leer con movimiento reciente.`,
      to: firstUnreadNotification.value?.link_path ?? '/tickets',
      button: 'Abrir novedad',
      color: 'info',
      icon: 'i-lucide-bell-ring',
    })
  }

  if (!items.length) {
    items.push({
      title: 'Todo va en orden',
      description: 'No tenes correcciones pendientes y tu panel muestra seguimiento estable de los casos abiertos.',
      to: '/tickets',
      button: 'Ver detalle',
      color: 'success',
      icon: 'i-lucide-circle-check-big',
    })
  }

  return items.slice(0, 4)
})

const quickLinks = [
  {
    title: 'Mis tickets',
    description: 'Seguimiento completo de casos, mensajes y documentos.',
    to: '/tickets',
    icon: 'i-lucide-ticket',
  },
  {
    title: 'Traspaso de carro',
    description: 'Inicia y da continuidad a tramites vehiculares.',
    to: '/traspaso-carro',
    icon: 'i-lucide-car-front',
  },
  {
    title: 'Mi perfil',
    description: 'Actualiza tus datos personales y de contacto.',
    to: '/account/profile',
    icon: 'i-lucide-user-circle-2',
  },
]

function getDocumentTemplateTitle(
  value: DashboardDocumentRow['document_templates']
) {
  const relation = Array.isArray(value) ? value[0] : value
  return relation?.title?.trim() || 'Documento sin titulo'
}

function getLawyerName(assignedTo: string | null) {
  if (!assignedTo) return 'Sin asignar todavia'
  return lawyersById.value[assignedTo]?.name ?? 'Abogado asignado'
}

function getLawyerOffice(assignedTo: string | null) {
  if (!assignedTo) return null
  return lawyersById.value[assignedTo]?.officeAddress ?? null
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

  return 'No se pudo cargar tu dashboard.'
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

    const [ticketsResult, notificationsResult, unreadResult] = await Promise.all([
      supabase
        .from('tickets')
        .select('id, title, status, priority, assigned_to, created_at, updated_at, reopen_requested')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false }),
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
        'id' | 'title' | 'status' | 'priority' | 'assigned_to' | 'created_at' | 'updated_at' | 'reopen_requested'
      >

      return {
        id: ticket.id,
        title: ticket.title,
        status: normalizeTicketStatus(ticket.status),
        priority: normalizeTicketPriority(ticket.priority),
        assigned_to: ticket.assigned_to,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        reopen_requested: ticket.reopen_requested,
        wasReopened: false,
      }
    })

    notifications.value = (notificationsResult.data ?? []) as NotificationSummary[]
    unreadNotificationsCount.value = unreadResult.error
      ? notifications.value.filter(notification => !notification.read_at).length
      : unreadResult.count ?? 0

    documents.value = []
    lawyersById.value = {}

    const ticketIds = tickets.value.map(ticket => ticket.id)
    const lawyerIds = [...new Set(tickets.value.map(ticket => ticket.assigned_to).filter(Boolean))] as string[]

    if (ticketIds.length) {
      const [documentsResult, reopenHistoryResult] = await Promise.all([
        supabase
          .from('documents')
          .select('id, status, created_at, ticket_id, rejection_reason, document_templates(title)')
          .in('ticket_id', ticketIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('ticket_historial')
          .select('ticket_id, old_status, new_status')
          .in('ticket_id', ticketIds)
          .eq('new_status', 'open')
          .in('old_status', ['resolved', 'closed', 'cancelled']),
      ])

      if (documentsResult.error) throw documentsResult.error
      if (reopenHistoryResult.error) throw reopenHistoryResult.error

      const reopenedTicketIds = getReopenedTicketIds(reopenHistoryResult.data ?? [])

      tickets.value = tickets.value.map(ticket => ({
        ...ticket,
        wasReopened: reopenedTicketIds.has(ticket.id),
      }))

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

    if (lawyerIds.length) {
      const lawyersResult = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, office_address')
        .in('user_id', lawyerIds)

      if (lawyersResult.error) throw lawyersResult.error

      lawyersById.value = Object.fromEntries(
        (lawyersResult.data ?? []).map((lawyer) => {
          const row = lawyer as LawyerProfileRow

          return [
            row.user_id,
            {
              name: getProfileDisplayName(row),
              officeAddress: row.office_address,
            } satisfies LawyerSummary,
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
    <section class="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.15),_transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] p-8 shadow-[0_32px_80px_-44px_rgba(15,23,42,0.25)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.18),_transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]">
      <div class="flex flex-wrap items-start justify-between gap-6">
        <div class="max-w-3xl">
          <p class="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
            Cliente
          </p>
          <h1 class="mt-3 text-3xl font-semibold text-highlighted sm:text-4xl">
            {{ heroTitle }}
          </h1>
          <p class="mt-3 text-sm leading-6 text-muted sm:text-base">
            Un espacio para seguir tus tramites, entender en que punto estan tus documentos y detectar rapido cualquier accion pendiente sin mezclarlo con el trabajo interno del despacho.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton color="primary" to="/tickets">
            Ver mis tickets
          </UButton>
          <UButton color="neutral" variant="outline" to="/traspaso-carro">
            Nuevo tramite
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
      title="No se pudo cargar tu dashboard"
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

    <div v-if="loading && !tickets.length && !documents.length && !notifications.length" class="py-12 text-center text-sm text-muted">
      Cargando seguimiento de tus tramites...
    </div>

    <template v-else>
      <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">Proximos pasos</h2>
                <p class="mt-1 text-sm text-muted">Lo mas importante para mantener tus casos avanzando sin friccion.</p>
              </div>
              <UBadge color="neutral" variant="outline">
                {{ visibleName }}
              </UBadge>
            </div>
          </template>

          <div class="grid gap-4">
            <div
              v-for="item in actionItems"
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
              <h2 class="font-semibold text-highlighted">Estado de tus tramites</h2>
              <p class="mt-1 text-sm text-muted">Distribucion rapida para entender donde esta cada ticket.</p>
            </div>
          </template>

          <div class="grid gap-4">
            <div
              v-for="item in statusOverview"
              :key="item.key"
              class="rounded-[1.5rem] border border-default/80 bg-elevated/50 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium text-highlighted">{{ item.label }}</p>
                  <p class="mt-1 text-sm text-muted">{{ item.value }} ticket(s)</p>
                </div>
                <p class="text-lg font-semibold text-highlighted">
                  {{ percentage(item.value, tickets.length) }}%
                </p>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300"
                  :style="{ width: `${percentage(item.value, tickets.length)}%` }"
                />
              </div>
            </div>
          </div>

          <div class="mt-6 grid gap-3 md:grid-cols-3">
            <div class="rounded-2xl border border-default/80 bg-default/80 px-4 py-3">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Abogados asignados</p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">{{ uniqueLawyersCount }}</p>
            </div>
            <div class="rounded-2xl border border-default/80 bg-default/80 px-4 py-3">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Casos cerrados</p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">{{ closedTicketsCount }}</p>
            </div>
            <div class="rounded-2xl border border-default/80 bg-default/80 px-4 py-3">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Perfil completo</p>
              <p class="mt-2 text-2xl font-semibold text-highlighted">{{ profileCompletion }}%</p>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">Tickets recientes</h2>
                <p class="mt-1 text-sm text-muted">Tus casos mas recientes o con movimiento reciente.</p>
              </div>
              <UButton to="/tickets" color="neutral" variant="outline">
                Ver todos
              </UButton>
            </div>
          </template>

          <div v-if="recentTickets.length" class="grid gap-3">
            <div
              v-for="ticket in recentTickets"
              :key="ticket.id"
              class="rounded-[1.5rem] border border-default/80 bg-default/90 p-4"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge :color="ticketDisplayStatusColors[getVisibleTicketStatus(ticket)]" variant="subtle">
                      {{ ticketDisplayStatusLabels[getVisibleTicketStatus(ticket)] }}
                    </UBadge>
                    <UBadge :color="ticketPriorityColors[ticket.priority]" variant="outline">
                      {{ ticketPriorityLabels[ticket.priority] }}
                    </UBadge>
                    <UBadge v-if="ticket.reopen_requested" color="warning" variant="soft">
                      Reapertura solicitada
                    </UBadge>
                  </div>

                  <p class="mt-3 font-semibold text-highlighted">{{ ticket.title }}</p>

                  <div class="mt-2 grid gap-1 text-sm text-muted">
                    <p>Responsable: {{ getLawyerName(ticket.assigned_to) }}</p>
                    <p v-if="getLawyerOffice(ticket.assigned_to)">Oficina: {{ getLawyerOffice(ticket.assigned_to) }}</p>
                    <p>Creado: {{ formatShortDate(ticket.created_at) }}</p>
                    <p>Ultima actualizacion: {{ formatDateTime(ticket.updated_at) }}</p>
                  </div>
                </div>

                <UButton :to="`/ticket/${ticket.id}`" color="neutral" variant="ghost">
                  Ver detalle
                </UButton>
              </div>
            </div>
          </div>

          <div v-else class="rounded-[1.5rem] border border-dashed border-default px-5 py-10 text-center text-sm text-muted">
            Cuando crees tu primer ticket, aca vas a ver el seguimiento resumido de cada caso.
          </div>
        </UCard>

        <div class="grid gap-6">
          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Documentos recientes</h2>
                <p class="mt-1 text-sm text-muted">Estado de lo ultimo que paso por revision o aprobacion.</p>
              </div>
            </template>

            <div v-if="recentDocuments.length" class="grid gap-3">
              <div
                v-for="document in recentDocuments"
                :key="document.id"
                class="rounded-2xl border border-default/80 bg-elevated/50 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted">{{ document.templateTitle }}</p>
                    <p class="mt-1 text-sm text-muted">
                      Ticket #{{ document.ticket_id.slice(0, 8) }}
                    </p>
                    <p class="mt-2 text-xs text-toned">
                      {{ formatDateTime(document.created_at) }}
                    </p>
                    <p v-if="document.rejection_reason" class="mt-2 text-sm text-error">
                      {{ document.rejection_reason }}
                    </p>
                  </div>

                  <div class="flex flex-col items-end gap-2">
                    <UBadge :color="documentStatusColors[document.status]" variant="subtle">
                      {{ documentStatusLabels[document.status] }}
                    </UBadge>
                    <UButton :to="`/ticket/${document.ticket_id}`" color="neutral" variant="ghost">
                      Ver ticket
                    </UButton>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="rounded-2xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
              Tus documentos aparecera aqui cuando un tramite requiera revision o generacion.
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Actividad reciente</h2>
                <p class="mt-1 text-sm text-muted">Novedades que vale la pena revisar primero.</p>
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
              No hay notificaciones recientes. Cuando algo cambie en un caso, te avisaremos aqui.
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Accesos rapidos</h2>
                <p class="mt-1 text-sm text-muted">Atajos utiles para moverte rapido dentro de la app.</p>
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
