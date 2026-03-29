<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { adminFetch } = useAdminApi()

type UserRole = 'cliente' | 'abogado' | 'admin'

type Usuario = {
  user_id: string
  created_at: string
  display_name: string | null
  contact_email: string | null
  contact_phone: string | null
  personal_address: string | null
  role: UserRole
  office_address: string | null
  is_active: boolean
  deactivated_at: string | null
}

const usuarios = ref<Usuario[]>([])
const loading = ref(false)
const savingUserId = ref<string | null>(null)
const filaExpandida = ref<string | null>(null)
const errorMsg = ref('')
const successMsg = ref('')
const busqueda = ref('')
const filtroRol = ref<'todos' | UserRole>('todos')
const filtroEstado = ref<'todos' | 'activos' | 'inactivos'>('todos')
const paginaActual = ref(1)
const cantidadPorPagina = ref(10)

const mostrarFormulario = ref(false)
const nuevoEmail = ref('')
const nuevoNombre = ref('')
const nuevoRol = ref<UserRole>('abogado')
const nuevaPassword = ref('')
const nuevaDireccionOficina = ref('')
const creatingUser = ref(false)

const etiquetaRol: Record<UserRole, string> = {
  cliente: 'Cliente',
  abogado: 'Abogado',
  admin: 'Admin',
}

const colorRol: Record<UserRole, 'neutral' | 'info' | 'success'> = {
  cliente: 'neutral',
  abogado: 'info',
  admin: 'success',
}

const descripcionAcceso: Record<UserRole, string> = {
  cliente: 'Portal cliente',
  abogado: 'Operación legal',
  admin: 'Administración total',
}

const opcionesRol = [
  { label: 'Cliente', value: 'cliente' },
  { label: 'Abogado', value: 'abogado' },
  { label: 'Admin', value: 'admin' },
] as const

const rolesFiltro = ['todos', 'cliente', 'abogado', 'admin'] as const
const estadosFiltro = ['todos', 'activos', 'inactivos'] as const
const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

const usuariosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return usuarios.value.filter((usuario) => {
    const coincideRol = filtroRol.value === 'todos' || usuario.role === filtroRol.value
    const coincideEstado = filtroEstado.value === 'todos'
      || (filtroEstado.value === 'activos' && usuario.is_active)
      || (filtroEstado.value === 'inactivos' && !usuario.is_active)

    if (!coincideRol || !coincideEstado) return false
    if (!termino) return true

    return [
      usuario.display_name ?? '',
      usuario.contact_email ?? '',
      usuario.contact_phone ?? '',
      etiquetaRol[usuario.role],
      descripcionAcceso[usuario.role],
      usuario.office_address ?? '',
      usuario.personal_address ?? '',
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
  internos: usuarios.value.filter(usuario => usuario.role === 'admin' || usuario.role === 'abogado').length,
}))

const mostrarDireccionOficina = computed(
  () => nuevoRol.value === 'abogado' || nuevoRol.value === 'admin'
)

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

function actualizarFilaExpandida(userId: string, open: boolean) {
  filaExpandida.value = open ? userId : filaExpandida.value === userId ? null : filaExpandida.value
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

async function cargarUsuarios() {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, created_at, display_name, contact_email, contact_phone, personal_address, role, office_address, is_active, deactivated_at')
    .order('is_active', { ascending: false })
    .order('role')
    .order('display_name')

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  usuarios.value = (data ?? []) as Usuario[]
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
      },
    })

    successMsg.value = `Cuenta creada para ${nuevoEmail.value.trim()}.`
    nuevoEmail.value = ''
    nuevoNombre.value = ''
    nuevoRol.value = 'abogado'
    nuevaPassword.value = ''
    nuevaDireccionOficina.value = ''
    mostrarFormulario.value = false
    await cargarUsuarios()
  } catch (error) {
    errorMsg.value = obtenerMensajeError(error)
  } finally {
    creatingUser.value = false
  }
}

async function actualizarUsuario(usuario: Usuario, payload: { role?: UserRole, isActive?: boolean }) {
  savingUserId.value = usuario.user_id
  errorMsg.value = ''
  successMsg.value = ''

  try {
    await adminFetch(`/api/admin/users/${usuario.user_id}`, {
      method: 'PATCH',
      body: payload,
    })

    successMsg.value = payload.isActive === false
      ? 'Usuario desactivado correctamente.'
      : payload.isActive === true
        ? 'Usuario reactivado correctamente.'
        : 'Rol actualizado correctamente.'

    await cargarUsuarios()
  } catch (error) {
    errorMsg.value = obtenerMensajeError(error)
  } finally {
    savingUserId.value = null
  }
}

