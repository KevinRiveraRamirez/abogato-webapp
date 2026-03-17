<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const ticketId = computed(() => route.params.id as string)

type PadronElector = {
  cedula: string
  nombre_completo: string
  provincia: string | null
  canton: string | null
  distrito: string | null
  sexo: number | null
}

type VehicleTransferDocument = {
  id: string
  ticket_id: string | null
  owner_profile_id: string | null
  cedula_propietario: string
  nombre_propietario: string
  calidades_propietario: string
  categoria: string
  anio_fabricacion: number
  vin: string
  valor_hacienda: number
  estado_tributario: string
  placa: string | null
  marca: string | null
  modelo: string | null
  color: string | null
  created_at: string
  updated_at: string
}

const cedula = ref('')
const propietario = ref<PadronElector | null>(null)
const documentosPrevios = ref<VehicleTransferDocument[]>([])

const loadingConsulta = ref(false)
const loadingGuardar = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const mensajeConsulta = ref('')
const avisoInconsistencia = ref('')

const form = reactive({
  categoria: 'automovil',
  anio_fabricacion: new Date().getFullYear(),
  vin: '',
  valor_hacienda: 0,
  estado_tributario: '',
  placa: '',
  marca: '',
  modelo: '',
  color: '',
  nombre_propietario: '',
  calidades_propietario: ''
})

function limpiarFormularioVehiculo() {
  form.categoria = 'automovil'
  form.anio_fabricacion = new Date().getFullYear()
  form.vin = ''
  form.valor_hacienda = 0
  form.estado_tributario = ''
  form.placa = ''
  form.marca = ''
  form.modelo = ''
  form.color = ''
}

function construirCalidades(persona: PadronElector) {
  const ubicacion = [persona.distrito, persona.canton, persona.provincia]
    .filter(Boolean)
    .join(', ')

  return `${persona.nombre_completo}, cédula ${persona.cedula}${ubicacion ? `, vecino(a) de ${ubicacion}` : ''}`
}

async function buscarPropietarioPorCedula(cedulaParam: string) {
  const { data, error } = await supabase
    .from('padron_electores')
    .select('cedula, nombre_completo, provincia, canton, distrito, sexo')
    .eq('cedula', cedulaParam)
    .single()

  if (error) throw error
  return data as PadronElector
}

async function buscarDocumentosPorCedula(cedulaParam: string) {
  const { data, error } = await supabase
    .from('vehicle_transfer_documents')
    .select('*')
    .eq('cedula_propietario', cedulaParam)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as VehicleTransferDocument[]
}

async function consultar() {
  errorMsg.value = ''
  successMsg.value = ''
  mensajeConsulta.value = ''
  avisoInconsistencia.value = ''
  propietario.value = null
  documentosPrevios.value = []
  form.nombre_propietario = ''
  form.calidades_propietario = ''
  limpiarFormularioVehiculo()

  const cedulaLimpia = cedula.value.trim().replace(/\D/g, '')

  if (!cedulaLimpia) {
    errorMsg.value = 'Debés ingresar una cédula.'
    return
  }

  try {
    loadingConsulta.value = true

    const persona = await buscarPropietarioPorCedula(cedulaLimpia)
    propietario.value = persona

    form.nombre_propietario = persona.nombre_completo
    form.calidades_propietario = construirCalidades(persona)

    const docs = await buscarDocumentosPorCedula(cedulaLimpia)
    documentosPrevios.value = docs

    if (docs.length > 0) {
      mensajeConsulta.value = 'Consulta exitosa. Se encontraron bienes registrados asociados a esta identificación.'
    } else {
      mensajeConsulta.value = 'No hay bienes registrados asociados a esta identificación.'
    }

    const datosIncompletos =
      !persona.nombre_completo ||
      (!persona.provincia && !persona.canton && !persona.distrito)

    if (datosIncompletos) {
      avisoInconsistencia.value =
        'La fuente oficial presenta datos incompletos o podría estar desactualizada.'
    }
  } catch (error: any) {
    console.error(error)
    errorMsg.value = 'No se pudo consultar la información con esa identificación.'
    avisoInconsistencia.value =
      'Puede existir una inconsistencia o ausencia de datos en la fuente oficial.'
  } finally {
    loadingConsulta.value = false
  }
}

