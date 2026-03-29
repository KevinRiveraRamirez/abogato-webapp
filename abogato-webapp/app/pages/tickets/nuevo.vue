<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  groupTemplateFields,
  isTemplateFieldList,
  normalizeTemplateFields,
  type TemplateField,
  type TemplateFieldPadronValue,
} from '~~/shared/utils/document-template-fields'

definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const supabase = useSupabaseClient()

type Field = TemplateField
type FieldValue = string | number | undefined
type TemplateRow = Database['public']['Tables']['document_templates']['Row']

type Template = {
  id: string
  title: string
  fields: Field[]
  servicio_id: number | null
  activo: boolean
}

type PadronRow = {
  cedula: string
  nombre: string
  apellido_1: string
  apellido_2: string | null
  nombre_completo: string
}

function normalizarPlantilla(row: Pick<TemplateRow, 'id' | 'title' | 'fields' | 'servicio_id' | 'activo'>): Template {
  return {
    id: row.id,
    title: row.title,
    fields: isTemplateFieldList(row.fields) ? normalizeTemplateFields(row.fields) : [],
    servicio_id: row.servicio_id ?? null,
    activo: row.activo ?? true,
  }
}

const plantillas = ref<Template[]>([])
const tramiteSeleccionadoId = ref('')
const nuevaDescripcion = ref('')
const nuevaPrioridad = ref<'low' | 'normal' | 'high'>('normal')
const fieldValues = ref<Record<string, FieldValue>>({})
const archivosAdjuntos = ref<File[]>([])

const loading = ref(false)
const loadingPlantillas = ref(false)
const errorMsg = ref('')

const formatosPermitidos = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const tamañoMaximo = 10 * 1024 * 1024
const padronMensajes = ref<Record<string, string>>({})
const ultimaCedulaBuscada = ref<Record<string, string>>({})
const ultimoLookupIdPorCampo = ref<Record<string, number>>({})
const cedulaLookupTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
let siguienteLookupId = 0

const opcionesPrioridad = [
  { label: 'Baja', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'Alta', value: 'high' },
] as Array<{ label: string, value: 'low' | 'normal' | 'high' }>

