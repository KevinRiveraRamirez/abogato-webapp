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
  <div class="mx-auto max-w-3xl">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-highlighted">Mi perfil</h1>
      <p class="mt-1 text-sm text-muted">
        Actualizá tus datos personales y la información visible en la plataforma.
      </p>
    </div>

    <UCard>
      <div class="grid gap-5">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre">
            <UInput v-model="firstName" placeholder="Tu nombre" />
          </UFormField>

          <UFormField label="Apellido">
            <UInput v-model="lastName" placeholder="Tus apellidos" />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Correo de contacto"
            help="El correo se administra desde tu cuenta de acceso y no se puede editar aquí."
          >
            <UInput
              :model-value="authEmail"
              type="email"
              placeholder="correo@ejemplo.com"
              disabled
              readonly
            />
          </UFormField>

          <UFormField label="Teléfono de contacto">
            <UInput
              v-model="contactPhone"
              type="tel"
              placeholder="8888-8888"
            />
          </UFormField>
        </div>

        <UFormField label="Dirección personal">
          <UTextarea
            v-model="personalAddress"
            placeholder="Tu dirección exacta"
            :rows="3"
          />
        </UFormField>

        <UFormField
          v-if="profile?.role === 'abogado' || profile?.role === 'admin'"
          label="Dirección de oficina / notaría"
        >
          <UTextarea
            v-model="officeAddress"
            placeholder="Dirección exacta de la oficina"
            :rows="3"
          />
        </UFormField>

        <UAlert
          color="neutral"
          variant="soft"
          title="Dato importante"
          description="El correo mostrado proviene de Supabase Auth. Este formulario solo actualiza tus datos de perfil en la app."
        />

        <UAlert
          v-if="errorMsg"
          color="error"
          variant="soft"
          title="No se pudo guardar"
          :description="errorMsg"
        />

        <UAlert
          v-if="successMsg"
          color="success"
          variant="soft"
          title="Perfil actualizado"
          :description="successMsg"
        />

        <div class="flex flex-wrap items-center gap-3">
          <UButton :loading="loading" @click="guardarCambios">
            Guardar cambios
          </UButton>
          <UButton
            to="/account/security"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-arrow-right"
          >
            Cambiar contraseña
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
