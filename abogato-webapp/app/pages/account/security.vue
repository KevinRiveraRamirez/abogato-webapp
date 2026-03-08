<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

function validarPassword(pw: string): string {
  if (pw.length < 8) return 'Mínimo 8 caracteres.'
  if (!/[A-Z]/.test(pw)) return 'Debe incluir al menos una mayúscula.'
  if (!/[0-9]/.test(pw)) return 'Debe incluir al menos un número.'
  return ''
}

async function cambiarPassword() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!user.value) return

  if (!currentPassword.value) {
    errorMsg.value = 'Ingresá tu contraseña actual.'
    return
  }

  const pwError = validarPassword(newPassword.value)
  if (pwError) { errorMsg.value = pwError; return }

  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }

  loading.value = true

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.value.email!,
    password: currentPassword.value
  })

  if (authError) {
    errorMsg.value = 'La contraseña actual es incorrecta.'
    loading.value = false
    return
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword.value })

  loading.value = false

  if (error) { errorMsg.value = error.message; return }

  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  successMsg.value = 'Contraseña actualizada correctamente.'
}
</script>

<template>
  <div class="max-w-lg mx-auto py-8 px-4">
    <h1 class="text-2xl font-semibold mb-6">Cambiar contraseña</h1>

    <div class="border rounded p-6 grid gap-4">
      <div class="grid gap-1">
        <label class="text-sm font-medium">Contraseña actual</label>
        <input
          v-model="currentPassword"
          type="password"
          class="border rounded px-3 py-2 w-full"
          placeholder="Tu contraseña actual"
        />
      </div>

      <div class="grid gap-1">
        <label class="text-sm font-medium">Nueva contraseña</label>
        <input
          v-model="newPassword"
          type="password"
          class="border rounded px-3 py-2 w-full"
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div class="grid gap-1">
        <label class="text-sm font-medium">Confirmar nueva contraseña</label>
        <input
          v-model="confirmPassword"
          type="password"
          class="border rounded px-3 py-2 w-full"
          placeholder="Repetí la contraseña"
        />
      </div>

      <p class="text-xs text-gray-400">
        La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.
      </p>

      <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded text-sm">
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="bg-green-50 text-green-700 p-3 rounded text-sm">
        {{ successMsg }}
      </div>

      <button
        class="bg-green-600 text-white px-4 py-2 rounded text-sm w-fit"
        :disabled="loading"
        @click="cambiarPassword"
      >
        {{ loading ? 'Actualizando...' : 'Cambiar contraseña' }}
      </button>

      <NuxtLink to="/account/profile" class="text-sm text-gray-500 hover:underline">
        ← Volver al perfil
      </NuxtLink>
    </div>
  </div>
</template>
