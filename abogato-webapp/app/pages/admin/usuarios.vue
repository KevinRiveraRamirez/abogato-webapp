<script setup lang="ts">
import {
  canManageAdminAccounts,
  isLawyerAvailabilityStatus,
  isSuperadminRole,
  lawyerAvailabilityLabels,
  roleDescriptions,
  roleLabels,
  type AppRole,
  type LawyerAvailabilityStatus,
  type ManageableUserRole,
} from '~~/shared/roles'

definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { profile, cargarPerfil } = useUsuario()
const { adminFetch } = useAdminApi()

type UserRole = AppRole

type Usuario = {
  user_id: string
  created_at: string
  display_name: string | null
  contact_email: string | null
  contact_phone: string | null
  personal_address: string | null
  role: UserRole
  office_address: string | null
  professional_license_number: string | null
  professional_license_expires_at: string | null
  availability_status: LawyerAvailabilityStatus | null
  is_active: boolean
  deactivated_at: string | null
}

type AuditFieldChange = {
  old: unknown
  new: unknown
}

type ProfileAuditEntry = {
  id: string
  actor_user_id: string | null
  actor_name: string
  changed_fields: Record<string, AuditFieldChange>
  created_at: string
}

type ProfileAuditResponse = {
  items: ProfileAuditEntry[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

const AUDITORIA_POR_PAGINA = 5

const usuarios = ref<Usuario[]>([])
const loading = ref(false)
const savingUserId = ref<string | null>(null)
const filaExpandida = ref<string | null>(null)
const errorMsg = ref('')
const successMsg = ref('')
const busqueda = ref('')
const rolesSeleccionados = ref<UserRole[]>([])
const estadosSeleccionados = ref<Array<'activos' | 'inactivos'>>([])
const paginaActual = ref(1)
const cantidadPorPagina = ref(10)

const mostrarFormulario = ref(false)
const nuevoEmail = ref('')
const nuevoNombre = ref('')
const nuevoRol = ref<ManageableUserRole>('abogado')
const nuevaPassword = ref('')
const nuevaDireccionOficina = ref('')
const nuevaCedulaProfesional = ref('')
const creatingUser = ref(false)
const cedulasProfesionales = ref<Record<string, string>>({})
const auditoriaPorUsuario = ref<Record<string, ProfileAuditEntry[]>>({})
const auditoriaLoadingPorUsuario = ref<Record<string, boolean>>({})
const auditoriaErrorPorUsuario = ref<Record<string, string>>({})
const auditoriaPaginaPorUsuario = ref<Record<string, number>>({})
const auditoriaTotalPorUsuario = ref<Record<string, number>>({})

const colorRol: Record<UserRole, 'neutral' | 'info' | 'success' | 'primary'> = {
  cliente: 'neutral',
  abogado: 'info',
  admin: 'success',
  superadmin: 'primary',
}

const rolesFiltro = ['cliente', 'abogado', 'admin', 'superadmin'] as const
const estadosFiltro = ['activos', 'inactivos'] as const
const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

const esSuperadmin = computed(() => isSuperadminRole(profile.value?.role))

const opcionesRol = computed(() => {
  const baseOptions = [
    { label: 'Cliente', value: 'cliente' },
    { label: 'Abogado', value: 'abogado' },
  ] as Array<{ label: string, value: ManageableUserRole }>

  if (canManageAdminAccounts(profile.value?.role)) {
    baseOptions.push({ label: 'Admin', value: 'admin' })
  }

  return baseOptions
})

const mostrarCamposAbogado = computed(
  () => nuevoRol.value === 'abogado'
)

const usuariosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return usuarios.value.filter((usuario) => {
    const coincideRol = !rolesSeleccionados.value.length || rolesSeleccionados.value.includes(usuario.role)
    const coincideEstado = !estadosSeleccionados.value.length
      || (estadosSeleccionados.value.includes('activos') && usuario.is_active)
      || (estadosSeleccionados.value.includes('inactivos') && !usuario.is_active)

    if (!coincideRol || !coincideEstado) return false
    if (!termino) return true

    return [
      usuario.display_name ?? '',
      usuario.contact_email ?? '',
      usuario.contact_phone ?? '',
      roleLabels[usuario.role],
      roleDescriptions[usuario.role],
      usuario.office_address ?? '',
      usuario.personal_address ?? '',
      usuario.professional_license_number ?? '',
      usuario.availability_status ? lawyerAvailabilityLabels[usuario.availability_status] : '',
    ].some(value => value.toLowerCase().includes(termino))
  })
})

