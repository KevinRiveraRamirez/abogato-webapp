<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'
import type { Database } from '~/types/database.types'
import {
  groupTemplateFields,
  isTemplateFieldList,
  normalizeTemplateFields,
  type TemplateField,
} from '~~/shared/utils/document-template-fields'
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'
import { useStateLookupMonitor } from '~/composables/useStateLookupMonitor'

type Field = TemplateField
type FieldValue = string | number | boolean | null | undefined
type TicketPriority = 'low' | 'normal' | 'high'
type BuilderStep = 'setup' | 'form' | 'preview'
type TemplateRow = Database['public']['Tables']['document_templates']['Row']

type Template = {
  id: string
  title: string
  content: string
  fields: Field[]
  servicio_id: number | null
  activo: boolean
}

export type TicketDocumentFlowSubmission = {
  template: Template
  description: string
  priority: TicketPriority
  fieldValues: Record<string, FieldValue>
  attachments: File[]
  renderedContent: string
}

const props = withDefaults(defineProps<{
  mode?: 'create' | 'correction'
  eyebrow?: string
  title: string
  description: string
  backTo: string
  backLabel?: string
  initialTemplateId?: string | null
  lockedTemplateId?: string | null
  initialDescription?: string | null
  initialPriority?: TicketPriority
  initialFieldValues?: Record<string, FieldValue>
  initialRejectionReason?: string | null
  systemValues?: Record<string, FieldValue>
  allowAttachments?: boolean
  submitLabel?: string
  submitLoadingLabel?: string
  submitHandler: (payload: TicketDocumentFlowSubmission) => Promise<void>
}>(), {
  mode: 'create',
  eyebrow: 'Cliente',
  backLabel: 'Volver',
  initialTemplateId: null,
  lockedTemplateId: null,
  initialDescription: '',
  initialPriority: 'normal',
  initialFieldValues: () => ({}),
  initialRejectionReason: null,
  systemValues: () => ({}),
  allowAttachments: true,
  submitLabel: 'Enviar al abogado',
  submitLoadingLabel: 'Guardando...',
})

const supabase = useSupabaseClient<Database>()
const { registerLookupFailure, runLookupWithRetry } = useStateLookupMonitor()

function normalizarPlantilla(
  row: Pick<TemplateRow, 'id' | 'title' | 'content' | 'fields' | 'servicio_id' | 'activo'>
): Template {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    fields: isTemplateFieldList(row.fields) ? normalizeTemplateFields(row.fields) : [],
    servicio_id: row.servicio_id ?? null,
    activo: row.activo ?? true,
  }
}

const plantillas = ref<Template[]>([])
const builderStep = ref<BuilderStep>('setup')
const loadingTemplates = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const tramiteSeleccionadoId = ref(props.lockedTemplateId ?? props.initialTemplateId ?? '')
const descripcionAdicional = ref(props.initialDescription ?? '')
const prioridad = ref<TicketPriority>(props.initialPriority)
const fieldValues = ref<Record<string, FieldValue>>({})
const archivosAdjuntos = ref<File[]>([])
const padronMensajes = ref<Record<string, string>>({})
const ultimaCedulaBuscada = ref<Record<string, string>>({})
const ultimoLookupIdPorCampo = ref<Record<string, number>>({})
const cedulaLookupTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
let siguienteLookupId = 0

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

const opcionesPrioridad = [
  { label: 'Baja', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'Alta', value: 'high' },
] as Array<{ label: string, value: TicketPriority }>

const ticketMetaEnabled = computed(() => props.mode === 'create')
const attachmentsEnabled = computed(() => props.mode === 'create' && props.allowAttachments)
const templateSelectionLocked = computed(() => Boolean(props.lockedTemplateId))

const builderStepItems = computed<StepperItem[]>(() => [
  {
    value: 'setup',
    title: props.mode === 'create' ? 'Trámite' : 'Corrección',
    description: props.mode === 'create'
      ? 'Elegí el trámite y definí el contexto del caso.'
      : 'Repasá el documento observado antes de corregirlo.',
    icon: 'i-lucide-layout-template',
  },
  {
    value: 'form',
    title: 'Datos',
    description: 'Completá o ajustá la información del formulario.',
    icon: 'i-lucide-forms',
  },
  {
    value: 'preview',
    title: 'Vista previa',
    description: 'Validá el documento antes de enviarlo.',
    icon: 'i-lucide-file-search',
  },
])

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
      field.key !== cedula.key
      && !esCampoFuentePadron(field)
      && obtenerTokenPersona(field) === token
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
  plantillas.value.find((plantilla) => plantilla.id === tramiteSeleccionadoId.value) ?? null
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
  plantillas.value.map((plantilla) => ({
    label: plantilla.title,
    value: plantilla.id,
  }))
)

