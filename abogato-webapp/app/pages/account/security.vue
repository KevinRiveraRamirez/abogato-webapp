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
  <div class="mx-auto max-w-2xl">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-highlighted">Cambiar contraseña</h1>
      <p class="mt-1 text-sm text-muted">
        Mantené tu cuenta protegida con una contraseña segura y actualizada.
      </p>
    </div>

    <UCard>
      <div class="grid gap-4">
        <UFormField label="Contraseña actual">
          <UInput
            v-model="currentPassword"
            type="password"
            placeholder="Tu contraseña actual"
          />
        </UFormField>

        <UFormField label="Nueva contraseña">
          <UInput
            v-model="newPassword"
            type="password"
            placeholder="Mínimo 8 caracteres"
          />
        </UFormField>

        <UFormField label="Confirmar nueva contraseña">
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="Repetí la contraseña"
          />
        </UFormField>

        <UAlert
          color="neutral"
          variant="soft"
          title="Requisitos"
          description="La contraseña debe tener al menos 8 caracteres, una mayúscula y un número."
        />

        <UAlert
          v-if="errorMsg"
          color="error"
          variant="soft"
          title="No se pudo actualizar"
          :description="errorMsg"
        />

        <UAlert
          v-if="successMsg"
          color="success"
          variant="soft"
          title="Contraseña actualizada"
          :description="successMsg"
        />

        <div class="flex flex-wrap items-center gap-3">
          <UButton :loading="loading" @click="cambiarPassword">
            Cambiar contraseña
          </UButton>
          <UButton to="/account/profile" color="neutral" variant="ghost" leading-icon="i-lucide-arrow-left">
            Volver al perfil
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
