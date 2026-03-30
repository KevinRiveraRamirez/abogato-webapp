<script setup lang="ts">
import {
  isLawyerAvailabilityStatus,
  lawyerAvailabilityLabels,
  roleLabels,
  type AppRole,
} from '~~/shared/roles'

definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

type ProfileAuditOrigin = 'manual' | 'system'
type TicketAssignmentSource = 'auto' | 'manual' | 'self' | 'unassigned'
type AuditView = 'profiles' | 'assignments'

type AuditFieldChange = {
  old: unknown
  new: unknown
}

type ProfileAuditItem = {
  id: string
  profile_user_id: string
  actor_user_id: string | null
  actor_name: string
  target_name: string
  target_email: string | null
  changed_fields: Record<string, AuditFieldChange>
  created_at: string
  change_count: number
}

type ProfileAuditResponse = {
  items: ProfileAuditItem[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

type AssignmentAuditItem = {
  id: string
  ticket_id: string
  ticket_title: string
  previous_assigned_to: string | null
  previous_assigned_to_name: string
  assigned_to: string | null
  assigned_to_name: string
  assigned_by: string | null
  assigned_by_name: string
  assignment_source: TicketAssignmentSource
  notes: string | null
  created_at: string
}

type AssignmentAuditResponse = {
  items: AssignmentAuditItem[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

const { adminFetch } = useAdminApi()

const vistaActiva = ref<AuditView>('profiles')

const loadingPerfiles = ref(false)
const errorPerfiles = ref('')
const perfilesPage = ref(1)
const perfilesPerPage = ref(10)
const perfilesSearch = ref('')
const perfilesOrigenes = ref<ProfileAuditOrigin[]>([])
const perfilesItems = ref<ProfileAuditItem[]>([])
const perfilesTotal = ref(0)

const loadingAsignaciones = ref(false)
const errorAsignaciones = ref('')
const asignacionesPage = ref(1)
const asignacionesPerPage = ref(10)
const asignacionesSearch = ref('')
const asignacionesFuentes = ref<TicketAssignmentSource[]>([])
const asignacionesItems = ref<AssignmentAuditItem[]>([])
const asignacionesTotal = ref(0)

const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

const origenesPerfil = ['manual', 'system'] as const
const fuentesAsignacion = ['auto', 'manual', 'self', 'unassigned'] as const

const etiquetasOrigenPerfil: Record<ProfileAuditOrigin, string> = {
  manual: 'Hecho por usuario',
  system: 'Hecho por sistema',
}

const colorOrigenPerfil: Record<ProfileAuditOrigin, 'primary' | 'neutral'> = {
  manual: 'primary',
  system: 'neutral',
}

const etiquetasFuenteAsignacion: Record<TicketAssignmentSource, string> = {
  auto: 'Autoasignación',
  manual: 'Gestión admin',
  self: 'Tomado por abogado',
  unassigned: 'Sin responsable',
}

const colorFuenteAsignacion: Record<TicketAssignmentSource, 'primary' | 'neutral' | 'info' | 'warning'> = {
  auto: 'primary',
  manual: 'neutral',
  self: 'info',
  unassigned: 'warning',
}

const etiquetasCambio: Record<string, string> = {
  contact_email: 'Correo de contacto',
  contact_phone: 'Teléfono',
  personal_address: 'Dirección personal',
  office_address: 'Oficina / notaría',
  role: 'Rol',
  is_active: 'Estado de acceso',
  professional_license_number: 'Cédula profesional',
  professional_license_expires_at: 'Vigencia de cédula',
  availability_status: 'Disponibilidad',
}

const resumen = computed(() => ({
  perfiles: perfilesTotal.value,
  asignaciones: asignacionesTotal.value,
  actual: vistaActiva.value === 'profiles' ? perfilesItems.value.length : asignacionesItems.value.length,
}))

const hayFiltrosPerfil = computed(() =>
  Boolean(perfilesSearch.value.trim()) || perfilesOrigenes.value.length > 0
)

const hayFiltrosAsignacion = computed(() =>
  Boolean(asignacionesSearch.value.trim()) || asignacionesFuentes.value.length > 0
)

const resumenPaginacionPerfiles = computed(() => {
  if (!perfilesTotal.value) {
    return { inicio: 0, fin: 0 }
  }

  const inicio = (perfilesPage.value - 1) * perfilesPerPage.value + 1
  const fin = Math.min(inicio + perfilesPerPage.value - 1, perfilesTotal.value)

  return { inicio, fin }
})

const resumenPaginacionAsignaciones = computed(() => {
  if (!asignacionesTotal.value) {
    return { inicio: 0, fin: 0 }
  }

  const inicio = (asignacionesPage.value - 1) * asignacionesPerPage.value + 1
  const fin = Math.min(inicio + asignacionesPerPage.value - 1, asignacionesTotal.value)

  return { inicio, fin }
})

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

  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudo cargar la auditoría.'
}

function formatearFechaHora(fecha: string | null) {
  if (!fecha) return 'Sin fecha'

  return new Date(fecha).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatearValorCambio(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') {
    if (field === 'availability_status') return 'Sin estado manual'
    if (field === 'professional_license_expires_at') return 'Sin vigencia'
    return 'Vacío'
  }

  if (field === 'role' && typeof value === 'string' && value in roleLabels) {
    return roleLabels[value as AppRole]
  }

  if (field === 'availability_status' && isLawyerAvailabilityStatus(value)) {
    return lawyerAvailabilityLabels[value]
  }

  if (field === 'is_active' && typeof value === 'boolean') {
    return value ? 'Activo' : 'Inactivo'
  }

  if (field.endsWith('_at') && typeof value === 'string') {
    return formatearFechaHora(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  return String(value)
}

function obtenerCambios(item: ProfileAuditItem) {
  return Object.entries(item.changed_fields ?? {}).map(([field, change]) => ({
    key: field,
    label: etiquetasCambio[field] ?? field,
    oldValue: formatearValorCambio(field, change?.old),
    newValue: formatearValorCambio(field, change?.new),
  }))
}

function toggleOrigenPerfil(origen: ProfileAuditOrigin) {
  perfilesOrigenes.value = perfilesOrigenes.value.includes(origen)
    ? perfilesOrigenes.value.filter(item => item !== origen)
    : [...perfilesOrigenes.value, origen]
}

function toggleFuenteAsignacion(fuente: TicketAssignmentSource) {
  asignacionesFuentes.value = asignacionesFuentes.value.includes(fuente)
    ? asignacionesFuentes.value.filter(item => item !== fuente)
    : [...asignacionesFuentes.value, fuente]
}

function limpiarFiltrosPerfiles() {
  perfilesSearch.value = ''
  perfilesOrigenes.value = []
}

function limpiarFiltrosAsignaciones() {
  asignacionesSearch.value = ''
  asignacionesFuentes.value = []
}

async function cargarAuditoriaPerfiles() {
  loadingPerfiles.value = true
  errorPerfiles.value = ''

  try {
    const response = await adminFetch<ProfileAuditResponse>('/api/admin/audit/profile-changes', {
      query: {
        page: perfilesPage.value,
        perPage: perfilesPerPage.value,
        search: perfilesSearch.value.trim() || undefined,
        origins: perfilesOrigenes.value.join(',') || undefined,
      },
    })

    perfilesItems.value = response.items
    perfilesTotal.value = response.total
  } catch (error) {
    errorPerfiles.value = obtenerMensajeError(error)
  } finally {
    loadingPerfiles.value = false
  }
}

async function cargarAuditoriaAsignaciones() {
  loadingAsignaciones.value = true
  errorAsignaciones.value = ''

  try {
    const response = await adminFetch<AssignmentAuditResponse>('/api/admin/audit/ticket-assignments', {
      query: {
        page: asignacionesPage.value,
        perPage: asignacionesPerPage.value,
        search: asignacionesSearch.value.trim() || undefined,
        sources: asignacionesFuentes.value.join(',') || undefined,
      },
    })

    asignacionesItems.value = response.items
    asignacionesTotal.value = response.total
  } catch (error) {
    errorAsignaciones.value = obtenerMensajeError(error)
  } finally {
    loadingAsignaciones.value = false
  }
}

async function recargarVistaActiva() {
  if (vistaActiva.value === 'profiles') {
    await cargarAuditoriaPerfiles()
    return
  }

  await cargarAuditoriaAsignaciones()
}

watch([perfilesSearch, perfilesOrigenes, perfilesPerPage], () => {
  perfilesPage.value = 1
})

watch([asignacionesSearch, asignacionesFuentes, asignacionesPerPage], () => {
  asignacionesPage.value = 1
})

watch([perfilesPage, perfilesPerPage, perfilesSearch, perfilesOrigenes], () => {
  void cargarAuditoriaPerfiles()
}, { immediate: true })

watch([asignacionesPage, asignacionesPerPage, asignacionesSearch, asignacionesFuentes], () => {
  void cargarAuditoriaAsignaciones()
}, { immediate: true })
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <AppPageHeader
      eyebrow="Admin"
      title="Auditoría"
      description="Un centro de trazabilidad para entender qué cambió, quién lo hizo y cómo se movieron las asignaciones dentro de la operación."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" to="/admin/usuarios">
          Ver usuarios
        </UButton>
        <UButton color="neutral" variant="outline" to="/admin/tickets">
          Ver tickets
        </UButton>
        <UButton color="primary" variant="soft" :loading="vistaActiva === 'profiles' ? loadingPerfiles : loadingAsignaciones" @click="recargarVistaActiva">
          Actualizar
        </UButton>
      </template>
    </AppPageHeader>

    <div class="grid gap-4 md:grid-cols-3">
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Cambios de perfil</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.perfiles }}</p>
        <p class="mt-2 text-sm text-muted">Eventos auditados sobre cuentas y datos sensibles.</p>
      </UCard>

      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">Asignaciones</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.asignaciones }}</p>
        <p class="mt-2 text-sm text-muted">Movimientos operativos de responsabilidad por ticket.</p>
      </UCard>

      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Feed activo</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.actual }}</p>
        <p class="mt-2 text-sm text-muted">
          {{ vistaActiva === 'profiles' ? 'Entradas visibles del historial de perfiles.' : 'Entradas visibles del historial de asignación.' }}
        </p>
      </UCard>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton
        :color="vistaActiva === 'profiles' ? 'primary' : 'neutral'"
        :variant="vistaActiva === 'profiles' ? 'solid' : 'outline'"
        @click="vistaActiva = 'profiles'"
      >
        Perfiles
      </UButton>

      <UButton
        :color="vistaActiva === 'assignments' ? 'primary' : 'neutral'"
        :variant="vistaActiva === 'assignments' ? 'solid' : 'outline'"
        @click="vistaActiva = 'assignments'"
      >
        Asignaciones
      </UButton>
    </div>

    <UCard v-if="vistaActiva === 'profiles'">
      <template #header>
        <AppFilterToolbar
          v-model:search-term="perfilesSearch"
          v-model:per-page="perfilesPerPage"
          title="Cambios de perfil"
          description="Buscá por usuario afectado o por actor que ejecutó el cambio."
          search-placeholder="Buscar por usuario o actor"
          :results-label="`Mostrando ${resumenPaginacionPerfiles.inicio}-${resumenPaginacionPerfiles.fin} de ${perfilesTotal}`"
          :per-page-options="opcionesCantidadPorPagina"
          :has-active-filters="hayFiltrosPerfil"
          :active-filter-count="perfilesOrigenes.length"
          @clear-filters="limpiarFiltrosPerfiles"
        >
          <template #titleMeta>
            <UBadge color="neutral" variant="subtle">
              Feed global
            </UBadge>
          </template>

          <template #filters>
            <div class="grid gap-2">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Origen del cambio</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  :color="perfilesOrigenes.length === 0 ? 'primary' : 'neutral'"
                  :variant="perfilesOrigenes.length === 0 ? 'solid' : 'outline'"
                  @click="perfilesOrigenes = []"
                >
                  Todos
                </UButton>

                <UButton
                  v-for="origen in origenesPerfil"
                  :key="origen"
                  size="sm"
                  :color="perfilesOrigenes.includes(origen) ? 'primary' : 'neutral'"
                  :variant="perfilesOrigenes.includes(origen) ? 'solid' : 'outline'"
                  @click="toggleOrigenPerfil(origen)"
                >
                  {{ etiquetasOrigenPerfil[origen] }}
                </UButton>
              </div>
            </div>
          </template>
        </AppFilterToolbar>
      </template>

      <div v-if="errorPerfiles" class="rounded-2xl border border-error/20 bg-error/5 px-4 py-4 text-sm text-error">
        {{ errorPerfiles }}
      </div>

      <SkeletonListCards v-else-if="loadingPerfiles && !perfilesItems.length" :items="4" />

      <div v-else-if="!perfilesItems.length" class="py-10 text-center">
        <p class="font-medium text-highlighted">No hay cambios de perfil para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Probá otra búsqueda o cambiá el origen del evento.</p>
      </div>

      <div v-else class="grid gap-4">
        <div
          v-for="item in perfilesItems"
          :key="item.id"
          class="rounded-[1.6rem] border border-default/80 bg-elevated/45 p-5 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold text-highlighted">
                  {{ item.target_name }}
                </p>
                <UBadge :color="item.actor_user_id ? colorOrigenPerfil.manual : colorOrigenPerfil.system" variant="soft">
                  {{ item.actor_user_id ? etiquetasOrigenPerfil.manual : etiquetasOrigenPerfil.system }}
                </UBadge>
                <UBadge color="neutral" variant="outline">
                  {{ item.change_count }} cambio(s)
                </UBadge>
              </div>

              <p class="mt-2 text-sm text-muted">
                {{ item.target_email || 'Sin correo sincronizado' }}
              </p>
              <p class="mt-2 text-xs text-muted">
                Por {{ item.actor_name }} · {{ formatearFechaHora(item.created_at) }}
              </p>
            </div>

            <UButton color="neutral" variant="ghost" to="/admin/usuarios">
              Abrir usuarios
            </UButton>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <UBadge
              v-for="change in obtenerCambios(item)"
              :key="`${item.id}-${change.key}`"
              color="primary"
              variant="soft"
            >
              {{ change.label }}
            </UBadge>
          </div>

          <div class="mt-4 grid gap-3 lg:grid-cols-2">
            <div
              v-for="change in obtenerCambios(item)"
              :key="`${item.id}-${change.key}-detail`"
              class="rounded-2xl border border-default/80 bg-default/90 p-4"
            >
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {{ change.label }}
              </p>
              <p class="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                Antes
              </p>
              <p class="mt-1 text-sm text-highlighted">
                {{ change.oldValue }}
              </p>
              <p class="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                Ahora
              </p>
              <p class="mt-1 text-sm text-highlighted">
                {{ change.newValue }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <template v-if="perfilesTotal">
        <USeparator class="mt-6" />

        <div class="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">
            Página {{ perfilesPage }} de {{ Math.max(1, Math.ceil(perfilesTotal / perfilesPerPage)) }}
          </p>

          <UPagination
            v-model:page="perfilesPage"
            :total="perfilesTotal"
            :items-per-page="perfilesPerPage"
            show-edges
            active-color="primary"
            active-variant="solid"
          />
        </div>
      </template>
    </UCard>

    <UCard v-else>
      <template #header>
        <AppFilterToolbar
          v-model:search-term="asignacionesSearch"
          v-model:per-page="asignacionesPerPage"
          title="Movimientos de asignación"
          description="Buscá por actor, responsable anterior, responsable actual, título del ticket o notas."
          search-placeholder="Buscar por ticket, actor o responsable"
          :results-label="`Mostrando ${resumenPaginacionAsignaciones.inicio}-${resumenPaginacionAsignaciones.fin} de ${asignacionesTotal}`"
          :per-page-options="opcionesCantidadPorPagina"
          :has-active-filters="hayFiltrosAsignacion"
          :active-filter-count="asignacionesFuentes.length"
          @clear-filters="limpiarFiltrosAsignaciones"
        >
          <template #titleMeta>
            <UBadge color="neutral" variant="subtle">
              Flujo operativo
            </UBadge>
          </template>

          <template #filters>
            <div class="grid gap-2">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Fuente</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  :color="asignacionesFuentes.length === 0 ? 'primary' : 'neutral'"
                  :variant="asignacionesFuentes.length === 0 ? 'solid' : 'outline'"
                  @click="asignacionesFuentes = []"
                >
                  Todas
                </UButton>

                <UButton
                  v-for="fuente in fuentesAsignacion"
                  :key="fuente"
                  size="sm"
                  :color="asignacionesFuentes.includes(fuente) ? 'primary' : 'neutral'"
                  :variant="asignacionesFuentes.includes(fuente) ? 'solid' : 'outline'"
                  @click="toggleFuenteAsignacion(fuente)"
                >
                  {{ etiquetasFuenteAsignacion[fuente] }}
                </UButton>
              </div>
            </div>
          </template>
        </AppFilterToolbar>
      </template>

      <div v-if="errorAsignaciones" class="rounded-2xl border border-error/20 bg-error/5 px-4 py-4 text-sm text-error">
        {{ errorAsignaciones }}
      </div>

      <SkeletonListCards v-else-if="loadingAsignaciones && !asignacionesItems.length" :items="4" />

      <div v-else-if="!asignacionesItems.length" class="py-10 text-center">
        <p class="font-medium text-highlighted">No hay movimientos de asignación para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Probá otra búsqueda o revisá otra fuente del evento.</p>
      </div>

      <div v-else class="grid gap-4">
        <div
          v-for="item in asignacionesItems"
          :key="item.id"
          class="rounded-[1.6rem] border border-default/80 bg-elevated/45 p-5 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold text-highlighted">
                  #{{ item.ticket_id.slice(0, 8) }} · {{ item.ticket_title }}
                </p>
                <UBadge :color="colorFuenteAsignacion[item.assignment_source]" variant="soft">
                  {{ etiquetasFuenteAsignacion[item.assignment_source] }}
                </UBadge>
              </div>

              <p class="mt-2 text-sm text-muted">
                Registrado por {{ item.assigned_by_name }}
              </p>
              <p class="mt-2 text-xs text-muted">
                {{ formatearFechaHora(item.created_at) }}
              </p>
            </div>

            <UButton color="neutral" variant="ghost" :to="`/ticket/${item.ticket_id}`">
              Abrir ticket
            </UButton>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl border border-default/80 bg-default/90 p-4">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Antes</p>
              <p class="mt-2 text-sm text-highlighted">
                {{ item.previous_assigned_to_name }}
              </p>
            </div>

            <div class="rounded-2xl border border-default/80 bg-default/90 p-4">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Después</p>
              <p class="mt-2 text-sm text-highlighted">
                {{ item.assigned_to_name }}
              </p>
            </div>
          </div>

          <p v-if="item.notes" class="mt-4 text-sm text-muted">
            {{ item.notes }}
          </p>
        </div>
      </div>

      <template v-if="asignacionesTotal">
        <USeparator class="mt-6" />

        <div class="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">
            Página {{ asignacionesPage }} de {{ Math.max(1, Math.ceil(asignacionesTotal / asignacionesPerPage)) }}
          </p>

          <UPagination
            v-model:page="asignacionesPage"
            :total="asignacionesTotal"
            :items-per-page="asignacionesPerPage"
            show-edges
            active-color="primary"
            active-variant="solid"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
