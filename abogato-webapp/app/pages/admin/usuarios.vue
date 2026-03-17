<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'lawyer'] })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()

type Usuario = {
  user_id: string
  display_name: string | null
  role: 'cliente' | 'abogado' | 'admin'
  office_address: string | null
}

const usuarios = ref<Usuario[]>([])
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const mostrarFormulario = ref(false)
const nuevoEmail = ref('')
const nuevoNombre = ref('')
const nuevoRol = ref<'abogado' | 'admin'>('abogado')
const nuevaPassword = ref('')
const nuevaDireccionOficina = ref('')

async function cargarUsuarios() {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, role, office_address')
    .order('role')

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  usuarios.value = (data ?? []) as Usuario[]
}

async function cambiarRol(u: Usuario, nuevoRolValor: Usuario['role']) {
  if (u.role === nuevoRolValor) return

  loading.value = true
  const { error } = await supabase
    .from('profiles')
    .update({ role: nuevoRolValor })
    .eq('user_id', u.user_id)

  loading.value = false
  if (error) { errorMsg.value = error.message; return }

  await cargarUsuarios()
}

async function crearAbogado() {
  errorMsg.value = ''
  successMsg.value = ''

  const email = nuevoEmail.value.trim()
  const nombre = nuevoNombre.value.trim()
  const officeAddress = nuevaDireccionOficina.value.trim()

  if (!email) { errorMsg.value = 'El correo es obligatorio.'; return }
  if (!nuevaPassword.value) { errorMsg.value = 'La contraseña es obligatoria.'; return }
  if (nuevaPassword.value.length < 8) { errorMsg.value = 'La contraseña debe tener al menos 8 caracteres.'; return }
  if (!/[A-Z]/.test(nuevaPassword.value)) { errorMsg.value = 'La contraseña debe incluir al menos una mayúscula.'; return }
  if (!/[0-9]/.test(nuevaPassword.value)) { errorMsg.value = 'La contraseña debe incluir al menos un número.'; return }

  loading.value = true

  const { data, error } = await supabase.auth.signUp({
    email,
    password: nuevaPassword.value,
    options: { data: { display_name: nombre } }
  })

  if (error || !data.user) {
    loading.value = false
    errorMsg.value = error?.message ?? 'No se pudo crear la cuenta.'
    return
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: data.user.id,
      role: nuevoRol.value,
      display_name: nombre || null,
      contact_email: email || null,
      office_address: officeAddress || null
    })

  loading.value = false

  if (profileError) { errorMsg.value = profileError.message; return }

  successMsg.value = `Cuenta creada para ${email}. Se enviará un correo de confirmación.`
  nuevoEmail.value = ''
  nuevoNombre.value = ''
  nuevaPassword.value = ''
  nuevoRol.value = 'abogado'
  nuevaDireccionOficina.value = ''
  mostrarFormulario.value = false

  await cargarUsuarios()
}

const etiquetaRol: Record<string, string> = {
  cliente: 'Cliente',
  abogado: 'Abogado',
  admin: 'Admin'
}

const colorRol: Record<string, 'neutral' | 'info' | 'success'> = {
  cliente: 'neutral',
  abogado: 'info',
  admin: 'success'
}

onMounted(async () => {
  await cargarPerfil()
  await cargarUsuarios()
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Gestión de usuarios</h1>
        <p class="mt-1 text-sm text-muted">
          Administrá cuentas internas y actualizá roles desde una sola vista.
        </p>
      </div>
      <UButton @click="mostrarFormulario = !mostrarFormulario">
        {{ mostrarFormulario ? 'Cancelar' : 'Nuevo usuario' }}
      </UButton>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
      class="mb-4"
    />
    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Operación exitosa"
      :description="successMsg"
      class="mb-4"
    />

    <UCard v-if="mostrarFormulario" class="mb-6">
      <template #header>
        <div>
          <h2 class="font-semibold text-highlighted">Crear usuario</h2>
          <p class="mt-1 text-sm text-muted">Configurá acceso y rol para un abogado o administrador.</p>
        </div>
      </template>

      <div class="grid gap-4">
        <UFormField label="Correo electrónico" required>
          <UInput
            v-model="nuevoEmail"
            type="email"
            placeholder="correo@ejemplo.com"
          />
        </UFormField>

        <UFormField label="Nombre completo">
          <UInput
            v-model="nuevoNombre"
            placeholder="Nombre completo"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
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
                { label: 'Abogado', value: 'abogado' },
                { label: 'Admin', value: 'admin' }
              ]"
            />
          </UFormField>
        </div>

        <UFormField label="Dirección de oficina / notaría">
          <UTextarea
            v-model="nuevaDireccionOficina"
            :rows="3"
            placeholder="Dirección de oficina / notaría"
          />
        </UFormField>

        <div class="flex gap-3">
          <UButton :loading="loading" @click="crearAbogado">
            Crear usuario
          </UButton>
          <UButton color="neutral" variant="ghost" @click="mostrarFormulario = false">
            Cancelar
          </UButton>
        </div>
      </div>
    </UCard>

    <p v-if="loading" class="text-gray-500 text-sm">Cargando...</p>

    <UCard v-else-if="usuarios.length === 0">
      <p class="text-sm text-muted">No hay usuarios registrados.</p>
    </UCard>

    <div v-else class="grid gap-3">
      <UCard
        v-for="u in usuarios"
        :key="u.user_id"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium text-highlighted">{{ u.display_name ?? 'Sin nombre' }}</p>
              <UBadge :color="colorRol[u.role]" variant="subtle">
                {{ etiquetaRol[u.role] }}
              </UBadge>
            </div>
            <p v-if="u.office_address" class="text-sm text-muted">{{ u.office_address }}</p>
          </div>

          <div v-if="profile?.role === 'admin'" class="flex flex-wrap gap-2">
            <UButton
              v-for="r in (['cliente', 'abogado', 'admin'] as const)"
              :key="r"
              size="sm"
              :color="u.role === r ? colorRol[r] : 'neutral'"
              :variant="u.role === r ? 'solid' : 'outline'"
              :disabled="loading || u.role === r"
              @click="cambiarRol(u, r)"
            >
              {{ etiquetaRol[r] }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
