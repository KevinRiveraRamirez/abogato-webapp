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
  <AuthCardShell
    eyebrow="Seguridad"
    title="Restablecer contraseña"
    description="Ingresá tu nueva contraseña para volver a entrar a la plataforma."
    content-width="sm"
    back-to="/login"
    back-label="Volver al inicio de sesión"
  >
    <template #headerAside>
      <UColorModeButton />
    </template>

    <div v-if="!user" class="grid gap-3 text-sm text-muted">
      <p>El enlace de recuperación no es válido o expiró.</p>
      <NuxtLink to="/login" class="font-medium text-primary transition hover:underline">
        Volver al inicio de sesión
      </NuxtLink>
    </div>

    <template v-else>
      <UFormField label="Nueva contraseña">
        <UInput v-model="newPassword" type="password" placeholder="Mínimo 8 caracteres" size="lg" />
      </UFormField>

      <UFormField label="Confirmar contraseña">
        <UInput v-model="confirmPassword" type="password" placeholder="Repetí la contraseña" size="lg" />
      </UFormField>

      <p class="text-xs text-muted">
        Debe tener al menos 8 caracteres, una mayúscula y un número.
      </p>

      <UAlert v-if="errorMsg" color="warning" variant="soft" :description="errorMsg" />
      <UAlert v-if="successMsg" color="success" variant="soft" :description="successMsg" />

      <UButton block size="lg" :loading="loading" @click="cambiarPassword">
        Guardar nueva contraseña
      </UButton>
    </template>
  </AuthCardShell>
</template>