const seccionesFormulario = computed(() =>
  groupTemplateFields(camposFormulario.value).map(section => ({
    ...section,
    fields: ordenarCamposParaVista(section.fields),
  }))
)

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
    field.key !== cedulaKey
    && !esCampoFuentePadron(field)
    && obtenerTokenPersona(field) === token
  )

  if (relacionados.length) return relacionados

  return obtenerGrupoPosicionalDeCedula(cedulaKey).filter((field) => !esCampoFuentePadron(field))
}

type PadronRow = {
  cedula: string
  nombre: string
  apellido_1: string
  apellido_2: string | null
  nombre_completo: string
}

function obtenerValorDesdePadron(data: PadronRow, field: Field) {
  const explicitValue = field.padron_value
  if (!explicitValue) return ''

  const value = data[explicitValue]
  return value ?? ''
}

function limpiarEstadoPadron() {
  padronMensajes.value = {}
  ultimaCedulaBuscada.value = {}
  ultimoLookupIdPorCampo.value = {}
}

async function autocompletarDesdePadron(cedulaKey: string, cedula: string, lookupId: number) {
  if (!cedula || cedula.length < 9) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: '' }
    return
  }

  try {
    const data = await runLookupWithRetry(async () => {
      const result = await supabase
        .from('padron_electores')
        .select('cedula, nombre, apellido_1, apellido_2, nombre_completo')
        .eq('cedula', cedula)
        .maybeSingle()

      if (result.error) {
        throw new Error(result.error.message)
      }

      return result.data as PadronRow | null
    })

    if (ultimoLookupIdPorCampo.value[cedulaKey] !== lookupId) return

    ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [cedulaKey]: cedula }

    if (!data) {
      padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No encontramos esa cédula en el padrón.' }
      void registerLookupFailure({
        source: 'ticket_padron',
        queryValue: cedula,
        failureKind: 'not_found',
        errorMessage: 'No se encontró la cédula solicitada.',
      })
      return
    }

    const actualizaciones: Record<string, FieldValue> = { ...fieldValues.value }
    const grupo = obtenerCamposRelacionadosConCedula(cedulaKey)
    const vinculadosExplicitos = grupo.filter((field) => field.padron_source_key === cedulaKey && field.padron_value)

    if (vinculadosExplicitos.length) {
      vinculadosExplicitos.forEach((field) => {
        actualizaciones[field.key] = obtenerValorDesdePadron(data, field)
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
  } catch (error) {
    if (ultimoLookupIdPorCampo.value[cedulaKey] !== lookupId) return

    ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [cedulaKey]: cedula }
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No se pudo consultar el padrón en este momento.' }
    void registerLookupFailure({
      source: 'ticket_padron',
      queryValue: cedula,
      failureKind: 'error',
      errorMessage: error instanceof Error ? error.message : 'No se pudo consultar el padrón.',
    })
  }
}

function sincronizarCamposConPlantilla(templateId: string) {
  const template = plantillas.value.find((plantilla) => plantilla.id === templateId)

  if (!template) {
    fieldValues.value = {}
    limpiarEstadoPadron()
    return
  }

  const nextValues: Record<string, FieldValue> = {}

  template.fields.forEach((field) => {
    nextValues[field.key] = fieldValues.value[field.key] ?? props.initialFieldValues[field.key] ?? ''
  })

  fieldValues.value = nextValues
  limpiarEstadoPadron()
}

watch(tramiteSeleccionadoId, (templateId) => {
  if (!templateId) {
    fieldValues.value = {}
    limpiarEstadoPadron()
    return
  }

  sincronizarCamposConPlantilla(templateId)
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
      void autocompletarDesdePadron(key, value, lookupId)
    }, 450)

    cedulaLookupTimeouts.set(key, nuevoTimeout)
  })
}, { deep: true })