async function guardarDocumento() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!propietario.value) {
    errorMsg.value = 'Primero debés consultar una identificación válida.'
    return
  }

  if (!form.anio_fabricacion || !form.vin.trim() || !form.estado_tributario.trim()) {
    errorMsg.value = 'Completá los campos obligatorios del vehículo.'
    return
  }

  try {
    loadingGuardar.value = true

    const payload = {
      ticket_id: ticketId.value,
      owner_profile_id: user.value?.id ?? null,
      cedula_propietario: propietario.value.cedula,
      nombre_propietario: form.nombre_propietario.trim(),
      calidades_propietario: form.calidades_propietario.trim(),
      categoria: form.categoria.trim() || 'automovil',
      anio_fabricacion: Number(form.anio_fabricacion),
      vin: form.vin.trim(),
      valor_hacienda: Number(form.valor_hacienda || 0),
      estado_tributario: form.estado_tributario.trim(),
      placa: form.placa.trim() || null,
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      color: form.color.trim() || null
    }

    const { error } = await supabase
      .from('vehicle_transfer_documents')
      .insert([payload])

    if (error) throw error

    successMsg.value = 'El documento de traspaso fue guardado correctamente.'

    const docs = await buscarDocumentosPorCedula(propietario.value.cedula)
    documentosPrevios.value = docs

    limpiarFormularioVehiculo()
    form.nombre_propietario = propietario.value.nombre_completo
    form.calidades_propietario = construirCalidades(propietario.value)
  } catch (error: any) {
    console.error(error)

    if (error?.message?.toLowerCase().includes('duplicate') || error?.message?.toLowerCase().includes('unique')) {
      errorMsg.value = 'Ya existe un documento registrado con ese VIN.'
    } else {
      errorMsg.value = error?.message || 'Ocurrió un error al guardar el documento.'
    }
  } finally {
    loadingGuardar.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Traspaso de carro</h1>
        <p class="mt-1 text-sm text-muted">
          Consultá al propietario por cédula y agregá el vehículo al trámite notarial.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          to="/traspaso-carro"
          color="neutral"
          variant="outline"
          leading-icon="i-lucide-arrow-left"
        >
          Volver a traspasos
        </UButton>
        <UButton
          :to="`/ticket/${ticketId}`"
          color="neutral"
          variant="ghost"
        >
          Ver ticket
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la consulta"
      :description="errorMsg"
      class="mb-4"
    />

    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Documento guardado"
      :description="successMsg"
      class="mb-4"
    />

    <UCard class="mb-6">
      <template #header>
        <div>
          <h2 class="text-lg font-semibold text-highlighted">Consulta por identificación</h2>
          <p class="mt-1 text-sm text-muted">
            Ingresá la cédula del propietario para consultar sus datos y los bienes registrados en el sistema.
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <UFormField label="Cédula del propietario" required>
            <UInput
              v-model="cedula"
              type="text"
              placeholder="Ingresá la cédula"
            />
          </UFormField>
          <div class="flex items-end">
            <UButton :loading="loadingConsulta" @click="consultar">
              {{ loadingConsulta ? 'Consultando...' : 'Consultar' }}
            </UButton>
          </div>
        </div>

        <UAlert
          v-if="mensajeConsulta"
          color="success"
          variant="soft"
          title="Resultado de la consulta"
          :description="mensajeConsulta"
        />

        <UAlert
          v-if="avisoInconsistencia"
          color="warning"
          variant="soft"
          title="Posible inconsistencia"
          :description="avisoInconsistencia"
        />

        <UCard
          v-if="propietario"
          variant="soft"
          :ui="{ body: 'grid gap-2 px-5 py-4 text-sm' }"
        >
          <p class="font-medium text-highlighted">Propietario encontrado</p>
          <p><span class="font-medium">Nombre:</span> {{ propietario.nombre_completo }}</p>
          <p><span class="font-medium">Cédula:</span> {{ propietario.cedula }}</p>
          <p>
            <span class="font-medium">Ubicación:</span>
            {{ [propietario.distrito, propietario.canton, propietario.provincia].filter(Boolean).join(', ') || 'No disponible' }}
          </p>
        </UCard>
      </div>
    </UCard>

    <UCard
      v-if="propietario"
      class="mb-6"
    >
      <template #header>
        <div>
          <h2 class="text-lg font-semibold text-highlighted">Documento de traspaso</h2>
          <p class="mt-1 text-sm text-muted">
            Completá los datos del vehículo para asociarlo a este trámite.
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <UFormField label="Nombre del propietario" required>
          <UInput
            v-model="form.nombre_propietario"
            type="text"
            placeholder="Nombre del propietario"
          />
        </UFormField>

        <UFormField label="Calidades del propietario" required>
          <UTextarea
            v-model="form.calidades_propietario"
            :rows="3"
            placeholder="Calidades del propietario"
          />
        </UFormField>

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Categoría" required>
            <UInput v-model="form.categoria" type="text" placeholder="Automóvil" />
          </UFormField>

          <UFormField label="Año de fabricación" required>
            <UInput v-model="form.anio_fabricacion" type="number" placeholder="Ingresá el año" />
          </UFormField>

          <UFormField label="VIN" required>
            <UInput v-model="form.vin" type="text" placeholder="Ingresá el VIN" />
          </UFormField>

          <UFormField label="Valor Hacienda">
            <UInput
              v-model="form.valor_hacienda"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ingresá el valor"
            />
          </UFormField>

          <UFormField label="Estado tributario" required>
            <UInput v-model="form.estado_tributario" type="text" placeholder="Al día, pendiente, etc." />
          </UFormField>

          <UFormField label="Placa">
            <UInput v-model="form.placa" type="text" placeholder="Ingresá la placa" />
          </UFormField>

          <UFormField label="Marca">
            <UInput v-model="form.marca" type="text" placeholder="Ingresá la marca" />
          </UFormField>

          <UFormField label="Modelo">
            <UInput v-model="form.modelo" type="text" placeholder="Ingresá el modelo" />
          </UFormField>

          <UFormField class="md:col-span-2" label="Color">
            <UInput v-model="form.color" type="text" placeholder="Ingresá el color" />
          </UFormField>
        </div>

        <div>
          <UButton :loading="loadingGuardar" @click="guardarDocumento">
            {{ loadingGuardar ? 'Guardando...' : 'Guardar documento' }}
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard
      v-if="propietario"
    >
      <template #header>
        <div>
          <h2 class="text-lg font-semibold text-highlighted">Bienes registrados encontrados</h2>
          <p class="mt-1 text-sm text-muted">
            Resultado de la consulta para la identificación ingresada.
          </p>
        </div>
      </template>

      <div v-if="loadingConsulta" class="text-sm text-muted">
        Cargando...
      </div>

      <UAlert
        v-else-if="documentosPrevios.length === 0"
        color="warning"
        variant="soft"
        title="Sin registros"
        description="No hay bienes registrados asociados a esta identificación."
      />

      <div v-else class="grid gap-3">
        <UCard
          v-for="doc in documentosPrevios"
          :key="doc.id"
        >
          <div class="flex justify-between items-start gap-2 flex-wrap">
            <div>
              <p class="font-medium text-highlighted">
                {{ doc.marca || 'Vehículo' }} {{ doc.modelo || '' }}
              </p>
              <div class="flex gap-2 mt-1 flex-wrap items-center">
                <UBadge color="info" variant="subtle">
                  {{ doc.categoria }}
                </UBadge>
                <span class="text-xs text-muted">
                  Estado tributario: {{ doc.estado_tributario }}
                </span>
              </div>
              <p class="mt-1 text-xs text-toned">
                {{ new Date(doc.created_at).toLocaleDateString('es-CR') }}
              </p>
            </div>
          </div>

          <div class="mt-3 grid gap-2 text-sm text-muted md:grid-cols-2">
            <p><span class="font-medium">Placa:</span> {{ doc.placa || 'No registrada' }}</p>
            <p><span class="font-medium">VIN:</span> {{ doc.vin }}</p>
            <p><span class="font-medium">Año:</span> {{ doc.anio_fabricacion }}</p>
            <p><span class="font-medium">Valor Hacienda:</span> ₡ {{ Number(doc.valor_hacienda || 0).toLocaleString('es-CR') }}</p>
            <p><span class="font-medium">Color:</span> {{ doc.color || 'No registrado' }}</p>
          </div>
        </UCard>
      </div>
    </UCard>
  </div>
</template>
