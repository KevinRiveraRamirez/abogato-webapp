<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()

const displayName = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

onMounted(async () => {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) return

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

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) { errorMsg.value = 'Sesión no válida.'; return }

  loading.value = true

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.value.trim() || null })
    .eq('user_id', authUser.id)

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  successMsg.value = 'Nombre actualizado correctamente.'
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