function seleccionarArchivo(event: Event) {
  const input = event.target as HTMLInputElement
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
  loadingTemplates.value = true

  const { data, error } = await supabase
    .from('document_templates')
    .select('id, title, content, fields, servicio_id, activo')
    .eq('activo', true)
    .order('title')

  loadingTemplates.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  const plantillasActivas = (data ?? [])
    .map((row) => normalizarPlantilla(row as Pick<TemplateRow, 'id' | 'title' | 'content' | 'fields' | 'servicio_id' | 'activo'>))

  const lockedTemplateMissing = props.lockedTemplateId
    && !plantillasActivas.some((template) => template.id === props.lockedTemplateId)

  if (lockedTemplateMissing) {
    const { data: lockedTemplateData, error: lockedTemplateError } = await supabase
      .from('document_templates')
      .select('id, title, content, fields, servicio_id, activo')
      .eq('id', props.lockedTemplateId)
      .maybeSingle()

    if (lockedTemplateError) {
      errorMsg.value = lockedTemplateError.message
      return
    }

    if (lockedTemplateData) {
      plantillasActivas.unshift(
        normalizarPlantilla(
          lockedTemplateData as Pick<TemplateRow, 'id' | 'title' | 'content' | 'fields' | 'servicio_id' | 'activo'>
        )
      )
    }
  }

  plantillas.value = plantillasActivas

  const preferredTemplateId = props.lockedTemplateId ?? props.initialTemplateId ?? ''

  if (preferredTemplateId && plantillas.value.some((template) => template.id === preferredTemplateId)) {
    tramiteSeleccionadoId.value = preferredTemplateId
    sincronizarCamposConPlantilla(preferredTemplateId)
    return
  }

  if (!props.lockedTemplateId) return

  errorMsg.value = 'La plantilla solicitada ya no está disponible o fue desactivada.'
}

const camposObligatoriosFaltantes = computed(() =>
  camposFormulario.value.filter((field) =>
    (field.required ?? true) && campoEstaVacio(fieldValues.value[field.key])
  )
)

const previewContent = computed(() => {
  if (!plantillaSeleccionada.value?.content) return ''

  return renderDocumentTemplate(
    plantillaSeleccionada.value.content,
    fieldValues.value,
    props.systemValues
  )
})

const stepSummary = computed(() => {
  if (builderStep.value === 'setup') {
    return {
      eyebrow: props.mode === 'create' ? 'Paso 1' : 'Paso 1',
      title: props.mode === 'create' ? 'Elegí el trámite' : 'Prepará la corrección',
      description: props.mode === 'create'
        ? 'Definí el tipo de trámite y el contexto general antes de llenar el formulario.'
        : 'Repasá la observación del abogado y prepará una nueva versión del documento.',
    }
  }

  if (builderStep.value === 'form') {
    return {
      eyebrow: 'Paso 2',
      title: 'Completá la información',
      description: 'Cada plantilla puede pedir datos distintos. Completá solo lo que aplique a tu trámite.',
    }
  }

  return {
    eyebrow: 'Paso 3',
    title: 'Validá la vista previa',
    description: 'Si encontrás un error, podés volver al formulario y corregir antes de enviarlo.',
  }
})

function irAlPasoAnterior() {
  if (builderStep.value === 'form') {
    builderStep.value = 'setup'
    return
  }

  if (builderStep.value === 'preview') {
    builderStep.value = 'form'
  }
}

function validarPasoActual(nextStep: BuilderStep) {
  if (nextStep === 'form') {
    if (!plantillaSeleccionada.value) {
      errorMsg.value = 'Seleccioná un trámite para continuar.'
      return false
    }
  }

  if (nextStep === 'preview') {
    if (!plantillaSeleccionada.value) {
      errorMsg.value = 'Seleccioná un trámite para continuar.'
      return false
    }

    if (camposObligatoriosFaltantes.value.length) {
      errorMsg.value = 'Completá todos los campos obligatorios antes de revisar la vista previa.'
      return false
    }
  }

  errorMsg.value = ''
  return true
}

function irAlPasoSiguiente() {
  if (builderStep.value === 'setup') {
    if (!validarPasoActual('form')) return
    builderStep.value = 'form'
    return
  }

  if (builderStep.value === 'form') {
    if (!validarPasoActual('preview')) return
    builderStep.value = 'preview'
  }
}