function normalizarTexto(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function textoDeCampo(value: FieldValue) {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

function campoEstaVacio(value: FieldValue) {
  return textoDeCampo(value).trim() === ''
}

function placeholderDeCampo(field: Field) {
  return field.placeholder?.trim() || `Ingresá ${field.label.toLowerCase()}`
}

function esCampoCedula(field: Field) {
  const key = normalizarTexto(field.key)
  const label = normalizarTexto(field.label)

  return ['cedula', 'identificacion', 'identidad'].some((candidate) =>
    key.includes(candidate) || label.includes(candidate)
  )
}

function esCampoNombre(field: Field) {
  const key = normalizarTexto(field.key)
  const label = normalizarTexto(field.label)

  return ['nombre', 'apellido'].some((candidate) =>
    key.includes(candidate) || label.includes(candidate)
  )
}

function obtenerTipoPersona(field: Field) {
  const source = `${normalizarTexto(field.key)}${normalizarTexto(field.label)}`

  if (['apoderado', 'apoderada', 'mandatario', 'representante'].some((candidate) => source.includes(candidate))) {
    return 'apoderado'
  }

  if (['cliente', 'otorgante', 'poderdante', 'titular'].some((candidate) => source.includes(candidate))) {
    return 'cliente'
  }

  if (['conyuge', 'esposo', 'esposa', 'pareja'].some((candidate) => source.includes(candidate))) {
    return 'conyuge'
  }

  return 'titular'
}

function buscarCampoPorCandidatos(campos: Field[], candidatos: string[], exclusions: string[] = []) {
  return campos.find((field) => {
    const key = normalizarTexto(field.key)
    const label = normalizarTexto(field.label)

    const coincide = candidatos.some((candidate) => key.includes(candidate) || label.includes(candidate))
    const excluido = exclusions.some((candidate) => key.includes(candidate) || label.includes(candidate))

    return coincide && !excluido
  })
}

function obtenerTokenPersona(field: Field) {
  const source = `${normalizarTexto(field.key)}${normalizarTexto(field.label)}`
  const tipoPersona = obtenerTipoPersona(field)
  const digitos = source.match(/\d+/)?.[0] ?? ''

  if (digitos) return `${tipoPersona}-${digitos}`
  return tipoPersona
}

function prioridadTokenPersona(token: string) {
  if (token.startsWith('cliente') || token.startsWith('titular')) return 0
  if (token.startsWith('apoderado')) return 1
  if (token.startsWith('conyuge')) return 2
  return 3
}

function ordenarCamposParaVista(fields: Field[]) {
  const ordenados: Field[] = []
  const usados = new Set<string>()

  const indicesCedulaOrdenados = fields
    .map((field, index) => (esCampoFuentePadron(field) ? index : -1))
    .filter(index => index >= 0)
    .sort((a, b) => {
      const campoA = fields[a]
      const campoB = fields[b]
      const prioridadA = campoA ? prioridadTokenPersona(obtenerTokenPersona(campoA)) : 99
      const prioridadB = campoB ? prioridadTokenPersona(obtenerTokenPersona(campoB)) : 99

      if (prioridadA !== prioridadB) return prioridadA - prioridadB
      return a - b
    })

  indicesCedulaOrdenados.forEach((cedulaIndex) => {
    const cedula = fields[cedulaIndex]
    if (!cedula) return

    const token = obtenerTokenPersona(cedula)
    const relacionados = fields.filter((field) =>
      field.key !== cedula.key &&
      !esCampoFuentePadron(field) &&
      obtenerTokenPersona(field) === token
    )
    const nombres = relacionados.filter(esCampoNombre)
    const otros = relacionados.filter((field) => !esCampoNombre(field))

    ordenados.push(cedula)
    usados.add(cedula.key)

    nombres.forEach((field) => {
      ordenados.push(field)
      usados.add(field.key)
    })

    otros.forEach((field) => {
      ordenados.push(field)
      usados.add(field.key)
    })
  })

  fields.forEach((field) => {
    if (!usados.has(field.key)) {
      ordenados.push(field)
    }
  })

  return ordenados
}

const plantillaSeleccionada = computed(() =>
  plantillas.value.find(p => p.id === tramiteSeleccionadoId.value) ?? null
)

const camposFormulario = computed(() => plantillaSeleccionada.value?.fields ?? [])
const hayFuentesPadronExplicitas = computed(() =>
  camposFormulario.value.some(field => field.padron_source)
)

function esCampoFuentePadron(field: Field) {
  if (field.padron_source) return true
  if (hayFuentesPadronExplicitas.value) return false
  return esCampoCedula(field)
}

function ayudaDeCampo(field: Field) {
  const ayuda = field.help?.trim()
  const padron = esCampoFuentePadron(field) ? padronMensajes.value[field.key] : ''
  const mensajes = [ayuda, padron].filter(Boolean)

  return mensajes.length ? mensajes.join(' · ') : undefined
}

const opcionesTramite = computed(() =>
  plantillas.value.map((p) => ({
    label: p.title,
    value: p.id,
  }))
)

const seccionesFormulario = computed(() =>
  groupTemplateFields(camposFormulario.value).map(section => ({
    ...section,
    fields: ordenarCamposParaVista(section.fields),
  }))
)

const resumenTramiteSeleccionado = computed(() => {
  if (!plantillaSeleccionada.value) return ''
  return plantillaSeleccionada.value.title
})

const indicesCedula = computed(() =>
  camposFormulario.value
    .map((field, index) => (esCampoFuentePadron(field) ? index : -1))
    .filter(index => index >= 0)
)

function obtenerGrupoPosicionalDeCedula(cedulaKey: string) {
  const cedulaIndex = camposFormulario.value.findIndex((field) => field.key === cedulaKey)
  if (cedulaIndex < 0) return []

  const siguienteCedulaIndex = camposFormulario.value.findIndex(
    (field, index) => index > cedulaIndex && esCampoFuentePadron(field)
  )

  return camposFormulario.value.slice(
    cedulaIndex,
    siguienteCedulaIndex >= 0 ? siguienteCedulaIndex : camposFormulario.value.length
  )
}

function obtenerCamposRelacionadosConCedula(cedulaKey: string) {
  const vinculadosExplicitos = camposFormulario.value.filter((field) =>
    field.padron_source_key === cedulaKey && field.padron_value
  )

  if (vinculadosExplicitos.length) return vinculadosExplicitos

  const cedulaField = camposFormulario.value.find((field) => field.key === cedulaKey)
  if (!cedulaField) return []

  const token = obtenerTokenPersona(cedulaField)
  const relacionados = camposFormulario.value.filter((field) =>
    field.key !== cedulaKey &&
    !esCampoFuentePadron(field) &&
    obtenerTokenPersona(field) === token
  )

  if (relacionados.length) return relacionados

  return obtenerGrupoPosicionalDeCedula(cedulaKey).filter((field) => !esCampoFuentePadron(field))
}

function obtenerValorDesdePadron(data: PadronRow, field: Field) {
  const explicitValue = field.padron_value
  if (!explicitValue) return ''

  const value = data[explicitValue]
  return value ?? ''
}

async function autocompletarDesdePadron(cedulaKey: string, cedula: string, lookupId: number) {
  if (!cedula || cedula.length < 9) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: '' }
    return
  }

  const { data, error } = await supabase
    .from('padron_electores')
    .select('cedula, nombre, apellido_1, apellido_2, nombre_completo')
    .eq('cedula', cedula)
    .maybeSingle()

  if (ultimoLookupIdPorCampo.value[cedulaKey] !== lookupId) return

  ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [cedulaKey]: cedula }

  if (error) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No se pudo consultar el padrón en este momento.' }
    return
  }

  if (!data) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No encontramos esa cédula en el padrón.' }
    return
  }

  const actualizaciones: Record<string, FieldValue> = { ...fieldValues.value }
  const grupo = obtenerCamposRelacionadosConCedula(cedulaKey)
  const vinculadosExplicitos = grupo.filter((field) => field.padron_source_key === cedulaKey && field.padron_value)

  if (vinculadosExplicitos.length) {
    vinculadosExplicitos.forEach((field) => {
      actualizaciones[field.key] = obtenerValorDesdePadron(data as PadronRow, field)
    })
  }
  else {
    const campoNombreCompleto = buscarCampoPorCandidatos(grupo, ['nombrecompleto'])
    const campoNombre = buscarCampoPorCandidatos(grupo, ['nombre'], ['nombrecompleto'])
    const campoApellido1 = buscarCampoPorCandidatos(grupo, ['apellido1', 'primerapellido'])
    const campoApellido2 = buscarCampoPorCandidatos(grupo, ['apellido2', 'segundoapellido'])

    if (campoNombreCompleto) {
      actualizaciones[campoNombreCompleto.key] = data.nombre_completo
    }

    if (campoNombre) {
      actualizaciones[campoNombre.key] = data.nombre
    }

    if (campoApellido1) {
      actualizaciones[campoApellido1.key] = data.apellido_1
    }

    if (campoApellido2) {
      actualizaciones[campoApellido2.key] = data.apellido_2 ?? ''
    }
  }

  fieldValues.value = actualizaciones
  padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: `Datos encontrados para ${data.nombre_completo}.` }
}

