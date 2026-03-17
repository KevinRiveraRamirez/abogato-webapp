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
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Traspaso de carro</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Consultá al propietario por cédula y agregá el vehículo al trámite notarial.
        </p>
      </div>

      <NuxtLink
        :to="`/ticket/${ticketId}`"
        class="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Volver al ticket
      </NuxtLink>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
      {{ errorMsg }}
    </div>

    <div v-if="successMsg" class="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
      {{ successMsg }}
    </div>

    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 mb-6">
      <h2 class="text-lg font-semibold mb-1">Consulta por identificación</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Ingresá la cédula del propietario para consultar sus datos y los bienes registrados en el sistema.
      </p>

      <div class="grid gap-4">
        <div class="grid gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cédula del propietario <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="cedula"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá la cédula"
            />
            <button
              class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              :disabled="loadingConsulta"
              @click="consultar"
            >
              {{ loadingConsulta ? 'Consultando...' : 'Consultar' }}
            </button>
          </div>
        </div>

        <div v-if="mensajeConsulta" class="rounded-lg border border-green-100 bg-green-50/80 dark:border-green-900 dark:bg-green-950/30 p-4">
          <p class="text-sm font-medium text-green-800 dark:text-green-200">Resultado de la consulta</p>
          <p class="text-sm text-green-700 dark:text-green-300 mt-1">{{ mensajeConsulta }}</p>
        </div>

        <div v-if="avisoInconsistencia" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {{ avisoInconsistencia }}
        </div>

        <div v-if="propietario" class="rounded-xl border border-green-100 bg-green-50/80 dark:border-green-900 dark:bg-green-950/30 p-4">
          <p class="text-sm font-medium text-green-800 dark:text-green-200">Propietario encontrado</p>
          <div class="grid gap-2 mt-3 text-sm text-green-700 dark:text-green-300">
            <p><span class="font-medium">Nombre:</span> {{ propietario.nombre_completo }}</p>
            <p><span class="font-medium">Cédula:</span> {{ propietario.cedula }}</p>
            <p>
              <span class="font-medium">Ubicación:</span>
              {{ [propietario.distrito, propietario.canton, propietario.provincia].filter(Boolean).join(', ') || 'No disponible' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="propietario"
      class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 mb-6"
    >
      <h2 class="text-lg font-semibold mb-1">Documento de traspaso</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Completá los datos del vehículo para asociarlo a este trámite.
      </p>

      <div class="grid gap-4">
        <div class="grid gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Nombre del propietario <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.nombre_propietario"
            type="text"
            class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Nombre del propietario"
          />
        </div>

        <div class="grid gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Calidades del propietario <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="form.calidades_propietario"
            rows="3"
            class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Calidades del propietario"
          />
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoría <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.categoria"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Automóvil"
            />
          </div>

          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Año de fabricación <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.anio_fabricacion"
              type="number"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá el año"
            />
          </div>

          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              VIN <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.vin"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá el VIN"
            />
          </div>

          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor Hacienda
            </label>
            <input
              v-model="form.valor_hacienda"
              type="number"
              min="0"
              step="0.01"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá el valor"
            />
          </div>

          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Estado tributario <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.estado_tributario"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Al día, pendiente, etc."
            />
          </div>

          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Placa
            </label>
            <input
              v-model="form.placa"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá la placa"
            />
          </div>

          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Marca
            </label>
            <input
              v-model="form.marca"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá la marca"
            />
          </div>

          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Modelo
            </label>
            <input
              v-model="form.modelo"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá el modelo"
            />
          </div>

          <div class="grid gap-1 md:col-span-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Color
            </label>
            <input
              v-model="form.color"
              type="text"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresá el color"
            />
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button
            class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            :disabled="loadingGuardar"
            @click="guardarDocumento"
          >
            {{ loadingGuardar ? 'Guardando...' : 'Guardar documento' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="propietario"
      class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6"
    >
      <h2 class="text-lg font-semibold mb-1">Bienes registrados encontrados</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Resultado de la consulta para la identificación ingresada.
      </p>

      <div v-if="loadingConsulta" class="text-gray-500 text-sm">
        Cargando...
      </div>

      <div
        v-else-if="documentosPrevios.length === 0"
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        No hay bienes registrados asociados a esta identificación.
      </div>

      <div v-else class="grid gap-3">
        <div
          v-for="doc in documentosPrevios"
          :key="doc.id"
          class="border rounded p-4 hover:shadow-sm transition-shadow"
        >
          <div class="flex justify-between items-start gap-2 flex-wrap">
            <div>
              <p class="font-medium">
                {{ doc.marca || 'Vehículo' }} {{ doc.modelo || '' }}
              </p>
              <div class="flex gap-2 mt-1 flex-wrap items-center">
                <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {{ doc.categoria }}
                </span>
                <span class="text-xs text-gray-500">
                  Estado tributario: {{ doc.estado_tributario }}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                {{ new Date(doc.created_at).toLocaleDateString('es-CR') }}
              </p>
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
            <p><span class="font-medium">Placa:</span> {{ doc.placa || 'No registrada' }}</p>
            <p><span class="font-medium">VIN:</span> {{ doc.vin }}</p>
            <p><span class="font-medium">Año:</span> {{ doc.anio_fabricacion }}</p>
            <p><span class="font-medium">Valor Hacienda:</span> ₡ {{ Number(doc.valor_hacienda || 0).toLocaleString('es-CR') }}</p>
            <p><span class="font-medium">Color:</span> {{ doc.color || 'No registrado' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>