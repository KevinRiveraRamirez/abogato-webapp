<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()

const displayName = ref('')
const newEmail = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

function validarEmail(email: string): string {
  const v = email.trim()
  if (!v) return 'El correo no puede estar vacío.'
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(v)) return 'Formato de correo inválido.'
  return ''
}

onMounted(async () => {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) return

  newEmail.value = authUser.email ?? ''

  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', authUser.id)
    .maybeSingle()

  displayName.value = data?.display_name ?? ''
})

async function guardarCambios() {
  errorMsg.value = ''
  successMsg.value = ''

  const emailError = validarEmail(newEmail.value)
  if (emailError) { errorMsg.value = emailError; return }

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) { errorMsg.value = 'Sesión no válida.'; return }

  loading.value = true

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name: displayName.value.trim() || null })
    .eq('user_id', authUser.id)

  if (profileError) {
    errorMsg.value = profileError.message
    loading.value = false
    return
  }

  if (newEmail.value.trim() !== authUser.email) {
    const { error: emailError } = await supabase.auth.updateUser({
      email: newEmail.value.trim()
    })

    if (emailError) {
      errorMsg.value = emailError.message
      loading.value = false
      return
    }
  }

  loading.value = false
  successMsg.value = 'Datos actualizados correctamente.'
}
</script>

<template>
  <div class="max-w-lg mx-auto py-8 px-4">
    <h1 class="text-2xl font-semibold mb-6">Mi perfil</h1>

    <div class="border rounded p-6 grid gap-4">
      <div class="grid gap-1">
        <label class="text-sm font-medium">Nombre</label>
        <input
          v-model="displayName"
          class="border rounded px-3 py-2 w-full"
          placeholder="Tu nombre"
        />
      </div>

      <div class="grid gap-1">
        <label class="text-sm font-medium">Correo electrónico</label>
        <input
          v-model="newEmail"
          type="email"
          class="border rounded px-3 py-2 w-full"
          placeholder="correo@ejemplo.com"
        />
        <p class="text-xs text-gray-400">
          Si cambiás el correo, recibirás una confirmación en el nuevo correo.
        </p>
      </div>

      <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded text-sm">
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="bg-green-50 text-green-700 p-3 rounded text-sm">
        {{ successMsg }}
      </div>

      <button
        class="bg-green-600 text-white px-4 py-2 rounded text-sm w-fit"
        :disabled="loading"
        @click="guardarCambios"
      >
        {{ loading ? 'Guardando...' : 'Guardar cambios' }}
      </button>

      <NuxtLink to="/account/security" class="text-sm text-gray-500 hover:underline">
        Cambiar contraseña →
      </NuxtLink>
    </div>
  </div>
</template>
