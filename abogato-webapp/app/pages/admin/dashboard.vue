<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const { adminFetch } = useAdminApi()
const { finish: finishSessionLoading } = useSessionLoading()

type DashboardMetric = {
  key: string
  label: string
  value: number
}

type DashboardResponse = {
  summary: {
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    closedTickets: number
    cancelledTickets: number
    reopenRequests: number
    unassignedTickets: number
    submittedDocuments: number
    approvedDocuments: number
    rejectedDocuments: number
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    adminUsers: number
    lawyerUsers: number
    clientUsers: number
  }
  ticketsByStatus: DashboardMetric[]
  documentsByStatus: DashboardMetric[]
  usersByRole: DashboardMetric[]
  recentTickets: Array<{
    id: string
    title: string
    status: string
    priority: string
    created_at: string
    reopen_requested: boolean
    created_by_name: string
    assigned_to_name: string | null
  }>
  recentNotifications: Array<{
    id: string
    title: string
    type: string
    created_at: string
    recipient_name: string
  }>
}

const loading = ref(false)
const errorMsg = ref('')
const dashboard = ref<DashboardResponse | null>(null)
const isInitialLoading = computed(() => loading.value && !dashboard.value)

const etiquetaEstadoTicket: Record<string, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

const etiquetaPrioridad: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
}

const healthCards = computed(() => {
  if (!dashboard.value) return []

  return [
    {
      label: 'Tickets abiertos',
      value: dashboard.value.summary.openTickets + dashboard.value.summary.inProgressTickets,
      helper: 'Pendientes o en revisión en este momento.',
      icon: 'i-lucide-briefcase-business',
    },
    {
      label: 'Reaperturas pendientes',
      value: dashboard.value.summary.reopenRequests,
      helper: 'Casos esperando decisión administrativa.',
      icon: 'i-lucide-rotate-ccw',
    },
    {
      label: 'Documentos por revisar',
      value: dashboard.value.summary.submittedDocuments,
      helper: 'Documentos todavía en estado enviado.',
      icon: 'i-lucide-file-warning',
    },
    {
      label: 'Usuarios activos',
      value: dashboard.value.summary.activeUsers,
      helper: `${dashboard.value.summary.inactiveUsers} cuentas inactivas actualmente.`,
      icon: 'i-lucide-users',
    },
  ]
})