async function cambiarRol(usuario: Usuario, role: UserRole) {
  if (usuario.role === role) return
  await actualizarUsuario(usuario, { role })
}

async function toggleActivo(usuario: Usuario) {
  const accion = usuario.is_active ? 'desactivar' : 'reactivar'
  const confirmar = window.confirm(`¿Querés ${accion} a ${usuario.contact_email || 'este usuario'}?`)

  if (!confirmar) return

  await actualizarUsuario(usuario, { isActive: !usuario.is_active })
}

watch([busqueda, filtroRol, filtroEstado, cantidadPorPagina], () => {
  paginaActual.value = 1
  filaExpandida.value = null
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
  cargarUsuarios()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">
          Admin
        </p>
        <h1 class="mt-2 text-3xl font-semibold text-highlighted">
          Gestión de usuarios
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Cambiá roles, filtrá la base de usuarios y desactivá cuentas cuando necesites cortar su acceso. Las cuentas inactivas no podrán iniciar sesión ni usar rutas protegidas hasta ser reactivadas.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="outline" :loading="loading" @click="cargarUsuarios">
          Actualizar
        </UButton>
        <UButton @click="mostrarFormulario = !mostrarFormulario">
          {{ mostrarFormulario ? 'Cancelar' : 'Nuevo usuario' }}
        </UButton>
      </div>
    </div>

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
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div class="grid gap-3 sm:max-w-md">
            <div class="flex flex-wrap items-center gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">Base de usuarios</h2>
                <p class="mt-1 text-sm text-muted">
                  Vista compacta para revisar permisos, estado y contexto operativo sin salir del listado.
                </p>
              </div>

              <UBadge color="neutral" variant="subtle">
                {{ usuariosFiltrados.length }} visibles
              </UBadge>
            </div>

            <UInput
              v-model="busqueda"
              icon="i-lucide-search"
              placeholder="Buscar por nombre, correo, teléfono o dirección"
            />
          </div>

          <div class="grid gap-3">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="rol in rolesFiltro"
                :key="rol"
                size="sm"
                :color="filtroRol === rol ? 'primary' : 'neutral'"
                :variant="filtroRol === rol ? 'solid' : 'outline'"
                @click="filtroRol = rol"
              >
                {{ rol === 'todos' ? 'Todos los roles' : etiquetaRol[rol] }}
              </UButton>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="estado in estadosFiltro"
                :key="estado"
                size="sm"
                :color="filtroEstado === estado ? 'primary' : 'neutral'"
                :variant="filtroEstado === estado ? 'solid' : 'outline'"
                @click="filtroEstado = estado"
              >
                {{
                  estado === 'todos'
                    ? 'Todos los estados'
                    : estado === 'activos'
                      ? 'Activos'
                      : 'Inactivos'
                }}
              </UButton>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <p class="text-sm text-muted">
                Mostrando {{ resumenPaginacion.inicio }}-{{ resumenPaginacion.fin }} de {{ totalUsuariosFiltrados }}
              </p>

              <USelect
                v-model="cantidadPorPagina"
                class="min-w-40"
                value-key="value"
                :items="opcionesCantidadPorPagina"
              />
            </div>
          </div>
        </div>
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
                        {{ etiquetaRol[usuario.role] }}
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
                            {{ etiquetaRol[usuario.role] }}
                          </p>
                          <p class="mt-2 text-sm text-muted">
                            {{ descripcionAcceso[usuario.role] }}
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
                            :disabled="savingUserId === usuario.user_id || esMismoUsuario(usuario)"
                            :items="opcionesRol"
                            @update:model-value="(value) => cambiarRol(usuario, value as UserRole)"
                          />
                        </UFormField>

                        <UButton
                          :color="usuario.is_active ? 'error' : 'success'"
                          :variant="usuario.is_active ? 'soft' : 'solid'"
                          :loading="savingUserId === usuario.user_id"
                          :disabled="savingUserId === usuario.user_id || esMismoUsuario(usuario)"
                          class="justify-center"
                          @click="toggleActivo(usuario)"
                        >
                          {{ usuario.is_active ? 'Desactivar acceso' : 'Reactivar acceso' }}
                        </UButton>

                        <p class="text-xs text-muted">
                          {{ esMismoUsuario(usuario) ? 'Tu cuenta no se puede editar desde este panel.' : 'Los cambios se guardan inmediatamente.' }}
                        </p>
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
