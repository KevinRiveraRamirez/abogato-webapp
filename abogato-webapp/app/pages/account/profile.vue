<script setup lang="ts">
import {
  hasProfessionalContext,
  isLawyerRole,
  lawyerAvailabilityDescriptions,
  lawyerAvailabilityLabels,
  roleLabels,
  type LawyerAvailabilityStatus,
} from '~~/shared/roles'

definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()

const firstName = ref('')
const lastName = ref('')
const contactEmail = ref('')
const contactPhone = ref('')
const personalAddress = ref('')
const officeAddress = ref('')
const professionalLicenseNumber = ref('')
const professionalLicenseExpiresAt = ref<string | null>(null)
const availabilityStatus = ref<LawyerAvailabilityStatus>('available')
const authEmail = ref('')
const pageLoading = ref(true)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const showOfficeAddressField = computed(
  () => hasProfessionalContext(profile.value?.role)
)

const showAvailabilityField = computed(
  () => isLawyerRole(profile.value?.role)
)

const roleLabel = computed(() => {
  return roleLabels[profile.value?.role ?? 'cliente']
})

const roleDescription = computed(() => {
  if (showOfficeAddressField.value) {
    return 'Tu ficha reúne la información profesional y de contacto que la plataforma puede necesitar para identificarte mejor.'
  }

  return 'Mantené tus datos personales y de contacto al día para que tus trámites y seguimientos arranquen con mejor contexto.'
})

const nameFieldsCompletedCount = computed(
  () => [firstName.value, lastName.value].filter(value => value.trim()).length
)

const visibleName = computed(
  () => [firstName.value.trim(), lastName.value.trim()].filter(Boolean).join(' ')
)

const profileName = computed(() => visibleName.value || 'Nombre pendiente')

const contactChannelsCount = computed(
  () => [contactEmail.value, contactPhone.value].filter(value => value.trim()).length
)

const addressFieldsTotal = computed(() => (showOfficeAddressField.value ? 2 : 1))

const registeredAddressesCount = computed(() => {
  const addresses = [personalAddress.value.trim()]

  if (showOfficeAddressField.value) {
    addresses.push(officeAddress.value.trim())
  }

  return addresses.filter(Boolean).length
})

const completionChecks = computed(() => {
  const checks = [
    Boolean(firstName.value.trim()),
    Boolean(lastName.value.trim()),
    Boolean(contactEmail.value.trim()),
    Boolean(contactPhone.value.trim()),
    Boolean(personalAddress.value.trim())
  ]

  if (showOfficeAddressField.value) {
    checks.push(Boolean(officeAddress.value.trim()))
  }

  return checks
})

const completionPercentage = computed(() => {
  const checks = completionChecks.value
  const completed = checks.filter(Boolean).length

  return Math.round((completed / checks.length) * 100)
})

const pendingFieldsCount = computed(
  () => completionChecks.value.filter(complete => !complete).length
)

const completionLabel = computed(() => {
  if (completionPercentage.value === 100) return 'Perfil completo'
  if (completionPercentage.value >= 70) return 'Buen progreso'
  return 'Faltan datos'
})

const completionHelper = computed(() => {
  if (pendingFieldsCount.value === 0) {
    return 'Todo lo importante ya está cargado y listo para usarse dentro de la app.'
  }

  if (pendingFieldsCount.value === 1) {
    return 'Solo falta un dato para dejar tu perfil mucho más sólido.'
  }

  return `Todavía faltan ${pendingFieldsCount.value} datos para completar mejor tu ficha.`
})

const profileInitials = computed(() => getInitials(visibleName.value || authEmail.value || roleLabel.value))