const totalUsuariosFiltrados = computed(() => usuariosFiltrados.value.length)

const totalPaginas = computed(() => {
  return Math.max(1, Math.ceil(totalUsuariosFiltrados.value / cantidadPorPagina.value))
})

const usuariosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value
  return usuariosFiltrados.value.slice(inicio, inicio + cantidadPorPagina.value)
})

const resumenPaginacion = computed(() => {
  if (!totalUsuariosFiltrados.value) {
    return { inicio: 0, fin: 0 }
  }

  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value + 1
  const fin = Math.min(inicio + cantidadPorPagina.value - 1, totalUsuariosFiltrados.value)

  return { inicio, fin }
})

const resumen = computed(() => ({
  total: usuarios.value.length,
  activos: usuarios.value.filter(usuario => usuario.is_active).length,
  inactivos: usuarios.value.filter(usuario => !usuario.is_active).length,
  internos: usuarios.value.filter(usuario => usuario.role === 'admin' || usuario.role === 'superadmin' || usuario.role === 'abogado').length,
}))

const hayFiltrosActivos = computed(() =>
  Boolean(busqueda.value.trim())
  || rolesSeleccionados.value.length > 0
  || estadosSeleccionados.value.length > 0
)

const filtrosAplicadosCount = computed(() =>
  rolesSeleccionados.value.length
  + estadosSeleccionados.value.length
)

const mostrarDireccionOficina = computed(
  () => nuevoRol.value === 'abogado' || nuevoRol.value === 'admin'
)

