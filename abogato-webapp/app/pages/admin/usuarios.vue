<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { adminFetch } = useAdminApi()

type UserRole = 'cliente' | 'abogado' | 'admin'

type Usuario = {
  user_id: string
  display_name: string | null
  contact_email: string | null
  role: UserRole
  office_address: string | null
  is_active: boolean
  deactivated_at: string | null
}

const usuarios = ref<Usuario[]>([])
const loading = ref(false)
const savingUserId = ref<string | null>(null)
const errorMsg = ref('')
const successMsg = ref('')
const busqueda = ref('')
const filtroRol = ref<'todos' | UserRole>('todos')
const filtroEstado = ref<'todos' | 'activos' | 'inactivos'>('todos')

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
      etiquetaRol[usuario.role],
      usuario.office_address ?? '',
    ].some(value => value.toLowerCase().includes(termino))
  })
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

function formatearFecha(fecha: string | null) {
  if (!fecha) return 'Activo'

  return new Date(fecha).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
    .select('user_id, display_name, contact_email, role, office_address, is_active, deactivated_at')
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
              :items="[
                { label: 'Cliente', value: 'cliente' },
                { label: 'Abogado', value: 'abogado' },
                { label: 'Admin', value: 'admin' }
              ]"
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
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="grid gap-3 sm:max-w-md">
            <h2 class="font-semibold text-highlighted">Base de usuarios</h2>
            <UInput
              v-model="busqueda"
              icon="i-lucide-search"
              placeholder="Buscar por nombre, correo o dirección"
            />
          </div>

          <div class="grid gap-3">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="rol in (['todos', 'cliente', 'abogado', 'admin'] as const)"
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
                v-for="estado in (['todos', 'activos', 'inactivos'] as const)"
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
          </div>
        </div>
      </template>

      <div v-if="loading" class="py-10 text-center text-sm text-muted">
        Cargando usuarios...
      </div>

      <div v-else-if="!usuariosFiltrados.length" class="py-10 text-center">
        <p class="font-medium text-highlighted">No hay usuarios para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Ajustá la búsqueda o cambiá el estado seleccionado.</p>
      </div>

      <div v-else class="grid gap-4">
        <UCard
          v-for="usuario in usuariosFiltrados"
          :key="usuario.user_id"
          :class="usuario.is_active ? '' : 'border-error/30 bg-error/5'"
        >
          <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="colorRol[usuario.role]" variant="subtle">
                  {{ etiquetaRol[usuario.role] }}
                </UBadge>
                <UBadge :color="usuario.is_active ? 'success' : 'error'" variant="soft">
                  {{ usuario.is_active ? 'Activo' : 'Inactivo' }}
                </UBadge>
                <UBadge v-if="esMismoUsuario(usuario)" color="neutral" variant="outline">
                  Tu cuenta
                </UBadge>
              </div>

              <h3 class="mt-4 text-lg font-semibold text-highlighted">
                {{ usuario.display_name || 'Sin nombre visible' }}
              </h3>

              <p class="mt-1 text-sm text-muted">
                {{ usuario.contact_email || 'Sin correo sincronizado' }}
              </p>

              <div class="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2 xl:grid-cols-3">
                <p><span class="font-medium text-highlighted">ID:</span> {{ String(usuario.user_id).slice(0, 8) }}</p>
                <p><span class="font-medium text-highlighted">Estado:</span> {{ usuario.is_active ? 'Habilitado' : `Desactivado el ${formatearFecha(usuario.deactivated_at)}` }}</p>
                <p v-if="usuario.office_address"><span class="font-medium text-highlighted">Oficina:</span> {{ usuario.office_address }}</p>
              </div>
            </div>

            <div class="grid gap-3 xl:min-w-72">
              <UFormField label="Rol">
                <USelect
                  :model-value="usuario.role"
                  value-key="value"
                  :disabled="savingUserId === usuario.user_id || esMismoUsuario(usuario)"
                  :items="[
                    { label: 'Cliente', value: 'cliente' },
                    { label: 'Abogado', value: 'abogado' },
                    { label: 'Admin', value: 'admin' }
                  ]"
                  @update:model-value="(value) => cambiarRol(usuario, value as UserRole)"
                />
              </UFormField>

              <div class="flex flex-wrap gap-2">
                <UButton
                  :color="usuario.is_active ? 'error' : 'success'"
                  :variant="usuario.is_active ? 'soft' : 'solid'"
                  :loading="savingUserId === usuario.user_id"
                  :disabled="savingUserId === usuario.user_id || esMismoUsuario(usuario)"
                  @click="toggleActivo(usuario)"
                >
                  {{ usuario.is_active ? 'Desactivar' : 'Reactivar' }}
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>