const quickStats = computed(() => [
  {
    label: 'Identidad visible',
    value: nameFieldsCompletedCount.value === 2 ? 'Lista' : `${nameFieldsCompletedCount.value}/2`,
    description: nameFieldsCompletedCount.value === 2
      ? 'Nombre y apellido completos para mostrar una ficha clara.'
      : 'Completá nombre y apellido para mejorar tu presentación.',
    icon: 'i-lucide-id-card'
  },
  {
    label: 'Canales de contacto',
    value: `${contactChannelsCount.value}/2`,
    description: contactChannelsCount.value === 2
      ? 'Correo y teléfono disponibles para contacto directo.'
      : 'Completá correo y teléfono para dejar ambos canales listos.',
    icon: 'i-lucide-phone-call'
  },
  {
    label: 'Direcciones registradas',
    value: `${registeredAddressesCount.value}/${addressFieldsTotal.value}`,
    description: registeredAddressesCount.value === addressFieldsTotal.value
      ? 'Las direcciones requeridas ya están cargadas.'
      : showOfficeAddressField.value
        ? 'Completá tus direcciones personal y profesional.'
        : 'Agregá tu dirección personal para cerrar la ficha.',
    icon: 'i-lucide-map-pinned'
  }
])

const profileHighlights = computed(() => [
  {
    label: 'Nombre visible',
    value: visibleName.value || 'Pendiente de completar',
    hint: visibleName.value
      ? 'Así se verá mejor tu identidad dentro de la plataforma.'
      : 'Completá nombre y apellido para dar más contexto.',
    icon: 'i-lucide-user-round'
  },
  {
    label: 'Rol en la plataforma',
    value: roleLabel.value,
    hint: showOfficeAddressField.value
      ? 'Cuenta con información profesional habilitada.'
      : 'Cuenta enfocada en trámites y seguimiento personal.',
    icon: 'i-lucide-briefcase-business'
  },
  {
    label: 'Correo de acceso',
    value: authEmail.value.trim() || 'Pendiente de sincronizar',
    hint: 'Este dato se administra desde tu cuenta de acceso.',
    icon: 'i-lucide-mail'
  },
  {
    label: 'Teléfono de contacto',
    value: contactPhone.value.trim() || 'Pendiente de agregar',
    hint: contactPhone.value.trim()
      ? 'Disponible para comunicación rápida.'
      : 'Agregalo para facilitar contacto y seguimiento.',
    icon: 'i-lucide-phone'
  },
  {
    label: 'Dirección personal',
    value: personalAddress.value.trim() || 'Pendiente de agregar',
    hint: personalAddress.value.trim()
      ? 'Lista dentro de tu información de perfil.'
      : 'Ayuda a tener una ficha más completa.',
    icon: 'i-lucide-house'
  },
  showOfficeAddressField.value
    ? {
        label: 'Oficina / notaría',
        value: officeAddress.value.trim() || 'Pendiente de agregar',
        hint: officeAddress.value.trim()
          ? 'Visible como parte de tu contexto profesional.'
          : 'Cargala para reforzar tu perfil profesional.',
        icon: 'i-lucide-building-2'
      }
    : {
        label: 'Estado del perfil',
        value: completionLabel.value,
        hint: `${completionPercentage.value}% completado`,
        icon: 'i-lucide-badge-check'
      }
])

const checklistItems = computed(() => {
  const items = [
    {
      label: 'Nombre completo',
      complete: nameFieldsCompletedCount.value === 2,
      description: nameFieldsCompletedCount.value === 2
        ? 'Tu identidad visible ya está clara dentro de la plataforma.'
        : 'Completá ambos campos para mostrar una ficha más confiable.'
    },
    {
      label: 'Correo de contacto',
      complete: Boolean(contactEmail.value.trim()),
      description: contactEmail.value.trim()
        ? 'Ya contás con un correo visible para seguimiento dentro de la plataforma.'
        : 'Agregalo para completar mejor tus canales de contacto.'
    },
    {
      label: 'Teléfono de contacto',
      complete: Boolean(contactPhone.value.trim()),
      description: contactPhone.value.trim()
        ? 'Ya contás con un número disponible para contacto directo.'
        : 'Agregá un número para que la comunicación sea más ágil.'
    },
    {
      label: 'Dirección personal',
      complete: Boolean(personalAddress.value.trim()),
      description: personalAddress.value.trim()
        ? 'Tu dirección personal ya forma parte de la ficha.'
        : 'Cargarla ayuda a completar mejor tu contexto.'
    }
  ]

  if (showOfficeAddressField.value) {
    items.push({
      label: 'Dirección de oficina / notaría',
      complete: Boolean(officeAddress.value.trim()),
      description: officeAddress.value.trim()
        ? 'La parte profesional de tu ficha ya está más robusta.'
        : 'Agregala para completar tu presentación profesional.'
    })
  }

  return items
})