watch(tramiteSeleccionadoId, (templateId) => {
  const template = plantillas.value.find(p => p.id === templateId)
  const nextValues: Record<string, FieldValue> = {}

  template?.fields.forEach((field) => {
    nextValues[field.key] = fieldValues.value[field.key] ?? ''
  })

  fieldValues.value = nextValues
  padronMensajes.value = {}
  ultimaCedulaBuscada.value = {}
  ultimoLookupIdPorCampo.value = {}
})

watch(fieldValues, (values) => {
  const cedulas = indicesCedula.value.flatMap((index) => {
    const field = camposFormulario.value[index]
    if (!field) return []

    return [{
      key: field.key,
      value: textoDeCampo(values[field.key]).replace(/\D/g, ''),
    }]
  })

  cedulas.forEach(({ key, value }) => {
    const timeout = cedulaLookupTimeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      cedulaLookupTimeouts.delete(key)
    }

    if (!value) {
      padronMensajes.value = { ...padronMensajes.value, [key]: '' }
      ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [key]: '' }
      return
    }

    if (value.length < 9) {
      padronMensajes.value = {
        ...padronMensajes.value,
        [key]: 'Ingresá una cédula completa para autocompletar los datos.',
      }
      ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [key]: '' }
      return
    }

    if (ultimaCedulaBuscada.value[key] === value) return

    const lookupId = ++siguienteLookupId
    ultimoLookupIdPorCampo.value = { ...ultimoLookupIdPorCampo.value, [key]: lookupId }

    const nuevoTimeout = setTimeout(() => {
      autocompletarDesdePadron(key, value, lookupId)
    }, 450)

    cedulaLookupTimeouts.set(key, nuevoTimeout)
  })
}, { deep: true })