async function enviarDocumento() {
  if (!plantillaSeleccionada.value) {
    errorMsg.value = 'Seleccioná un trámite para continuar.'
    return
  }

  if (camposObligatoriosFaltantes.value.length) {
    errorMsg.value = 'Completá todos los campos obligatorios del trámite.'
    builderStep.value = 'form'
    return
  }

  submitting.value = true
  errorMsg.value = ''

  try {
    await props.submitHandler({
      template: plantillaSeleccionada.value,
      description: descripcionAdicional.value.trim(),
      priority: prioridad.value,
      fieldValues: { ...fieldValues.value },
      attachments: [...archivosAdjuntos.value],
      renderedContent: previewContent.value,
    })
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'No se pudo completar la acción.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await cargarPlantillas()
})

onBeforeUnmount(() => {
  cedulaLookupTimeouts.forEach((timeout) => clearTimeout(timeout))
  cedulaLookupTimeouts.clear()
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col">
    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
      class="mb-4"
    />

    <div
      v-if="loadingTemplates"
      class="flex min-h-0 flex-1 items-center justify-center rounded-[32px] border border-default bg-default p-8 shadow-sm"
    >
      <div class="grid gap-4">
        <USkeleton class="h-8 w-64" />
        <USkeleton class="h-5 w-full max-w-2xl" />
        <USkeleton class="h-40 w-full rounded-3xl" />
      </div>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col">
      <div class="sticky top-0 z-20 rounded-[34px] border border-white/45 bg-default/64 px-5 py-5 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.5)] backdrop-blur-3xl backdrop-brightness-105 backdrop-saturate-150 lg:px-8">
        <div class="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <h2 class="text-2xl font-semibold text-highlighted">{{ props.title }}</h2>
            <p class="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">{{ props.eyebrow }}</p>
            <p class="mt-2 text-sm text-muted">{{ props.description }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3 2xl:justify-end">
            <div class="text-left 2xl:text-right">
              <p class="text-sm text-muted">{{ stepSummary.title }}</p>
              <p class="text-xs text-toned">
                {{ plantillaSeleccionada?.title ?? 'Sin trámite seleccionado' }}
              </p>
            </div>

            <UButton :to="props.backTo" color="neutral" variant="outline">
              {{ props.backLabel }}
            </UButton>

            <UButton
              v-if="builderStep !== 'setup'"
              color="neutral"
              variant="ghost"
              leading-icon="i-lucide-arrow-left"
              @click="irAlPasoAnterior"
            >
              Anterior
            </UButton>

            <UButton
              v-if="builderStep !== 'preview'"
              trailing-icon="i-lucide-arrow-right"
              @click="irAlPasoSiguiente"
            >
              Continuar
            </UButton>

            <UButton
              v-else
              :loading="submitting"
              @click="void enviarDocumento()"
            >
              {{ submitting ? props.submitLoadingLabel : props.submitLabel }}
            </UButton>
          </div>
        </div>
      </div>

      <div class="grid flex-1 gap-5 pt-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside class="self-start xl:sticky xl:top-5">
          <UCard class="rounded-[30px] border-white/50 bg-default/80 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div class="grid gap-5">
              <div>
                <p class="text-xs font-medium uppercase tracking-[0.22em] text-primary/80">Flujo del documento</p>
                <h3 class="mt-2 text-lg font-semibold text-highlighted">{{ stepSummary.title }}</h3>
                <p class="mt-2 text-sm text-muted">{{ stepSummary.description }}</p>
              </div>

              <UStepper
                v-model="builderStep"
                orientation="vertical"
                size="lg"
                :linear="false"
                value-key="value"
                :items="builderStepItems"
                class="w-full"
              />

              <div class="rounded-[1.4rem] border border-default/70 bg-elevated/60 px-4 py-4">
                <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Resumen rápido</p>
                <div class="mt-3 grid gap-2 text-sm text-muted">
                  <p>Trámite: <span class="text-highlighted">{{ plantillaSeleccionada?.title ?? 'Pendiente' }}</span></p>
                  <p v-if="ticketMetaEnabled">Prioridad: <span class="text-highlighted">{{ opcionesPrioridad.find(item => item.value === prioridad)?.label ?? 'Normal' }}</span></p>
                  <p>Campos: <span class="text-highlighted">{{ camposFormulario.length }}</span></p>
                  <p v-if="attachmentsEnabled">Adjuntos: <span class="text-highlighted">{{ archivosAdjuntos.length }}</span></p>
                </div>
              </div>

              <UAlert
                v-if="props.initialRejectionReason"
                color="error"
                variant="soft"
                title="Motivo del rechazo"
                :description="props.initialRejectionReason"
              />
            </div>
          </UCard>
        </aside>

        <section class="grid gap-5">
          <UCard v-if="!plantillas.length && !templateSelectionLocked">
            <div class="grid gap-3">
              <p class="font-medium text-highlighted">No hay plantillas activas disponibles</p>
              <p class="text-sm text-muted">
                Primero hay que activar o crear una plantilla en el módulo de administración para poder generar un documento.
              </p>
              <div>
                <UButton :to="props.backTo" color="neutral" variant="outline">
                  {{ props.backLabel }}
                </UButton>
              </div>
            </div>
          </UCard>

          <template v-else>
            <UCard v-if="builderStep === 'setup'">
              <div class="grid gap-5">
                <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <UFormField label="Tipo de trámite" required>
                    <USelect
                      v-model="tramiteSeleccionadoId"
                      placeholder="Seleccioná un trámite"
                      value-key="value"
                      :items="opcionesTramite"
                      :disabled="templateSelectionLocked"
                    />
                  </UFormField>

                  <UAlert
                    v-if="plantillaSeleccionada"
                    color="success"
                    variant="soft"
                    title="Trámite seleccionado"
                    :description="plantillaSeleccionada.title"
                  />
                </div>

                <UAlert
                  v-if="props.initialRejectionReason"
                  color="error"
                  variant="soft"
                  title="Motivo de la observación"
                  :description="props.initialRejectionReason"
                />

                <div v-if="ticketMetaEnabled" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <UFormField label="Descripción adicional">
                    <UTextarea
                      v-model="descripcionAdicional"
                      placeholder="Agregá contexto, dudas o instrucciones para el abogado"
                      :rows="4"
                    />
                  </UFormField>

                  <UFormField label="Prioridad">
                    <USelect
                      v-model="prioridad"
                      value-key="value"
                      :items="opcionesPrioridad"
                    />
                  </UFormField>
                </div>

                <UAlert
                  color="neutral"
                  variant="soft"
                  title="Cada trámite puede pedir datos distintos"
                  description="En el siguiente paso vas a ver solo los campos configurados para la plantilla elegida."
                />
              </div>
            </UCard>

            <template v-if="builderStep === 'form'">
              <UAlert
                v-if="tramiteSeleccionadoId && !camposFormulario.length"
                color="warning"
                variant="soft"
                title="Plantilla sin campos"
                description="Este trámite no tiene campos configurados aún. Podés continuar si solo necesitás contexto general."
              />

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

              <UCard v-if="attachmentsEnabled">
                <div class="grid gap-4">
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
                </div>
              </UCard>
            </template>

            <UCard v-if="builderStep === 'preview'">
              <template #header>
                <div>
                  <h3 class="font-semibold text-highlighted">Vista previa del documento</h3>
                  <p class="mt-1 text-sm text-muted">Revisá el texto generado y volvé al paso anterior si necesitás corregir algo.</p>
                </div>
              </template>

              <div class="grid gap-5">
                <div class="flex flex-wrap gap-2">
                  <UBadge color="primary" variant="soft">
                    {{ plantillaSeleccionada?.title ?? 'Sin trámite' }}
                  </UBadge>
                  <UBadge
                    v-if="ticketMetaEnabled"
                    color="neutral"
                    variant="outline"
                  >
                    Prioridad: {{ opcionesPrioridad.find(item => item.value === prioridad)?.label ?? 'Normal' }}
                  </UBadge>
                  <UBadge
                    v-if="attachmentsEnabled && archivosAdjuntos.length"
                    color="success"
                    variant="subtle"
                  >
                    {{ archivosAdjuntos.length }} adjunto(s)
                  </UBadge>
                </div>

                <UAlert
                  color="neutral"
                  variant="soft"
                  title="Podés volver a editar"
                  description="La vista previa no envía el documento todavía. Solo cuando presionés el botón final se guarda y pasa a revisión."
                />

                <div class="rounded-[1.8rem] border border-default/80 bg-default/90 px-5 py-5 shadow-sm">
                  <pre class="whitespace-pre-wrap text-sm leading-7 text-highlighted">{{ previewContent }}</pre>
                </div>
              </div>
            </UCard>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>