const etiquetasAuditoria: Record<string, string> = {
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

function formatearFechaHora(fecha: string | null) {
  if (!fecha) return 'Sin dato'

  return new Date(fecha).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatearFechaCorta(fecha: string | null) {
  if (!fecha) return 'Sin dato'

  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatearVigenciaProfesional(fecha: string | null) {
  if (!fecha) return 'Sin vigencia registrada'

  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function obtenerNombreVisible(usuario: Usuario) {
  return usuario.display_name
    || usuario.contact_email?.split('@')[0]
    || 'Sin nombre visible'
}

function obtenerIniciales(usuario: Usuario) {
  return obtenerNombreVisible(usuario)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(fragmento => fragmento[0]?.toUpperCase() ?? '')
    .join('')
}

function obtenerResumenEstado(usuario: Usuario) {
  return usuario.is_active
    ? 'Acceso habilitado'
    : `Suspendido el ${formatearFechaHora(usuario.deactivated_at)}`
}

function sincronizarCedulasProfesionales(userRows: Usuario[]) {
  cedulasProfesionales.value = Object.fromEntries(
    userRows.map(usuario => [usuario.user_id, usuario.professional_license_number ?? ''])
  )
}

function obtenerCedulaProfesional(usuario: Usuario) {
  return cedulasProfesionales.value[usuario.user_id] ?? usuario.professional_license_number ?? ''
}

function actualizarCedulaProfesionalLocal(userId: string, value: string) {
  cedulasProfesionales.value = {
    ...cedulasProfesionales.value,
    [userId]: value,
  }
}

function puedeEditarUsuario(usuario: Usuario) {
  if (esMismoUsuario(usuario)) return false
  if (usuario.role === 'superadmin') return esSuperadmin.value

  if (!esSuperadmin.value && (usuario.role === 'admin' || usuario.role === 'superadmin')) {
    return false
  }

  return true
}

function hayCambioCedulaProfesional(usuario: Usuario) {
  return obtenerCedulaProfesional(usuario).trim().toUpperCase() !== (usuario.professional_license_number ?? '')
}

function obtenerOpcionesRolUsuario(usuario: Usuario) {
  if (puedeEditarUsuario(usuario)) {
    return opcionesRol.value
  }

  return [{ label: roleLabels[usuario.role], value: usuario.role }]
}

function limpiarFiltros() {
  busqueda.value = ''
  rolesSeleccionados.value = []
  estadosSeleccionados.value = []
}

function toggleFiltroRol(rol: UserRole) {
  rolesSeleccionados.value = rolesSeleccionados.value.includes(rol)
    ? rolesSeleccionados.value.filter(item => item !== rol)
    : [...rolesSeleccionados.value, rol]
}

function toggleFiltroEstado(estado: (typeof estadosFiltro)[number]) {
  estadosSeleccionados.value = estadosSeleccionados.value.includes(estado)
    ? estadosSeleccionados.value.filter(item => item !== estado)
    : [...estadosSeleccionados.value, estado]
}

function actualizarFilaExpandida(userId: string, open: boolean) {
  filaExpandida.value = open ? userId : filaExpandida.value === userId ? null : filaExpandida.value

  if (open) {
    void cargarAuditoriaUsuario(userId, obtenerPaginaAuditoria(userId))
  }
}

function esMismoUsuario(usuario: Usuario) {
  return user.value?.id === usuario.user_id
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

  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudo completar la acción.'
}

function obtenerPaginaAuditoria(userId: string) {
  return auditoriaPaginaPorUsuario.value[userId] ?? 1
}

function obtenerTotalAuditoria(userId: string) {
  return auditoriaTotalPorUsuario.value[userId] ?? 0
}

function obtenerEntradasAuditoria(userId: string) {
  return auditoriaPorUsuario.value[userId] ?? []
}

function obtenerErrorAuditoria(userId: string) {
  return auditoriaErrorPorUsuario.value[userId] ?? ''
}

function obtenerTotalPaginasAuditoria(userId: string) {
  return Math.max(1, Math.ceil(obtenerTotalAuditoria(userId) / AUDITORIA_POR_PAGINA))
}

function formatearValorAuditoria(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') {
    if (field === 'availability_status') return 'Sin estado manual'
    if (field === 'professional_license_expires_at') return 'Sin vigencia'
    return 'Vacío'
  }

  if (field === 'role' && typeof value === 'string' && value in roleLabels) {
    return roleLabels[value as UserRole]
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

function obtenerCambiosAuditoria(entry: ProfileAuditEntry) {
  return Object.entries(entry.changed_fields ?? {}).map(([field, change]) => ({
    key: field,
    label: etiquetasAuditoria[field] ?? field,
    oldValue: formatearValorAuditoria(field, change?.old),
    newValue: formatearValorAuditoria(field, change?.new),
  }))
}

async function cargarAuditoriaUsuario(userId: string, page = 1) {
  auditoriaLoadingPorUsuario.value = {
    ...auditoriaLoadingPorUsuario.value,
    [userId]: true,
  }
  auditoriaErrorPorUsuario.value = {
    ...auditoriaErrorPorUsuario.value,
    [userId]: '',
  }

  try {
    const response = await adminFetch<ProfileAuditResponse>(`/api/admin/users/${userId}/audit`, {
      query: {
        page,
        perPage: AUDITORIA_POR_PAGINA,
      },
    })

    auditoriaPorUsuario.value = {
      ...auditoriaPorUsuario.value,
      [userId]: response.items,
    }
    auditoriaPaginaPorUsuario.value = {
      ...auditoriaPaginaPorUsuario.value,
      [userId]: response.page,
    }
    auditoriaTotalPorUsuario.value = {
      ...auditoriaTotalPorUsuario.value,
      [userId]: response.total,
    }
  } catch (error) {
    auditoriaErrorPorUsuario.value = {
      ...auditoriaErrorPorUsuario.value,
      [userId]: obtenerMensajeError(error),
    }
  } finally {
    auditoriaLoadingPorUsuario.value = {
      ...auditoriaLoadingPorUsuario.value,
      [userId]: false,
    }
  }
}

function cambiarPaginaAuditoria(userId: string, page: number) {
  void cargarAuditoriaUsuario(userId, page)
}

async function cargarUsuarios() {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, created_at, display_name, contact_email, contact_phone, personal_address, role, office_address, professional_license_number, professional_license_expires_at, availability_status, is_active, deactivated_at')
    .order('is_active', { ascending: false })
    .order('role')
    .order('display_name')

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  usuarios.value = (data ?? []) as Usuario[]
  sincronizarCedulasProfesionales(usuarios.value)
}

async function crearUsuario() {
  errorMsg.value = ''
  successMsg.value = ''

  creatingUser.value = true

  try {
    await adminFetch('/api/admin/users', {
      method: 'POST',
      body: {
        email: nuevoEmail.value.trim(),
        password: nuevaPassword.value,
        displayName: nuevoNombre.value.trim(),
        role: nuevoRol.value,
        officeAddress: mostrarDireccionOficina.value ? nuevaDireccionOficina.value.trim() : '',
        professionalLicenseNumber: mostrarCamposAbogado.value ? nuevaCedulaProfesional.value.trim().toUpperCase() : '',
      },
    })

    successMsg.value = `Cuenta creada para ${nuevoEmail.value.trim()}.`
    nuevoEmail.value = ''
    nuevoNombre.value = ''
    nuevoRol.value = 'abogado'
    nuevaPassword.value = ''
    nuevaDireccionOficina.value = ''
    nuevaCedulaProfesional.value = ''
    mostrarFormulario.value = false
    await cargarUsuarios()
  } catch (error) {
    errorMsg.value = obtenerMensajeError(error)
  } finally {
    creatingUser.value = false
  }
}

async function actualizarUsuario(
  usuario: Usuario,
  payload: {
    role?: ManageableUserRole
    isActive?: boolean
    professionalLicenseNumber?: string | null
  },
) {
  savingUserId.value = usuario.user_id
  errorMsg.value = ''
  successMsg.value = ''

  try {
    await adminFetch(`/api/admin/users/${usuario.user_id}`, {
      method: 'PATCH',
      body: payload,
    })

    successMsg.value = payload.professionalLicenseNumber !== undefined
      ? 'Credencial profesional actualizada correctamente.'
      : payload.isActive === false
      ? 'Usuario desactivado correctamente.'
      : payload.isActive === true
        ? 'Usuario reactivado correctamente.'
        : 'Rol actualizado correctamente.'

    await cargarUsuarios()
    if (filaExpandida.value === usuario.user_id) {
      await cargarAuditoriaUsuario(usuario.user_id, obtenerPaginaAuditoria(usuario.user_id))
    }
  } catch (error) {
    errorMsg.value = obtenerMensajeError(error)
  } finally {
    savingUserId.value = null
  }
}

async function cambiarRol(usuario: Usuario, role: UserRole) {
  if (usuario.role === role) return
  await actualizarUsuario(usuario, { role: role as ManageableUserRole })
}

async function guardarCedulaProfesional(usuario: Usuario) {
  await actualizarUsuario(usuario, {
    professionalLicenseNumber: obtenerCedulaProfesional(usuario).trim().toUpperCase() || null,
  })
}

async function toggleActivo(usuario: Usuario) {
  const accion = usuario.is_active ? 'desactivar' : 'reactivar'
  const confirmar = window.confirm(`¿Querés ${accion} a ${usuario.contact_email || 'este usuario'}?`)

  if (!confirmar) return

  await actualizarUsuario(usuario, { isActive: !usuario.is_active })
}

watch([busqueda, rolesSeleccionados, estadosSeleccionados, cantidadPorPagina], () => {
  paginaActual.value = 1
  filaExpandida.value = null
})

watch(nuevoRol, (role) => {
  if (role !== 'abogado') {
    nuevaCedulaProfesional.value = ''
  }
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

watch(usuariosPaginados, (lista) => {
  if (!filaExpandida.value) return

  const sigueVisible = lista.some(usuario => usuario.user_id === filaExpandida.value)
  if (!sigueVisible) filaExpandida.value = null
})

onMounted(() => {
  void Promise.all([cargarPerfil(), cargarUsuarios()])
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <AppPageHeader
      eyebrow="Admin"
      title="Gestión de usuarios"
      description="Cambiá roles, filtrá la base de usuarios y desactivá cuentas cuando necesites cortar su acceso. Las cuentas inactivas no podrán iniciar sesión ni usar rutas protegidas hasta ser reactivadas."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :loading="loading" @click="cargarUsuarios">
          Actualizar
        </UButton>
        <UButton @click="mostrarFormulario = !mostrarFormulario">
          {{ mostrarFormulario ? 'Cancelar' : 'Nuevo usuario' }}
        </UButton>
      </template>
    </AppPageHeader>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Total</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.total }}</p>
        <p class="mt-2 text-sm text-muted">Usuarios con perfil dentro del sistema.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">Activos</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.activos }}</p>
        <p class="mt-2 text-sm text-muted">Pueden ingresar y usar la plataforma.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-error-600">Inactivos</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.inactivos }}</p>
        <p class="mt-2 text-sm text-muted">Cuentas suspendidas hasta reactivación.</p>
      </UCard>
      <UCard>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Equipo interno</p>
        <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.internos }}</p>
        <p class="mt-2 text-sm text-muted">Admins y abogados con operación interna.</p>
      </UCard>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
    />

    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Cambios guardados"
      :description="successMsg"
    />

    <UCard v-if="mostrarFormulario">
      <template #header>
        <div>
          <h2 class="font-semibold text-highlighted">Crear usuario</h2>
          <p class="mt-1 text-sm text-muted">Las cuentas creadas desde admin quedan confirmadas y listas para iniciar sesión.</p>
        </div>
      </template>

      <div class="grid gap-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <UFormField label="Correo electrónico" required>
            <UInput
              v-model="nuevoEmail"
              type="email"
              placeholder="correo@ejemplo.com"
            />
          </UFormField>

          <UFormField label="Nombre visible">
            <UInput
              v-model="nuevoNombre"
              placeholder="Nombre completo"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <UFormField label="Contraseña" required help="Mínimo 8 caracteres, una mayúscula y un número.">
            <UInput
              v-model="nuevaPassword"
              type="password"
              placeholder="Contraseña segura"
            />
          </UFormField>

          <UFormField label="Rol">
            <USelect
              v-model="nuevoRol"
              value-key="value"
              :items="opcionesRol"
            />
          </UFormField>
        </div>

        <UFormField v-if="mostrarDireccionOficina" label="Dirección de oficina / notaría">
          <UTextarea
            v-model="nuevaDireccionOficina"
            :rows="3"
            placeholder="Dirección de oficina / notaría"
          />
        </UFormField>

        <UFormField
          v-if="mostrarCamposAbogado"
          label="Cédula profesional"
          help="Se guarda única en la plataforma y su vigencia inicial se extiende por 5 años."
        >
          <UInput
            v-model="nuevaCedulaProfesional"
            placeholder="Ejemplo: CP-001245"
          />
        </UFormField>

        <div class="flex flex-wrap gap-3">
          <UButton :loading="creatingUser" @click="crearUsuario">
            Crear usuario
          </UButton>
          <UButton color="neutral" variant="ghost" @click="mostrarFormulario = false">
            Cancelar
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <AppFilterToolbar
          v-model:search-term="busqueda"
          v-model:per-page="cantidadPorPagina"
          title="Base de usuarios"
          description="Vista compacta para revisar permisos, estado y contexto operativo sin salir del listado."
          search-placeholder="Buscar por nombre, correo, teléfono o dirección"
          :results-label="`Mostrando ${resumenPaginacion.inicio}-${resumenPaginacion.fin} de ${totalUsuariosFiltrados}`"
          :per-page-options="opcionesCantidadPorPagina"
          :has-active-filters="hayFiltrosActivos"
          :active-filter-count="filtrosAplicadosCount"
          @clear-filters="limpiarFiltros"
        >
          <template #titleMeta>
            <UBadge color="neutral" variant="subtle">
              {{ usuariosFiltrados.length }} visibles
            </UBadge>
          </template>

          <template #filters>
            <div class="grid gap-2">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Rol</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="sm"
                  :color="rolesSeleccionados.length === 0 ? 'primary' : 'neutral'"
                  :variant="rolesSeleccionados.length === 0 ? 'solid' : 'outline'"
                  @click="rolesSeleccionados = []"
                >
                  Todos los roles
                </UButton>

                <UButton
                  v-for="rol in rolesFiltro"
                  :key="rol"
                  size="sm"
                  :color="rolesSeleccionados.includes(rol) ? 'primary' : 'neutral'"
                  :variant="rolesSeleccionados.includes(rol) ? 'solid' : 'outline'"
                  @click="toggleFiltroRol(rol)"
                >
                  {{ roleLabels[rol] }}
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
                  Todos los estados
                </UButton>

                <UButton
                  v-for="estado in estadosFiltro"
                  :key="estado"
                  size="sm"
                  :color="estadosSeleccionados.includes(estado) ? 'primary' : 'neutral'"
                  :variant="estadosSeleccionados.includes(estado) ? 'solid' : 'outline'"
                  @click="toggleFiltroEstado(estado)"
                >
                  {{
                    estado === 'activos'
                      ? 'Activos'
                      : 'Inactivos'
                  }}
                </UButton>
              </div>
            </div>
          </template>
        </AppFilterToolbar>
      </template>

      <SkeletonListCards v-if="loading && !usuarios.length" :items="4" />

      <div v-else-if="!usuariosFiltrados.length" class="py-10 text-center">
        <p class="font-medium text-highlighted">No hay usuarios para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Ajustá la búsqueda o cambiá el estado seleccionado.</p>
      </div>

      <div
        v-else
        class="overflow-hidden rounded-[1.75rem] border border-default/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.3)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"
      >
        <div class="overflow-x-auto pb-1 [scrollbar-gutter:stable_both-edges]">
          <div class="min-w-[56rem]">
            <div class="grid grid-cols-[minmax(15rem,1.7fr)_minmax(16rem,1.7fr)_10rem_10rem_9rem] gap-4 border-b border-default/70 bg-elevated/70 pl-5 pr-9 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted sm:pr-10">
              <p>Usuario</p>
              <p>Correo</p>
              <p>Rol</p>
              <p>Estado</p>
              <p>Alta</p>
            </div>

            <div class="divide-y divide-default/60">
              <UCollapsible
                v-for="usuario in usuariosPaginados"
                :key="usuario.user_id"
                :open="filaExpandida === usuario.user_id"
                :unmount-on-hide="false"
                @update:open="(open) => actualizarFilaExpandida(usuario.user_id, open)"
              >
                <template #default="{ open }">
                  <button
                    type="button"
                    class="grid w-full grid-cols-[minmax(15rem,1.7fr)_minmax(16rem,1.7fr)_10rem_10rem_9rem] gap-4 pl-5 pr-9 py-4 text-left transition hover:bg-primary/5 sm:pr-10"
                    :class="[
                      open ? 'bg-primary/6' : '',
                      !usuario.is_active ? 'bg-error/5 hover:bg-error/8' : ''
                    ]"
                    :aria-label="open ? `Minimizar ${obtenerNombreVisible(usuario)}` : `Expandir ${obtenerNombreVisible(usuario)}`"
                  >
                    <div class="min-w-0">
                      <div class="flex items-center gap-3">
                        <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-default/80 bg-default/90 text-sm font-semibold text-primary shadow-sm">
                          {{ obtenerIniciales(usuario) }}
                        </div>

                        <div class="min-w-0">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="truncate font-semibold text-highlighted">
                              {{ obtenerNombreVisible(usuario) }}
                            </p>
                            <UBadge v-if="esMismoUsuario(usuario)" color="neutral" variant="outline" size="sm">
                              Tu cuenta
                            </UBadge>
                          </div>

                          <p class="mt-1 truncate text-xs text-muted">
                            ID {{ String(usuario.user_id).slice(0, 8) }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-highlighted">
                        {{ usuario.contact_email || 'Sin correo sincronizado' }}
                      </p>
                      <p class="mt-1 truncate text-xs text-muted">
                        {{ usuario.contact_phone || 'Sin teléfono registrado' }}
                      </p>
                    </div>

                    <div class="flex items-start">
                      <UBadge :color="colorRol[usuario.role]" variant="subtle">
                        {{ roleLabels[usuario.role] }}
                      </UBadge>
                    </div>

                    <div>
                      <UBadge :color="usuario.is_active ? 'success' : 'error'" variant="soft">
                        {{ usuario.is_active ? 'Activo' : 'Inactivo' }}
                      </UBadge>
                      <p class="mt-1 text-xs text-muted">
                        {{ usuario.is_active ? 'Acceso habilitado' : 'Acceso suspendido' }}
                      </p>
                    </div>

                    <div class="text-sm text-muted">
                      {{ formatearFechaCorta(usuario.created_at) }}
                    </div>
                  </button>
                </template>

                <template #content>
                  <div class="border-t border-default/60 bg-elevated/35 px-5 py-5">
                    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
                      <div class="grid gap-4 md:grid-cols-2">
                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Estado</p>
                          <p class="mt-2 font-semibold text-highlighted">
                            {{ usuario.is_active ? 'Cuenta habilitada' : 'Cuenta suspendida' }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            {{ obtenerResumenEstado(usuario) }}
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Acceso</p>
                          <p class="mt-2 font-semibold text-highlighted">
                            {{ roleLabels[usuario.role] }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            {{ roleDescriptions[usuario.role] }}
                          </p>
                          <p class="mt-3 text-xs text-muted">
                            Alta {{ formatearFechaHora(usuario.created_at) }}
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Contacto</p>
                          <p class="mt-2 text-sm font-medium text-highlighted">
                            {{ usuario.contact_email || 'Sin correo sincronizado' }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            {{ usuario.contact_phone || 'Sin teléfono registrado' }}
                          </p>
                        </div>

                        <div class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Oficina y domicilio</p>
                          <p class="mt-2 text-sm text-highlighted">
                            {{ usuario.office_address || 'Sin oficina / notaría' }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            {{ usuario.personal_address || 'Sin dirección personal registrada' }}
                          </p>
                        </div>

                        <div
                          v-if="usuario.role === 'abogado'"
                          class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm"
                        >
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Credencial profesional</p>
                          <p class="mt-2 text-sm font-medium text-highlighted">
                            {{ usuario.professional_license_number || 'Sin cédula profesional' }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            {{ formatearVigenciaProfesional(usuario.professional_license_expires_at) }}
                          </p>
                        </div>

                        <div
                          v-if="usuario.role === 'abogado'"
                          class="rounded-[1.4rem] border border-default/80 bg-default/90 p-4 shadow-sm"
                        >
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Disponibilidad</p>
                          <p class="mt-2 text-sm font-medium text-highlighted">
                            {{ lawyerAvailabilityLabels[isLawyerAvailabilityStatus(usuario.availability_status) ? usuario.availability_status : 'available'] }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            {{ isLawyerAvailabilityStatus(usuario.availability_status) ? 'Este estado impacta la autoasignación de nuevos tickets.' : 'Se tomará como disponible hasta que el abogado lo cambie.' }}
                          </p>
                        </div>
                      </div>

                      <div class="grid gap-3 rounded-[1.5rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Acciones rápidas</p>
                          <p class="mt-2 text-sm text-muted">
                            Ajustá permisos o bloqueá el acceso sin salir de la lista.
                          </p>
                        </div>

                        <UFormField label="Rol">
                          <USelect
                            :model-value="usuario.role"
                            value-key="value"
                            :disabled="savingUserId === usuario.user_id || !puedeEditarUsuario(usuario)"
                            :items="obtenerOpcionesRolUsuario(usuario)"
                            @update:model-value="(value) => cambiarRol(usuario, value as UserRole)"
                          />
                        </UFormField>

                        <UFormField
                          v-if="usuario.role === 'abogado'"
                          label="Cédula profesional"
                          help="Al guardarla o actualizarla, la vigencia se renueva por 5 años."
                        >
                          <div class="flex gap-2">
                            <UInput
                              :model-value="obtenerCedulaProfesional(usuario)"
                              :disabled="savingUserId === usuario.user_id || !puedeEditarUsuario(usuario)"
                              placeholder="Ejemplo: CP-001245"
                              class="flex-1"
                              @update:model-value="(value) => actualizarCedulaProfesionalLocal(usuario.user_id, String(value ?? ''))"
                            />
                            <UButton
                              color="neutral"
                              variant="outline"
                              :loading="savingUserId === usuario.user_id"
                              :disabled="savingUserId === usuario.user_id || !puedeEditarUsuario(usuario) || !hayCambioCedulaProfesional(usuario)"
                              @click="guardarCedulaProfesional(usuario)"
                            >
                              Guardar
                            </UButton>
                          </div>
                        </UFormField>

                        <UButton
                          :color="usuario.is_active ? 'error' : 'success'"
                          :variant="usuario.is_active ? 'soft' : 'solid'"
                          :loading="savingUserId === usuario.user_id"
                          :disabled="savingUserId === usuario.user_id || !puedeEditarUsuario(usuario)"
                          class="justify-center"
                          @click="toggleActivo(usuario)"
                        >
                          {{ usuario.is_active ? 'Desactivar acceso' : 'Reactivar acceso' }}
                        </UButton>

                        <p class="text-xs text-muted">
                          {{
                            esMismoUsuario(usuario)
                              ? 'Tu cuenta no se puede editar desde este panel.'
                              : !puedeEditarUsuario(usuario)
                                ? 'Solo una cuenta superadmin puede editar roles administrativos.'
                                : 'Los cambios se guardan inmediatamente.'
                          }}
                        </p>
                      </div>
                    </div>

                    <div class="mt-4 rounded-[1.5rem] border border-default/80 bg-default/90 p-4 shadow-sm">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Auditoría del perfil</p>
                          <p class="mt-2 text-sm text-muted">
                            Historial de cambios sensibles y operativos aplicados a esta cuenta.
                          </p>
                        </div>

                        <UBadge color="neutral" variant="outline">
                          {{ obtenerTotalAuditoria(usuario.user_id) }} registro(s)
                        </UBadge>
                      </div>

                      <div v-if="auditoriaLoadingPorUsuario[usuario.user_id] && !obtenerEntradasAuditoria(usuario.user_id).length" class="mt-4 rounded-2xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
                        Cargando historial de auditoría...
                      </div>

                      <div v-else-if="obtenerErrorAuditoria(usuario.user_id)" class="mt-4 rounded-2xl border border-error/20 bg-error/5 px-4 py-4 text-sm text-error">
                        {{ obtenerErrorAuditoria(usuario.user_id) }}
                      </div>

                      <div v-else-if="obtenerEntradasAuditoria(usuario.user_id).length" class="mt-4 grid gap-3">
                        <div
                          v-for="entry in obtenerEntradasAuditoria(usuario.user_id)"
                          :key="entry.id"
                          class="rounded-[1.25rem] border border-default/80 bg-elevated/45 p-4"
                        >
                          <div class="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p class="font-medium text-highlighted">
                                {{ entry.actor_name }}
                              </p>
                              <p class="mt-1 text-xs text-muted">
                                {{ formatearFechaHora(entry.created_at) }}
                              </p>
                            </div>

                            <UBadge color="primary" variant="soft">
                              {{ obtenerCambiosAuditoria(entry).length }} cambio(s)
                            </UBadge>
                          </div>

                          <div class="mt-4 grid gap-3 lg:grid-cols-2">
                            <div
                              v-for="change in obtenerCambiosAuditoria(entry)"
                              :key="`${entry.id}-${change.key}`"
                              class="rounded-2xl border border-default/80 bg-default/85 p-3"
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

                      <div v-else class="mt-4 rounded-2xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted">
                        No hay cambios auditados para esta cuenta todavía.
                      </div>

                      <div v-if="obtenerTotalAuditoria(usuario.user_id) > AUDITORIA_POR_PAGINA" class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p class="text-xs text-muted">
                          Página {{ obtenerPaginaAuditoria(usuario.user_id) }} de {{ obtenerTotalPaginasAuditoria(usuario.user_id) }}
                        </p>

                        <UPagination
                          :page="obtenerPaginaAuditoria(usuario.user_id)"
                          :total="obtenerTotalAuditoria(usuario.user_id)"
                          :items-per-page="AUDITORIA_POR_PAGINA"
                          size="sm"
                          show-edges
                          active-color="primary"
                          active-variant="solid"
                          @update:page="(page) => cambiarPaginaAuditoria(usuario.user_id, page)"
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </UCollapsible>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4 border-t border-default/70 bg-default/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">
            Página {{ paginaActual }} de {{ totalPaginas }}
          </p>

          <UPagination
            v-model:page="paginaActual"
            :total="totalUsuariosFiltrados"
            :items-per-page="cantidadPorPagina"
            show-edges
            active-color="primary"
            active-variant="solid"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