const operationalCards = computed(() => {
  if (!dashboard.value) return []

  return [
    {
      label: 'Tickets sin asignar',
      value: dashboard.value.summary.unassignedTickets,
      tone: 'warning',
      helper: 'Sirve para detectar cuellos de botella en la toma de casos.',
    },
    {
      label: 'Casos finalizados',
      value: dashboard.value.summary.closedTickets + dashboard.value.summary.resolvedTickets,
      tone: 'neutral',
      helper: 'Incluye resueltos y cerrados.',
    },
    {
      label: 'Clientes registrados',
      value: dashboard.value.summary.clientUsers,
      tone: 'success',
      helper: 'Cuentas con rol cliente en el sistema.',
    },
    {
      label: 'Equipo interno',
      value: dashboard.value.summary.adminUsers + dashboard.value.summary.lawyerUsers,
      tone: 'info',
      helper: 'Suma admins y abogados activos o inactivos.',
    },
  ]
})

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function porcentaje(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function obtenerMensajeError(error: unknown) {
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

  if (error instanceof Error) return error.message
  return 'No se pudo cargar el dashboard.'
}

async function cargarDashboard() {
  loading.value = true
  errorMsg.value = ''

  try {
    dashboard.value = await adminFetch<DashboardResponse>('/api/admin/dashboard')
  } catch (error) {
    errorMsg.value = obtenerMensajeError(error)
  } finally {
    loading.value = false
    finishSessionLoading()
  }
}

onMounted(() => {
  cargarDashboard()
})
</script>

<template>
  <SkeletonDashboardPage v-if="isInitialLoading" />

  <div v-else class="mx-auto w-full max-w-7xl space-y-8">
<AppPageHeader
  eyebrow="Admin"
  title="Estado general del sistema"
  description="Un panel operativo para ver carga de tickets, reaperturas, revisión documental y salud de usuarios sin mezclarlo con la vista del abogado."
/>

<div class="flex justify-end">
  <UButton
    color="neutral"
    variant="outline"
    icon="i-lucide-refresh-cw"
    :loading="loading"
    @click="cargarDashboard"
  >
    Actualizar métricas
  </UButton>
</div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo cargar el dashboard"
      :description="errorMsg"
    />

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard
        v-for="card in healthCards"
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

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard
        v-for="card in operationalCards"
        :key="card.label"
        class="border border-default/80 bg-default/90 shadow-sm"
      >
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">{{ card.label }}</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ card.value }}</p>
        <p class="mt-3 text-sm text-muted">{{ card.helper }}</p>
      </UCard>
    </div>

    <template v-if="dashboard">
      <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCollapsibleCard
          title="Distribución de tickets"
          description="Cómo está repartida la carga actual del flujo legal."
        >
          <div class="grid gap-4">
            <div
              v-for="item in dashboard.ticketsByStatus"
              :key="item.key"
              class="rounded-[1.5rem] border border-default/80 bg-elevated/60 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium text-highlighted">{{ item.label }}</p>
                  <p class="mt-1 text-sm text-muted">{{ item.value }} tickets</p>
                </div>
                <p class="text-lg font-semibold text-highlighted">
                  {{ porcentaje(item.value, dashboard.summary.totalTickets) }}%
                </p>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300"
                  :style="{ width: `${porcentaje(item.value, dashboard.summary.totalTickets)}%` }"
                />
              </div>
            </div>
          </div>
        </DashboardCollapsibleCard>

        <div class="grid gap-6">
          <DashboardCollapsibleCard
            title="Documentos"
            description="Panorama rápido de revisión documental."
          >
            <div class="grid gap-3">
              <div
                v-for="item in dashboard.documentsByStatus"
                :key="item.key"
                class="flex items-center justify-between rounded-2xl border border-default/80 bg-elevated/60 px-4 py-3"
              >
                <span class="text-sm text-highlighted">{{ item.label }}</span>
                <span class="text-lg font-semibold text-highlighted">{{ item.value }}</span>
              </div>
            </div>
          </DashboardCollapsibleCard>

          <DashboardCollapsibleCard
            title="Usuarios por rol"
            description="Composición de la base actual."
          >
            <div class="grid gap-3">
              <div
                v-for="item in dashboard.usersByRole"
                :key="item.key"
                class="flex items-center justify-between rounded-2xl border border-default/80 bg-elevated/60 px-4 py-3"
              >
                <span class="text-sm text-highlighted">{{ item.label }}</span>
                <span class="text-lg font-semibold text-highlighted">{{ item.value }}</span>
              </div>
            </div>
          </DashboardCollapsibleCard>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCollapsibleCard
          title="Tickets recientes"
          description="Últimos casos ingresados o movidos dentro del flujo."
        >
          <template #header-extra>
            <UButton to="/admin/tickets" color="neutral" variant="outline">
              Ver tickets
            </UButton>
          </template>

          <div class="grid gap-3">
            <UCard
              v-for="ticket in dashboard.recentTickets"
              :key="ticket.id"
              class="border border-default/80 bg-default/90 shadow-none"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge color="neutral" variant="outline">
                      #{{ String(ticket.id).slice(0, 8) }}
                    </UBadge>
                    <UBadge v-if="ticket.reopen_requested" color="warning" variant="soft">
                      Reapertura
                    </UBadge>
                  </div>
                  <p class="mt-3 font-semibold text-highlighted">{{ ticket.title }}</p>
                  <div class="mt-2 grid gap-1 text-sm text-muted">
                    <p>Cliente: {{ ticket.created_by_name }}</p>
                    <p>Responsable: {{ ticket.assigned_to_name || 'Sin asignar' }}</p>
                    <p>Creado: {{ formatearFecha(ticket.created_at) }}</p>
                  </div>
                  </div>

                <div class="flex flex-wrap gap-2">
                  <UBadge color="primary" variant="subtle">{{ etiquetaEstadoTicket[ticket.status] ?? ticket.status }}</UBadge>
                  <UBadge color="neutral" variant="outline">{{ etiquetaPrioridad[ticket.priority] ?? ticket.priority }}</UBadge>
                  <UButton :to="`/ticket/${ticket.id}`" color="neutral" variant="ghost">
                    Ver detalle
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>
        </DashboardCollapsibleCard>

        <DashboardCollapsibleCard
          title="Actividad reciente"
          description="Notificaciones generadas más recientemente en el sistema."
        >
          <div class="grid gap-3">
            <UCard
              v-for="item in dashboard.recentNotifications"
              :key="item.id"
              class="border border-default/80 bg-default/90 shadow-none"
            >
              <p class="font-medium text-highlighted">{{ item.title }}</p>
              <p class="mt-2 text-sm text-muted">{{ item.recipient_name }}</p>
              <div class="mt-3 flex items-center justify-between gap-3 text-xs text-toned">
                <span>{{ item.type }}</span>
                <span>{{ formatearFecha(item.created_at) }}</span>
              </div>
            </UCard>
          </div>
        </DashboardCollapsibleCard>
      </div>

      <DashboardCollapsibleCard
        title="Accesos rapidos"
        description="Entradas directas a los modulos de administracion."
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="item in [
              { title: 'Tickets', description: 'Ver y gestionar todos los tickets del sistema.', to: '/admin/tickets', icon: 'i-lucide-ticket' },
              { title: 'Usuarios', description: 'Administrar cuentas, roles y estado de acceso.', to: '/admin/usuarios', icon: 'i-lucide-users' },
              { title: 'Plantillas', description: 'Crear y editar plantillas de documentos legales.', to: '/admin/plantillas', icon: 'i-lucide-file-text' },
              { title: 'Auditoria', description: 'Revisar el historial de cambios en el sistema.', to: '/admin/auditoria', icon: 'i-lucide-history' },
              { title: 'Mi perfil', description: 'Actualizar datos personales y profesionales.', to: '/account/profile', icon: 'i-lucide-user-round' },
              { title: 'Seguridad', description: 'Cambiar contrasena y gestionar acceso a la cuenta.', to: '/account/security', icon: 'i-lucide-shield' },
            ]"
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
      </DashboardCollapsibleCard>
    </template>
  </div>
</template>
