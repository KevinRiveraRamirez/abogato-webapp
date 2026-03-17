<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()

const firstName = ref('')
const lastName = ref('')
const contactPhone = ref('')
const personalAddress = ref('')
const officeAddress = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const authEmail = ref('')

onMounted(async () => {
  await cargarPerfil()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) return

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, first_name, last_name, contact_email, contact_phone, personal_address, office_address')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (error) {
    errorMsg.value = error.message
    return
  }

  const fallbackName = splitDisplayName(data?.display_name)

  firstName.value = data?.first_name ?? fallbackName.firstName
  lastName.value = data?.last_name ?? fallbackName.lastName
  authEmail.value = authUser.email ?? data?.contact_email ?? ''
  contactPhone.value = data?.contact_phone ?? authUser.phone ?? ''
  personalAddress.value = data?.personal_address ?? ''
  officeAddress.value = data?.office_address ?? ''
})

async function guardarCambios() {
  errorMsg.value = ''
  successMsg.value = ''

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) {
    errorMsg.value = 'Sesión no válida.'
    return
  }

  const cleanedFirstName = firstName.value.trim()
  const cleanedLastName = lastName.value.trim()
  const cleanedPhone = contactPhone.value.trim()
  const cleanedPersonalAddress = personalAddress.value.trim()
  const cleanedOfficeAddress = officeAddress.value.trim()
  const displayName = [cleanedFirstName, cleanedLastName].filter(Boolean).join(' ').trim()

  loading.value = true

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: cleanedFirstName || null,
      last_name: cleanedLastName || null,
      display_name: displayName || null,
      contact_phone: cleanedPhone || null,
      personal_address: cleanedPersonalAddress || null,
      office_address: cleanedOfficeAddress || null
    })
    .eq('user_id', authUser.id)

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  successMsg.value = 'Perfil actualizado correctamente.'
  await cargarPerfil()
}

function splitDisplayName(displayName?: string | null) {
  const normalized = displayName?.trim() ?? ''

  if (!normalized) {
    return { firstName: '', lastName: '' }
  }

  const parts = normalized.split(/\s+/)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ')
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-semibold mb-6">Mi perfil</h1>

    <div class="border rounded p-6 grid gap-5">
      <div class="grid sm:grid-cols-2 gap-4">
        <div class="grid gap-1">
          <label class="text-sm font-medium">Nombre</label>
          <input
            v-model="firstName"
            class="border rounded px-3 py-2 w-full"
            placeholder="Tu nombre"
          />
        </div>

        <div class="grid gap-1">
          <label class="text-sm font-medium">Apellido</label>
          <input
            v-model="lastName"
            class="border rounded px-3 py-2 w-full"
            placeholder="Tus apellidos"
          />
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="grid gap-1">
          <label class="text-sm font-medium">Correo de contacto</label>
          <input
            :value="authEmail"
            type="email"
            class="border rounded px-3 py-2 w-full bg-gray-50 text-gray-500"
            placeholder="correo@ejemplo.com"
            disabled
            readonly
          />
          <p class="text-xs text-gray-500">El correo se administra desde tu cuenta de acceso y no se puede editar aquí.</p>
        </div>

        <div class="grid gap-1">
          <label class="text-sm font-medium">Teléfono de contacto</label>
          <input
            v-model="contactPhone"
            type="tel"
            class="border rounded px-3 py-2 w-full"
            placeholder="8888-8888"
          />
        </div>
      </div>

      <div class="grid gap-1">
        <label class="text-sm font-medium">Dirección personal</label>
        <textarea
          v-model="personalAddress"
          class="border rounded px-3 py-2 w-full"
          placeholder="Tu dirección exacta"
          rows="3"
        />
      </div>

      <div v-if="profile?.role === 'abogado' || profile?.role === 'admin'" class="grid gap-1">
        <label class="text-sm font-medium">Dirección de oficina / notaría</label>
        <textarea
          v-model="officeAddress"
          class="border rounded px-3 py-2 w-full"
          placeholder="Dirección exacta de la oficina abierta"
          rows="3"
        />
      </div>

      <p class="text-xs text-gray-500">
        El correo mostrado proviene de Supabase Auth. Este formulario solo actualiza tus datos de perfil en la app.
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