function seleccionarArchivo(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  errorMsg.value = ''

  if (!files.length) {
    archivosAdjuntos.value = []
    return
  }

  for (const file of files) {
    if (!formatosPermitidos.includes(file.type)) {
      errorMsg.value = 'Formato no permitido. Solo PDF, JPG, PNG, DOC, DOCX, XLS y XLSX.'
      input.value = ''
      archivosAdjuntos.value = []
      return
    }

    if (file.size > tamañoMaximo) {
      errorMsg.value = `El archivo "${file.name}" supera el tamaño máximo permitido de 10MB.`
      input.value = ''
      archivosAdjuntos.value = []
      return
    }
  }

  archivosAdjuntos.value = files
}

async function cargarPlantillas() {
  loadingPlantillas.value = true

  const { data, error } = await supabase
    .from('document_templates')
    .select('id, title, fields, servicio_id, activo')
    .eq('activo', true)
    .order('title')

  loadingPlantillas.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  plantillas.value = (data ?? [])
    .map((row) => normalizarPlantilla(row as Pick<TemplateRow, 'id' | 'title' | 'fields' | 'servicio_id' | 'activo'>))
}

async function volverAlListado() {
  await navigateTo('/tickets')
}

async function crearTicket() {
  if (!plantillaSeleccionada.value) {
    errorMsg.value = 'Seleccioná el tipo de trámite para continuar.'
    return
  }

  const camposVacios = camposFormulario.value.filter(field =>
    (field.required ?? true) && campoEstaVacio(fieldValues.value[field.key])
  )
  if (camposVacios.length) {
    errorMsg.value = 'Completá todos los campos obligatorios del trámite.'
    return
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) {
    errorMsg.value = 'Sesión no válida.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { data: ticketCreado, error } = await supabase
    .from('tickets')
    .insert([{
      created_by: authUser.id,
      assigned_to: null,
      title: plantillaSeleccionada.value.title,
      description: nuevaDescripcion.value.trim() || null,
      priority: nuevaPrioridad.value,
    }])
    .select()
    .single()

  if (error) {
    loading.value = false
    errorMsg.value = error.message
    return
  }

  const { error: documentoError } = await supabase
    .from('documents')
    .insert([{
      ticket_id: ticketCreado.id,
      template_id: plantillaSeleccionada.value.id,
      field_values: fieldValues.value,
      status: 'submitted',
      created_by: authUser.id,
    }])

  if (documentoError) {
    loading.value = false
    errorMsg.value = documentoError.message
    return
  }

  if (archivosAdjuntos.value.length) {
    for (const file of archivosAdjuntos.value) {
      const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${ticketCreado.id}/${Date.now()}_${nombreSeguro}`

      const { error: uploadError } = await supabase.storage
        .from('ticket-adjuntos')
        .upload(filePath, file)

      if (uploadError) {
        loading.value = false
        errorMsg.value = `Error subiendo archivo: ${uploadError.message}`
        return
      }
    }
  }

  loading.value = false

  await navigateTo({
    path: '/tickets',
    query: {
      status: 'created',
      ticket: ticketCreado.id,
    },
  })
}

onMounted(async () => {
  await cargarPlantillas()

  const templateId = typeof route.query.template === 'string' ? route.query.template : ''
  if (templateId && plantillas.value.some((template) => template.id === templateId)) {
    tramiteSeleccionadoId.value = templateId
  }
})

onBeforeUnmount(() => {
  cedulaLookupTimeouts.forEach((timeout) => clearTimeout(timeout))
  cedulaLookupTimeouts.clear()
})
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <AppPageHeader
      eyebrow="Cliente"
      title="Nuevo ticket"
      description="Elegí la plantilla del trámite, completá el formulario y adjuntá respaldo si hace falta."
    >
      <template #leading>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          square
          @click="void volverAlListado()"
        />
      </template>

      <template #actions>
        <UButton color="neutral" variant="outline" @click="void volverAlListado()">
          Cancelar
        </UButton>
        <UButton :loading="loading" @click="crearTicket">
          {{ loading ? 'Creando...' : 'Crear ticket' }}
        </UButton>
      </template>
    </AppPageHeader>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
      class="mb-4"
    />

    <UCard v-if="loadingPlantillas" class="mb-6">
      <div class="grid gap-4">
        <USkeleton class="h-8 w-72" />
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-48 w-full rounded-3xl" />
      </div>
    </UCard>

    <template v-else>
      <UCard v-if="!plantillas.length" class="mb-6">
        <div class="grid gap-3">
          <p class="font-medium text-highlighted">No hay plantillas activas disponibles</p>
          <p class="text-sm text-muted">
            Primero hay que activar o crear una plantilla en el módulo de administración para poder abrir tickets nuevos.
          </p>
          <div>
            <UButton color="neutral" variant="outline" @click="void volverAlListado()">
              Volver a mis tickets
            </UButton>
          </div>
        </div>
      </UCard>

      <div v-else class="grid gap-6">
        <UCard>
          <div class="grid gap-4">
            <UFormField label="Tipo de trámite" required>
              <USelect
                v-model="tramiteSeleccionadoId"
                placeholder="Seleccioná un trámite"
                value-key="value"
                :items="opcionesTramite"
              />
            </UFormField>

            <UAlert
              v-if="plantillaSeleccionada"
              color="success"
              variant="soft"
              title="Trámite seleccionado"
              :description="resumenTramiteSeleccionado"
            />
          </div>
        </UCard>

        <div v-if="seccionesFormulario.length" class="grid gap-5">
          <UCard
            v-for="section in seccionesFormulario"
            :key="section.id"
          >
            <template v-if="section.title || section.description || seccionesFormulario.length > 1" #header>
              <div>
                <h3 class="font-semibold text-highlighted">
                  {{ section.title || 'Datos del trámite' }}
                </h3>
                <p v-if="section.description" class="mt-1 text-sm text-muted">
                  {{ section.description }}
                </p>
              </div>
            </template>

            <div class="grid gap-4 md:grid-cols-2">
              <UFormField
                v-for="field in section.fields"
                :key="field.key"
                :label="field.label"
                :required="field.required ?? true"
                :help="ayudaDeCampo(field)"
                :class="field.width === 'full' ? 'md:col-span-2' : ''"
              >
                <UTextarea
                  v-if="field.type === 'textarea'"
                  :model-value="fieldValues[field.key] ?? ''"
                  :rows="4"
                  :placeholder="placeholderDeCampo(field)"
                  @update:model-value="(value) => { fieldValues[field.key] = value }"
                />

                <div v-else-if="field.type === 'boolean'" class="flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="rounded-full border px-4 py-2 text-sm transition"
                    :class="fieldValues[field.key] === 'Sí' ? 'border-primary bg-primary/10 text-primary' : 'border-default bg-default text-highlighted hover:border-primary/50'"
                    @click="fieldValues[field.key] = 'Sí'"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    class="rounded-full border px-4 py-2 text-sm transition"
                    :class="fieldValues[field.key] === 'No' ? 'border-primary bg-primary/10 text-primary' : 'border-default bg-default text-highlighted hover:border-primary/50'"
                    @click="fieldValues[field.key] = 'No'"
                  >
                    No
                  </button>
                </div>

                <UInput
                  v-else
                  :model-value="fieldValues[field.key] ?? ''"
                  :type="field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'"
                  :placeholder="placeholderDeCampo(field)"
                  @update:model-value="(value) => { fieldValues[field.key] = value }"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <UAlert
          v-if="tramiteSeleccionadoId && !camposFormulario.length"
          color="warning"
          variant="soft"
          title="Plantilla sin campos"
          description="Este trámite no tiene campos configurados aún. Igual podés agregar una descripción y adjuntos."
        />

        <UCard>
          <div class="grid gap-4">
            <UFormField label="Descripción adicional">
              <UTextarea
                v-model="nuevaDescripcion"
                placeholder="Agregá contexto, dudas o instrucciones para el abogado"
                :rows="4"
              />
            </UFormField>

            <UFormField
              label="Adjuntar archivos"
              help="Podés adjuntar varios archivos. Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS y XLSX. Máximo 10MB por archivo."
            >
              <input
                type="file"
                multiple
                class="block w-full rounded-xl border border-default bg-default px-4 py-3 text-sm"
                @change="seleccionarArchivo"
              >
            </UFormField>

            <div v-if="archivosAdjuntos.length" class="grid gap-2">
              <UBadge
                v-for="archivo in archivosAdjuntos"
                :key="`${archivo.name}-${archivo.size}`"
                color="success"
                variant="subtle"
                class="w-fit"
              >
                {{ archivo.name }}
              </UBadge>
            </div>

            <div class="grid gap-4 sm:max-w-xs">
              <UFormField label="Prioridad">
                <USelect
                  v-model="nuevaPrioridad"
                  value-key="value"
                  :items="opcionesPrioridad"
                />
              </UFormField>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