const availabilityOptions = [
  { label: lawyerAvailabilityLabels.available, value: 'available' },
  { label: lawyerAvailabilityLabels.busy, value: 'busy' },
  { label: lawyerAvailabilityLabels.offline, value: 'offline' },
] as const

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function formatCostaRicaPhone(value: string) {
  const digits = normalizePhone(value)

  if (digits.length !== 8) {
    return value.trim()
  }

  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

function formatProfessionalLicenseExpiry(value: string | null) {
  if (!value) return 'Sin vigencia registrada'

  return new Date(value).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

onMounted(async () => {
  await cargarDatosPerfil(true)
})

async function cargarDatosPerfil(resetFeedback = false) {
  if (resetFeedback) {
    errorMsg.value = ''
    successMsg.value = ''
  }

  pageLoading.value = true
  await cargarPerfil()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.id) {
    pageLoading.value = false
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, first_name, last_name, contact_email, contact_phone, personal_address, office_address, professional_license_number, professional_license_expires_at, availability_status')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (error) {
    errorMsg.value = error.message
    pageLoading.value = false
    return
  }

  const fallbackName = splitDisplayName(data?.display_name)

  firstName.value = data?.first_name ?? fallbackName.firstName
  lastName.value = data?.last_name ?? fallbackName.lastName
  authEmail.value = authUser.email ?? ''
  contactEmail.value = data?.contact_email ?? authUser.email ?? ''
  contactPhone.value = data?.contact_phone ?? authUser.phone ?? ''
  personalAddress.value = data?.personal_address ?? ''
  officeAddress.value = data?.office_address ?? ''
  professionalLicenseNumber.value = data?.professional_license_number ?? ''
  professionalLicenseExpiresAt.value = data?.professional_license_expires_at ?? null
  availabilityStatus.value = data?.availability_status ?? 'available'
  pageLoading.value = false
}

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
  const cleanedContactEmail = contactEmail.value.trim().toLowerCase()
  const cleanedPhoneDigits = normalizePhone(contactPhone.value)
  const cleanedPersonalAddress = personalAddress.value.trim()
  const cleanedOfficeAddress = officeAddress.value.trim()
  const displayName = [cleanedFirstName, cleanedLastName].filter(Boolean).join(' ').trim()

  if (cleanedContactEmail && !isValidEmail(cleanedContactEmail)) {
    errorMsg.value = 'Ingresá un correo de contacto válido.'
    return
  }

  if (cleanedPhoneDigits && !/^\d{8}$/.test(cleanedPhoneDigits)) {
    errorMsg.value = 'El teléfono debe tener 8 dígitos.'
    return
  }

  const formattedPhone = cleanedPhoneDigits ? formatCostaRicaPhone(cleanedPhoneDigits) : ''

  loading.value = true

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: cleanedFirstName || null,
      last_name: cleanedLastName || null,
      display_name: displayName || null,
      contact_email: cleanedContactEmail || authEmail.value.trim() || null,
      contact_phone: formattedPhone || null,
      personal_address: cleanedPersonalAddress || null,
      office_address: cleanedOfficeAddress || null,
      availability_status: showAvailabilityField.value ? availabilityStatus.value : null
    })
    .eq('user_id', authUser.id)

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await cargarDatosPerfil()
  successMsg.value = 'Perfil actualizado correctamente.'
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

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'AP'
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8">
    <AppPageHeader
      eyebrow="Cuenta"
      title="Mi perfil"
      description="Visulisa tus datos personales dentro de Abogato"
    >
      <template #actions>
        <UButton
          to="/account/security"
          color="neutral"
          variant="ghost"
          leading-icon="i-lucide-shield-check"
        >
          Seguridad
        </UButton>
      </template>
    </AppPageHeader>

    <div class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <UCard class="relative overflow-hidden border-primary/10 bg-default/90 shadow-[0_30px_60px_-32px_rgba(15,23,42,0.18)] dark:bg-elevated/80 dark:shadow-[0_30px_60px_-32px_rgba(2,6,23,0.65)]">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgb(16_185_129_/_0.14),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgb(59_130_246_/_0.12),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,_rgb(16_185_129_/_0.18),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgb(59_130_246_/_0.18),_transparent_38%)]" />

          <div class="relative flex h-full flex-col gap-6">
            <div class="flex items-start gap-4">
              <div class="flex size-20 shrink-0 items-center justify-center rounded-[2rem] border border-default/80 bg-elevated/90 text-2xl font-semibold text-primary shadow-lg shadow-primary/10 backdrop-blur-sm dark:bg-default/90 dark:shadow-black/20">
                {{ profileInitials }}
              </div>

              <div class="min-w-0">
                <UBadge color="primary" variant="subtle">
                  {{ roleLabel }}
                </UBadge>
                <h2 class="mt-3 text-2xl font-semibold leading-tight text-highlighted">
                  {{ profileName }}
                </h2>
                <p class="mt-2 break-words text-sm text-muted">
                  {{ authEmail || 'Sin correo de acceso visible' }}
                </p>
              </div>
            </div>

            <p class="text-sm leading-6 text-toned">
              {{ roleDescription }}
            </p>

            <div class="rounded-[1.75rem] border border-default/70 bg-elevated/80 p-5 shadow-sm backdrop-blur-sm dark:bg-default/70">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                    Perfil completado
                  </p>
                  <p class="mt-2 text-3xl font-semibold text-highlighted">
                    {{ completionPercentage }}%
                  </p>
                </div>

                <div class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {{ completionLabel }}
                </div>
              </div>

              <div class="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-300"
                  :style="{ width: `${completionPercentage}%` }"
                />
              </div>

              <p class="mt-3 text-sm leading-6 text-muted">
                {{ completionHelper }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UButton
                to="/account/security"
                color="neutral"
                variant="outline"
                leading-icon="i-lucide-lock-keyhole"
              >
                Cambiar contraseña
              </UButton>

              <div class="inline-flex items-center gap-2 rounded-full border border-default/80 bg-elevated/80 px-3 py-2 text-xs text-muted shadow-sm backdrop-blur-sm dark:bg-default/80">
                <UIcon name="i-lucide-save" class="size-4 text-primary" />
                Los cambios se guardan abajo
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="border-primary/10 bg-default/90 shadow-[0_30px_60px_-32px_rgba(15,23,42,0.16)] dark:bg-elevated/80 dark:shadow-[0_30px_60px_-32px_rgba(2,6,23,0.55)]">
          <div class="space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
                  Ficha visible
                </p>
                <h2 class="mt-2 text-xl font-semibold text-highlighted">
                  Resumen del perfil
                </h2>
                <p class="mt-1 text-sm leading-6 text-muted">
                  Un resumen visual de los datos que hoy sí existen en tu cuenta.
                </p>
              </div>

              <UButton
                to="/account/security"
                color="neutral"
                variant="outline"
                trailing-icon="i-lucide-arrow-right"
              >
                Ir a seguridad
              </UButton>
            </div>

            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="item in profileHighlights"
                :key="item.label"
                class="rounded-[1.6rem] border border-default/80 bg-elevated/70 p-4 dark:bg-elevated/40"
              >
                <div class="flex items-start gap-3">
                  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UIcon :name="item.icon" class="size-5" />
                  </div>

                  <div class="min-w-0">
                    <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                      {{ item.label }}
                    </p>
                    <p class="mt-2 break-words text-base font-semibold leading-6 text-highlighted">
                      {{ item.value }}
                    </p>
                    <p class="mt-1 text-sm leading-6 text-muted">
                      {{ item.hint }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div
        v-for="stat in quickStats"
        :key="stat.label"
        class="rounded-[1.75rem] border border-default/80 bg-default/85 p-5 shadow-sm backdrop-blur-sm dark:bg-elevated/70"
      >
        <div class="flex items-start gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon :name="stat.icon" class="size-5" />
          </div>

          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">
              {{ stat.label }}
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ stat.value }}
            </p>
            <p class="mt-1 text-sm leading-6 text-muted">
              {{ stat.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <UCard class="border-primary/10 bg-default/90 shadow-[0_30px_60px_-32px_rgba(15,23,42,0.16)] dark:bg-elevated/80 dark:shadow-[0_30px_60px_-32px_rgba(2,6,23,0.55)]">
        <div class="space-y-6">
          <div>
            <p class="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
              Editar datos
            </p>
            <h2 class="mt-2 text-xl font-semibold text-highlighted">
              Información personal y de contacto
            </h2>
            <p class="mt-1 text-sm leading-6 text-muted">
              Conservamos el flujo de edición actual, pero con una jerarquía más clara.
            </p>
          </div>

          <UAlert
            v-if="pageLoading"
            color="neutral"
            variant="soft"
            title="Cargando perfil"
            description="Estamos trayendo la información actual para mostrarla aquí."
          />

          <UAlert
            color="neutral"
            variant="soft"
            title="Dato importante"
            description="Tu correo de acceso sigue siendo de solo lectura. Abajo podés ajustar el correo de contacto visible, el teléfono y el resto de tu ficha."
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

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="Nombre"
              help="Este valor se usa junto con el apellido para armar tu nombre visible."
            >
              <UInput v-model="firstName" placeholder="Tu nombre" />
            </UFormField>

            <UFormField
              label="Apellido"
              help="Ingresá tus apellidos para completar mejor la ficha."
            >
              <UInput v-model="lastName" placeholder="Tus apellidos" />
            </UFormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="Correo de acceso"
              help="Se administra desde tu cuenta de acceso y no se puede editar aquí."
            >
              <UInput
                :model-value="authEmail"
                type="email"
                placeholder="correo@ejemplo.com"
                disabled
                readonly
              />
            </UFormField>

            <UFormField
              label="Correo de contacto"
              help="Este correo visible se usa dentro de la plataforma para referencia y seguimiento."
            >
              <UInput
                v-model="contactEmail"
                type="email"
                placeholder="contacto@ejemplo.com"
              />
            </UFormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="Teléfono de contacto"
              help="Úsalo para dejar un canal rápido disponible dentro de la plataforma."
            >
              <UInput
                v-model="contactPhone"
                type="tel"
                placeholder="8888-8888"
              />
            </UFormField>

            <UFormField
              v-if="showAvailabilityField"
              label="Disponibilidad operativa"
              :help="lawyerAvailabilityDescriptions[availabilityStatus]"
            >
              <USelect
                v-model="availabilityStatus"
                value-key="value"
                :items="availabilityOptions"
              />
            </UFormField>
          </div>

          <USeparator />

          <div class="grid gap-4 lg:grid-cols-2">
            <UFormField
              label="Dirección personal"
              help="Podés ingresar una referencia clara o la dirección exacta."
            >
              <UTextarea
                v-model="personalAddress"
                placeholder="Tu dirección exacta"
                :rows="6"
              />
            </UFormField>

            <UFormField
              v-if="showOfficeAddressField"
              label="Dirección de oficina / notaría"
              help="Solo visible para cuentas con contexto profesional."
            >
              <UTextarea
                v-model="officeAddress"
                placeholder="Dirección exacta de la oficina"
                :rows="6"
              />
            </UFormField>

            <div
              v-else
              class="rounded-[1.6rem] border border-dashed border-default/80 bg-elevated/50 p-5 dark:bg-elevated/30"
            >
              <div class="flex items-start gap-3">
                <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-default text-muted">
                  <UIcon name="i-lucide-building-2" class="size-5" />
                </div>

                <div>
                  <p class="font-medium text-highlighted">
                    Dirección profesional no requerida
                  </p>
                  <p class="mt-1 text-sm leading-6 text-muted">
                    Tu cuenta actual no necesita dirección de oficina o notaría, así que
                    priorizamos únicamente tu dirección personal.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="showAvailabilityField || professionalLicenseNumber"
            class="grid gap-4 lg:grid-cols-2"
          >
            <div
              v-if="professionalLicenseNumber"
              class="rounded-[1.6rem] border border-default/80 bg-elevated/40 p-5"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Cédula profesional
              </p>
              <p class="mt-3 text-lg font-semibold text-highlighted">
                {{ professionalLicenseNumber }}
              </p>
              <p class="mt-2 text-sm text-muted">
                Vigente hasta {{ formatProfessionalLicenseExpiry(professionalLicenseExpiresAt) }}.
              </p>
            </div>

            <div
              v-if="showAvailabilityField"
              class="rounded-[1.6rem] border border-default/80 bg-elevated/40 p-5"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Estado actual
              </p>
              <p class="mt-3 text-lg font-semibold text-highlighted">
                {{ lawyerAvailabilityLabels[availabilityStatus] }}
              </p>
              <p class="mt-2 text-sm text-muted">
                {{ lawyerAvailabilityDescriptions[availabilityStatus] }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UButton
              :loading="loading"
              :disabled="pageLoading"
              size="lg"
              leading-icon="i-lucide-save"
              @click="guardarCambios"
            >
              Guardar cambios
            </UButton>

            <UButton
              to="/account/security"
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-arrow-right"
            >
              Ir a seguridad
            </UButton>
          </div>
        </div>
      </UCard>

      <div class="grid gap-6">
        <UCard class="border-default/80 bg-default/85 shadow-sm backdrop-blur-sm dark:bg-elevated/70">
          <div class="space-y-4">
            <div>
              <p class="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
                Checklist
              </p>
              <h2 class="mt-2 text-xl font-semibold text-highlighted">
                Qué tan listo está tu perfil
              </h2>
            </div>

            <div class="space-y-3">
              <div
                v-for="item in checklistItems"
                :key="item.label"
                class="flex items-start gap-3 rounded-[1.4rem] border p-4"
                :class="item.complete ? 'border-primary/15 bg-primary/8 dark:bg-primary/12' : 'border-default/80 bg-elevated/50 dark:bg-elevated/30'"
              >
                <div
                  class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full"
                  :class="item.complete ? 'bg-primary text-white' : 'bg-default text-muted'"
                >
                  <UIcon
                    :name="item.complete ? 'i-lucide-check' : 'i-lucide-plus'"
                    class="size-4"
                  />
                </div>

                <div>
                  <p class="font-medium text-highlighted">
                    {{ item.label }}
                  </p>
                  <p class="mt-1 text-sm leading-6 text-muted">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="border-default/80 bg-default/85 shadow-sm backdrop-blur-sm dark:bg-elevated/70">
          <div class="space-y-4">
            <div>
              <p class="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
                Notas
              </p>
              <h2 class="mt-2 text-xl font-semibold text-highlighted">
                Cómo se usa esta información
              </h2>
            </div>

            <div class="space-y-3 text-sm leading-6 text-muted">
              <p>
                El correo mostrado viene de tu cuenta de acceso en Supabase Auth y se
                consulta aquí como referencia.
              </p>
              <p>
                Tu nombre, teléfono y direcciones sí se guardan en el perfil de la app,
                por eso podés editarlos desde esta pantalla.
              </p>
              <p v-if="showOfficeAddressField">
                La dirección de oficina o notaría ayuda a reforzar el contexto profesional
                de la cuenta.
              </p>
              <p v-else>
                Si en el futuro tu cuenta requiere datos profesionales, esta misma sección
                puede crecer sin romper el flujo actual.
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
