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

const claseRol: Record<string, string> = {
  cliente: 'bg-gray-100 text-gray-700',
  abogado: 'bg-blue-100 text-blue-800',
  admin: 'bg-green-100 text-green-800'
}

onMounted(async () => {
  await cargarPerfil()
  await cargarUsuarios()
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Gestión de usuarios</h1>
      <button
        class="bg-green-600 text-white px-4 py-2 rounded text-sm"
        @click="mostrarFormulario = !mostrarFormulario"
      >
        {{ mostrarFormulario ? 'Cancelar' : 'Nuevo usuario' }}
      </button>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
      {{ successMsg }}
    </div>

    <div v-if="mostrarFormulario" class="border rounded p-4 mb-6 bg-gray-50">
      <h2 class="font-medium mb-3">Crear usuario</h2>
      <div class="grid gap-3">
        <input
          v-model="nuevoEmail"
          type="email"
          class="border rounded px-3 py-2 w-full"
          placeholder="Correo electrónico *"
        />
        <input
          v-model="nuevoNombre"
          class="border rounded px-3 py-2 w-full"
          placeholder="Nombre completo"
        />
        <input
          v-model="nuevaPassword"
          type="password"
          class="border rounded px-3 py-2 w-full"
          placeholder="Contraseña *"
        />
        <textarea
          v-model="nuevaDireccionOficina"
          class="border rounded px-3 py-2 w-full"
          rows="3"
          placeholder="Dirección de oficina / notaría"
        />
        <p class="text-xs text-gray-400">Mínimo 8 caracteres, una mayúscula y un número.</p>
        <label class="flex items-center gap-2 text-sm">
          Rol:
          <select v-model="nuevoRol" class="border rounded px-2 py-1">
            <option value="abogado">Abogado</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          class="bg-green-600 text-white px-4 py-2 rounded w-fit text-sm"
          :disabled="loading"
          @click="crearAbogado"
        >
          Crear
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-gray-500 text-sm">Cargando...</p>

    <div v-else-if="usuarios.length === 0" class="text-center py-10 text-gray-400">
      <p>No hay usuarios registrados.</p>
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="u in usuarios"
        :key="u.user_id"
        class="border rounded p-4 flex justify-between items-center gap-3 flex-wrap"
      >
        <div>
          <p class="font-medium">{{ u.display_name ?? 'Sin nombre' }}</p>
          <p v-if="u.office_address" class="text-xs text-gray-500 mt-1">{{ u.office_address }}</p>
          <span class="text-xs px-2 py-0.5 rounded-full" :class="claseRol[u.role]">
            {{ etiquetaRol[u.role] }}
          </span>
        </div>

        <div v-if="profile?.role === 'admin'" class="flex gap-2 flex-wrap">
          <button
            v-for="r in (['cliente', 'abogado', 'admin'] as const)"
            :key="r"
            class="text-xs border px-2 py-1 rounded"
            :class="u.role === r ? 'bg-green-600 text-white border-green-600' : 'border-gray-300'"
            :disabled="loading || u.role === r"
            @click="cambiarRol(u, r)"
          >
            {{ etiquetaRol[r] }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
