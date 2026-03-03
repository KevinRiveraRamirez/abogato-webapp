<!-- /pages/account/profile.vue -->
<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const newEmail = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

function validateEmail(email: string) {
  const v = email.trim()
  if (!v) return 'El correo no puede estar vacío.'
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(v)) return 'Formato de correo inválido.'
  return ''
}

watch(
  user,
  () => {
    newEmail.value = user.value?.email ?? ''
  },
  { immediate: true }
)

async function changeEmail() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!user.value) {
    errorMsg.value = 'Debes iniciar sesión.'
    return
  }

  const email = newEmail.value.trim()
  const validation = validateEmail(email)
  if (validation) {
    errorMsg.value = validation
    return
  }

  if (email === (user.value.email ?? '')) {
    errorMsg.value = 'Ese correo ya es tu correo actual.'
    return
  }

  loading.value = true

  const { error } = await supabase.auth.updateUser({ email })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

 
  successMsg.value =
    'Solicitud enviada. Revisa tu correo para confirmar el cambio (si tu proyecto requiere confirmación).'
}
</script>

<template>
  <div style="max-width: 520px; margin: 24px auto; padding: 16px;">
    <h1>Perfil</h1>

    <div v-if="!user">
      <p>Debes iniciar sesión.</p>
      <NuxtLink to="/login">Ir a login</NuxtLink>
    </div>

    <div v-else style="display:grid; gap: 10px;">
      <p style="font-size: 12px; opacity: 0.8;">
        Correo actual: {{ user.email }}
      </p>

      <label>
        Nuevo correo
        <input v-model="newEmail" placeholder="nuevo@correo.com" />
      </label>

      <button @click="changeEmail" :disabled="loading">
        {{ loading ? 'Actualizando...' : 'Actualizar correo' }}
      </button>

      <p v-if="errorMsg" style="color:#b00020;">{{ errorMsg }}</p>
      <p v-if="successMsg" style="color:#0a7a2f;">{{ successMsg }}</p>

      <NuxtLink to="/account/security">Cambiar contraseña</NuxtLink>
    </div>
  </div>
</template>