<!-- /pages/account/security.vue -->
<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

function validatePassword(pw: string) {

  if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  return ''
}

async function changePassword() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!user.value) {
    errorMsg.value = 'Debes iniciar sesión.'
    return
  }

  const pw = newPassword.value
  const pw2 = confirmPassword.value

  const validation = validatePassword(pw)
  if (validation) {
    errorMsg.value = validation
    return
  }

  if (pw !== pw2) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }

  loading.value = true

  const { error } = await supabase.auth.updateUser({ password: pw })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  newPassword.value = ''
  confirmPassword.value = ''
  successMsg.value = 'Contraseña actualizada correctamente.'
}
</script>

<template>
  <div style="max-width: 520px; margin: 24px auto; padding: 16px;">
    <h1>Seguridad</h1>

    <div v-if="!user">
      <p>Debes iniciar sesión.</p>
      <NuxtLink to="/login">Ir a login</NuxtLink>
    </div>

    <div v-else style="display:grid; gap: 10px;">
      <p style="font-size: 12px; opacity: 0.8;">
        Sesión: {{ user.email }}
      </p>

      <label>
        Nueva contraseña
        <input v-model="newPassword" type="password" placeholder="mínimo 8 caracteres" />
      </label>

      <label>
        Confirmar nueva contraseña
        <input v-model="confirmPassword" type="password" placeholder="repite la contraseña" />
      </label>

      <button @click="changePassword" :disabled="loading">
        {{ loading ? 'Actualizando...' : 'Cambiar contraseña' }}
      </button>

      <p v-if="errorMsg" style="color:#b00020;">{{ errorMsg }}</p>
      <p v-if="successMsg" style="color:#0a7a2f;">{{ successMsg }}</p>

      <NuxtLink to="/account/profile">Editar perfil</NuxtLink>
    </div>
  </div>
</template>