<script setup lang="ts">
definePageMeta({ layout: 'login-layout' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

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

  const error = validarPassword(newPassword.value)
  if (error) { errorMsg.value = error; return }

  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }

  loading.value = true
  const { error: err } = await supabase.auth.updateUser({ password: newPassword.value })
  loading.value = false

  if (err) { errorMsg.value = err.message; return }

  newPassword.value = ''
  confirmPassword.value = ''
  successMsg.value = 'Contraseña actualizada. Ya podés iniciar sesión.'
}
</script>

<template>
  <UCard class="auth-card">
    <template #header>
      <h1 class="text-xl font-semibold">Restablecer contraseña</h1>
      <p class="text-sm text-gray-500 mt-1">Ingresá tu nueva contraseña.</p>
    </template>

    <div class="grid gap-4">
      <div v-if="!user" class="text-sm text-gray-500">
        <p>El enlace de recuperación no es válido o expiró.</p>
        <NuxtLink to="/login" class="underline">Volver al inicio de sesión</NuxtLink>
      </div>

      <template v-else>
        <UFormGroup label="Nueva contraseña">
          <UInput v-model="newPassword" type="password" placeholder="Mínimo 8 caracteres" size="lg" />
        </UFormGroup>

        <UFormGroup label="Confirmar contraseña">
          <UInput v-model="confirmPassword" type="password" placeholder="Repetí la contraseña" size="lg" />
        </UFormGroup>

        <p class="text-xs text-gray-400">
          Debe tener al menos 8 caracteres, una mayúscula y un número.
        </p>

        <UAlert v-if="errorMsg" color="warning" variant="soft" :description="errorMsg" />
        <UAlert v-if="successMsg" color="success" variant="soft" :description="successMsg" />

        <UButton block size="lg" :loading="loading" @click="cambiarPassword">
          Guardar nueva contraseña
        </UButton>

        <NuxtLink to="/login" class="text-sm text-gray-500 hover:underline text-center">
          Volver al inicio de sesión
        </NuxtLink>
      </template>
    </div>
  </UCard>
</template>

<style scoped>
.auth-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.dark .auth-card {
  background: rgba(17, 17, 17, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
