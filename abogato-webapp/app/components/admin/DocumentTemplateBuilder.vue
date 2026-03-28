<script setup lang="ts">
import { nextTick, reactive, watch } from 'vue'
import type { StepperItem } from '@nuxt/ui'
import type { Database } from '~/types/database.types'
import {
  groupTemplateFields,
  isTemplateFieldList,
  normalizeTemplateFields,
  type TemplateField,
  type TemplateFieldType,
  type TemplateFieldWidth,
} from '~~/shared/utils/document-template-fields'

const props = defineProps<{
  templateId?: string | null
}>()

const supabase = useSupabaseClient()
const { cargarPerfil } = useUsuario()

type Template = {
  id: string
  title: string
  content: string
  fields: TemplateField[]
  servicio_id: number | null
}

type TemplateRow = Database['public']['Tables']['document_templates']['Row']
type PaletteKind = TemplateFieldType | 'section' | 'person_block'
type BuilderField = TemplateField & { id: string }
type BuilderStepId = 'form' | 'document'
type BuilderSection = {
  id: string
  title: string
  description: string
  fields: BuilderField[]
}
type PaletteItem = {
  kind: PaletteKind
  label: string
  description: string
  icon: string
  category: string
}
type AvailablePlaceholder = {
  token: string
  label: string
  key: string
  source: string
}
type AvailablePlaceholderGroup = {
  id: string
  title: string
  description: string
  items: AvailablePlaceholder[]
}

const fieldTypeLabels: Record<TemplateFieldType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  boolean: 'Sí / No',
}

const fieldTypePlaceholders: Record<TemplateFieldType, string> = {
  text: 'Escribí el dato que necesitás solicitar',
  textarea: 'Agregá una respuesta más detallada',
  number: 'Ingresá un valor numérico',
  date: 'Seleccioná una fecha',
  boolean: 'Elegí una opción',
}

const fieldTypeDefaults: Record<TemplateFieldType, { label: string, key: string, width: TemplateFieldWidth }> = {
  text: { label: 'Campo de texto', key: 'campo_texto', width: 'half' },
  textarea: { label: 'Campo descriptivo', key: 'campo_descriptivo', width: 'full' },
  number: { label: 'Campo numérico', key: 'campo_numerico', width: 'half' },
  date: { label: 'Fecha', key: 'fecha', width: 'half' },
  boolean: { label: 'Confirmación', key: 'confirmacion', width: 'half' },
}

const paletteItems: PaletteItem[] = [
  {
    kind: 'section',
    label: 'Sections',
    description: 'Creá un bloque para agrupar campos y ordenar el formulario.',
    icon: 'i-lucide-layout-panel-top',
    category: 'Layout Elements',
  },
  {
    kind: 'person_block',
    label: 'Nombre | Cédula',
    description: 'Agregá una sección de persona con cédula enlazada al padrón automáticamente.',
    icon: 'i-lucide-id-card',
    category: 'Layout Elements',
  },
  {
    kind: 'text',
    label: 'Single line',
    description: 'Ideal para nombres, identificaciones o datos breves.',
    icon: 'i-lucide-type',
    category: 'Text Elements',
  },
  {
    kind: 'textarea',
    label: 'Multiline',
    description: 'Para descripciones amplias, notas o instrucciones.',
    icon: 'i-lucide-align-left',
    category: 'Text Elements',
  },
  {
    kind: 'number',
    label: 'Number',
    description: 'Monto, edad, cantidad o cualquier valor numérico.',
    icon: 'i-lucide-hash',
    category: 'Text Elements',
  },
  {
    kind: 'date',
    label: 'Date',
    description: 'Solicitá fechas puntuales con un input nativo.',
    icon: 'i-lucide-calendar-days',
    category: 'Date Elements',
  },
  {
    kind: 'boolean',
    label: 'Yes / No',
    description: 'Mostrá una decisión binaria con opciones claras.',
    icon: 'i-lucide-circle-dot',
    category: 'Multi Elements',
  },
]

const systemPlaceholders = [
  { key: 'nombre_notario', label: 'Nombre del abogado o notario asignado' },
  { key: 'direccion_notario', label: 'Dirección de la oficina del abogado o notario' },
]

const loading = ref(false)
const loadingTemplate = ref(false)
const errorMsg = ref('')
const paletteQuery = ref('')
const draggedPaletteKind = ref<PaletteKind | null>(null)
const activeSectionId = ref('')
const selectedFieldId = ref('')
const templateEnEdicionServicioId = ref<number | null>(null)

const templateEnEdicionId = computed(() => props.templateId ?? null)
const isEditing = computed(() => Boolean(templateEnEdicionId.value))

function crearIdLocal(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizarTextoPlano(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function crearSeccion(index: number): BuilderSection {
  return {
    id: crearIdLocal('section'),
    title: `Sección ${index}`,
    description: '',
    fields: [],
  }
}

function crearFormularioVacio() {
  const primeraSeccion = crearSeccion(1)

  return {
    title: '',
    content: '',
    sections: [primeraSeccion] as BuilderSection[],
  }
}

const form = ref(crearFormularioVacio())
const documentContentTextarea = ref<HTMLTextAreaElement | null>(null)
const documentContentSelectionStart = ref(0)
const documentContentSelectionEnd = ref(0)
const hasDocumentContentCursor = ref(false)
const builderStep = ref<BuilderStepId>('form')
const builderHeaderCollapsed = ref(false)
const panelCollapsed = reactive({
  components: false,
  analytics: false,
  activeSection: false,
  fieldEditor: false,
})
const sectionCollapsed = reactive<Record<string, boolean>>({})
const componentGroupCollapsed = reactive<Record<string, boolean>>({})
const placeholderGroupCollapsed = reactive<Record<string, boolean>>({})

function obtenerClavesUsadas(ignoreFieldId = '') {
  return new Set(
    form.value.sections.flatMap(section =>
      section.fields
        .filter(field => field.id !== ignoreFieldId)
        .map(field => field.key.trim())
        .filter(Boolean)
    )
  )
}

function crearClaveUnica(base: string, ignoreFieldId = '') {
  const normalized = normalizarTextoPlano(base) || 'campo'
  const used = obtenerClavesUsadas(ignoreFieldId)

  if (!used.has(normalized)) return normalized

  let counter = 2
  while (used.has(`${normalized}_${counter}`)) {
    counter += 1
  }

  return `${normalized}_${counter}`
}

function crearCampo(type: TemplateFieldType): BuilderField {
  const defaults = fieldTypeDefaults[type]

  return {
    id: crearIdLocal('field'),
    key: crearClaveUnica(defaults.key),
    label: defaults.label,
    type,
    required: true,
    placeholder: fieldTypePlaceholders[type],
    help: '',
    width: defaults.width,
    section_id: '',
    section_title: '',
    section_description: '',
    padron_source: false,
    padron_source_key: '',
    padron_value: undefined,
  }
}

function crearCampoDesdePlantilla(field: TemplateField): BuilderField {
  return {
    ...field,
    id: crearIdLocal('field'),
  }
}

function obtenerSiguienteIndiceBloquePersona() {
  const usedIndices = new Set<number>()

  form.value.sections
    .flatMap(section => section.fields)
    .forEach((field) => {
      const match = field.key.match(/^(cedula|nombre|primer_apellido|segundo_apellido)_persona_(\d+)(?:_|$)/)
      if (!match) return

      usedIndices.add(Number(match[2]))
    })

  let nextIndex = 1
  while (usedIndices.has(nextIndex)) {
    nextIndex += 1
  }

  return nextIndex
}

function crearBloquePersona(index: number): BuilderSection {
  const section = {
    id: crearIdLocal('section'),
    title: `Nombre | Cédula ${index}`,
    description: 'Bloque de datos personales enlazado al padrón para autocompletar la información.',
    fields: [] as BuilderField[],
  }

  const cedulaKey = crearClaveUnica(`cedula_persona_${index}`)

  section.fields = [
    {
      id: crearIdLocal('field'),
      key: cedulaKey,
      label: 'Cédula',
      type: 'text',
      required: true,
      placeholder: 'Ingresá la cédula sin espacios ni guiones',
      help: 'Al completar una cédula válida, el sistema buscará los datos en el padrón.',
      width: 'half',
      section_id: section.id,
      section_title: section.title,
      section_description: section.description,
      padron_source: true,
      padron_source_key: '',
      padron_value: undefined,
    },
    {
      id: crearIdLocal('field'),
      key: crearClaveUnica(`nombre_persona_${index}`),
      label: 'Nombre',
      type: 'text',
      required: true,
      placeholder: 'Se completa automáticamente desde el padrón',
      help: 'Campo completado a partir de la cédula.',
      width: 'half',
      section_id: section.id,
      section_title: section.title,
      section_description: section.description,
      padron_source: false,
      padron_source_key: cedulaKey,
      padron_value: 'nombre',
    },
    {
      id: crearIdLocal('field'),
      key: crearClaveUnica(`primer_apellido_persona_${index}`),
      label: 'Primer apellido',
      type: 'text',
      required: true,
      placeholder: 'Se completa automáticamente desde el padrón',
      help: 'Campo completado a partir de la cédula.',
      width: 'half',
      section_id: section.id,
      section_title: section.title,
      section_description: section.description,
      padron_source: false,
      padron_source_key: cedulaKey,
      padron_value: 'apellido_1',
    },
    {
      id: crearIdLocal('field'),
      key: crearClaveUnica(`segundo_apellido_persona_${index}`),
      label: 'Segundo apellido',
      type: 'text',
      required: false,
      placeholder: 'Se completa automáticamente desde el padrón',
      help: 'Campo completado a partir de la cédula cuando exista en el padrón.',
      width: 'half',
      section_id: section.id,
      section_title: section.title,
      section_description: section.description,
      padron_source: false,
      padron_source_key: cedulaKey,
      padron_value: 'apellido_2',
    },
  ]

  return section
}

function crearSeccionesDesdePlantilla(fields: TemplateField[]) {
  const sections = groupTemplateFields(fields)

  if (!sections.length) {
    return [crearSeccion(1)]
  }

  return sections.map((section, index) => ({
    id: section.id === 'default' ? crearIdLocal(`section-${index + 1}`) : section.id,
    title: section.title || `Sección ${index + 1}`,
    description: section.description || '',
    fields: section.fields.map(crearCampoDesdePlantilla),
  }))
}

function syncSectionCollapsedState(defaultCollapsed = false) {
  const ids = new Set(form.value.sections.map(section => section.id))

  Object.keys(sectionCollapsed).forEach((id) => {
    if (!ids.has(id)) {
      delete sectionCollapsed[id]
    }
  })

  form.value.sections.forEach((section) => {
    if (!(section.id in sectionCollapsed)) {
      sectionCollapsed[section.id] = defaultCollapsed
    }
  })
}

function toggleSectionCollapse(sectionId: string) {
  sectionCollapsed[sectionId] = !sectionCollapsed[sectionId]
}

function toggleComponentGroup(title: string) {
  componentGroupCollapsed[title] = !componentGroupCollapsed[title]
}

function togglePlaceholderGroup(groupId: string) {
  placeholderGroupCollapsed[groupId] = !placeholderGroupCollapsed[groupId]
}

function normalizarPlantilla(row: TemplateRow): Template {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    fields: isTemplateFieldList(row.fields) ? normalizeTemplateFields(row.fields) : [],
    servicio_id: row.servicio_id ?? null,
  }
}

const activeSection = computed(() =>
  form.value.sections.find(section => section.id === activeSectionId.value) ?? form.value.sections[0] ?? null
)

const selectedFieldLocation = computed(() => {
  for (const section of form.value.sections) {
    const index = section.fields.findIndex(field => field.id === selectedFieldId.value)
    if (index >= 0) {
      return {
        section,
        index,
        field: section.fields[index],
      }
    }
  }

  return null
})

const selectedField = computed(() => selectedFieldLocation.value?.field ?? null)

const filteredPaletteItems = computed(() => {
  const query = paletteQuery.value.trim().toLowerCase()
  if (!query) return paletteItems

  return paletteItems.filter(item =>
    [item.label, item.description, item.category].some(value => value.toLowerCase().includes(query))
  )
})

const paletteGroups = computed(() => {
  const groups = new Map<string, PaletteItem[]>()

  filteredPaletteItems.value.forEach((item) => {
    const current = groups.get(item.category) ?? []
    current.push(item)
    groups.set(item.category, current)
  })

  return Array.from(groups.entries()).map(([title, items]) => ({ title, items }))
})

function flattenSections(sections: BuilderSection[]): TemplateField[] {
  return sections.flatMap(section =>
    section.fields.map(field => ({
      key: field.key.trim(),
      label: field.label.trim(),
      type: field.type,
      required: field.required ?? true,
      placeholder: field.placeholder?.trim() ?? '',
      help: field.help?.trim() ?? '',
      width: field.width === 'full' ? 'full' : 'half',
      section_id: section.id,
      section_title: section.title.trim(),
      section_description: section.description.trim(),
      padron_source: field.padron_source ?? false,
      padron_source_key: field.padron_source ? '' : field.padron_source_key?.trim() ?? '',
      padron_value: field.padron_source ? undefined : field.padron_value,
    }))
  )
}

const flattenedFields = computed(() => flattenSections(form.value.sections))

const analytics = computed(() => {
  const fields = flattenedFields.value
  const byType = fields.reduce<Record<TemplateFieldType, number>>((acc, field) => {
    acc[field.type] += 1
    return acc
  }, {
    text: 0,
    textarea: 0,
    number: 0,
    date: 0,
    boolean: 0,
  })

  return {
    sections: form.value.sections.length,
    fields: fields.length,
    required: fields.filter(field => field.required ?? true).length,
    fullWidth: fields.filter(field => field.width === 'full').length,
    placeholders: fields.length + systemPlaceholders.length,
    byType,
  }
})

const builderStepItems = computed<StepperItem[]>(() => [
  {
    value: 'form',
    title: 'Formulario',
    description: analytics.value.fields
      ? `${analytics.value.sections} secciones · ${analytics.value.fields} campos`
      : 'Definí el título, las secciones y los campos del trámite.',
    icon: 'i-lucide-layout-template',
  },
  {
    value: 'document',
    title: 'Contenido',
    description: form.value.content.trim()
      ? 'Texto base listo para revisar y guardar.'
      : `${analytics.value.placeholders} placeholders disponibles para insertar.`,
    icon: 'i-lucide-file-text',
  },
])

const isFormStep = computed(() => builderStep.value === 'form')
const isDocumentStep = computed(() => builderStep.value === 'document')

const builderStepSummary = computed(() => (
  isFormStep.value
    ? {
        eyebrow: 'Paso 1 de 2',
        title: 'Diseño del formulario',
        description: 'Armá la estructura visual del trámite, agregá secciones y definí qué datos se le van a pedir al cliente.',
      }
    : {
        eyebrow: 'Paso 2 de 2',
        title: 'Contenido del documento',
        description: 'Redactá el texto base del documento y usá los placeholders del formulario para insertar datos automáticamente.',
      }
))

const availablePlaceholders = computed<AvailablePlaceholder[]>(() => [
  ...systemPlaceholders.map(item => ({
    token: `{{${item.key}}}`,
    label: item.label,
    key: item.key,
    source: 'Variables del sistema',
  })),
  ...flattenedFields.value.map(field => ({
    token: `{{${field.key}}}`,
    label: field.label,
    key: field.key,
    source: field.section_title?.trim() || 'Formulario general',
  })),
])

const availablePlaceholderGroups = computed<AvailablePlaceholderGroup[]>(() => {
  const groups: AvailablePlaceholderGroup[] = [{
    id: 'system',
    title: 'Variables del sistema',
    description: 'Datos globales como el nombre o la dirección del abogado/notario.',
    items: systemPlaceholders.map(item => ({
      token: `{{${item.key}}}`,
      label: item.label,
      key: item.key,
      source: 'Variables del sistema',
    })),
  }]

  form.value.sections.forEach((section, index) => {
    if (!section.fields.length) return

    groups.push({
      id: section.id,
      title: section.title.trim() || `Sección ${index + 1}`,
      description: section.description.trim(),
      items: section.fields.map(field => ({
        token: `{{${field.key}}}`,
        label: field.label,
        key: field.key,
        source: section.title.trim() || `Sección ${index + 1}`,
      })),
    })
  })

  return groups
})

const availablePlaceholderKeys = computed(() => new Set(availablePlaceholders.value.map(item => item.key)))

function normalizarContenidoDocumento(content: string) {
  return content.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, '{{$1}}')
}

function recordarCursorContenido() {
  const textarea = documentContentTextarea.value
  if (!textarea) return

  hasDocumentContentCursor.value = true
  documentContentSelectionStart.value = textarea.selectionStart ?? form.value.content.length
  documentContentSelectionEnd.value = textarea.selectionEnd ?? documentContentSelectionStart.value
}

function actualizarContenidoDocumento(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  form.value.content = normalizarContenidoDocumento(target?.value ?? '')

  if (!target) return

  documentContentSelectionStart.value = target.selectionStart ?? form.value.content.length
  documentContentSelectionEnd.value = target.selectionEnd ?? documentContentSelectionStart.value
}

function validarContenidoDocumento(content: string) {
  const normalizedContent = normalizarContenidoDocumento(content)
  const placeholders = normalizedContent.match(/\{\{[^{}]*\}\}/g) ?? []

  for (const placeholder of placeholders) {
    const key = placeholder.slice(2, -2).trim()

    if (!/^[a-z0-9_]+$/.test(key)) {
      return `El placeholder "${placeholder}" no tiene un formato válido. Usá solo variables sugeridas por el builder.`
    }

    if (!availablePlaceholderKeys.value.has(key)) {
      return `El placeholder "${placeholder}" no existe o quedó desactualizado. Volvé a insertarlo desde la lista superior.`
    }
  }

  const remainingContent = normalizedContent.replace(/\{\{[^{}]*\}\}/g, '')

  if (remainingContent.includes('{{') || remainingContent.includes('}}')) {
    return 'Hay un placeholder incompleto o mal cerrado en el contenido del documento.'
  }

  return ''
}

const documentContentError = computed(() => {
  const content = form.value.content.trim()
  if (!content) return ''

  return validarContenidoDocumento(content)
})

function resetBuilder() {
  const nextForm = crearFormularioVacio()
  form.value = nextForm
  syncSectionCollapsedState(false)
  builderStep.value = 'form'
  builderHeaderCollapsed.value = false
  panelCollapsed.components = false
  panelCollapsed.analytics = false
  panelCollapsed.activeSection = false
  panelCollapsed.fieldEditor = false
  activeSectionId.value = nextForm.sections[0]?.id ?? ''
  selectedFieldId.value = ''
  hasDocumentContentCursor.value = false
  documentContentSelectionStart.value = 0
  documentContentSelectionEnd.value = 0
  paletteQuery.value = ''
  draggedPaletteKind.value = null
}

async function volverAlListado() {
  await navigateTo('/admin/plantillas')
}

async function cargarPlantillaParaEdicion() {
  const templateId = templateEnEdicionId.value
  if (!templateId) {
    resetBuilder()
    templateEnEdicionServicioId.value = null
    return
  }

  loadingTemplate.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle()

  loadingTemplate.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  if (!data) {
    errorMsg.value = 'No se encontró la plantilla solicitada.'
    return
  }

  const template = normalizarPlantilla(data)
  templateEnEdicionServicioId.value = template.servicio_id
  form.value = {
    title: template.title,
    content: template.content,
    sections: crearSeccionesDesdePlantilla(template.fields),
  }
  syncSectionCollapsedState(false)
  builderStep.value = 'form'
  builderHeaderCollapsed.value = false
  panelCollapsed.components = false
  panelCollapsed.analytics = false
  panelCollapsed.activeSection = false
  panelCollapsed.fieldEditor = false
  hasDocumentContentCursor.value = false
  documentContentSelectionStart.value = template.content.length
  documentContentSelectionEnd.value = template.content.length
  activeSectionId.value = form.value.sections[0]?.id ?? ''
  selectedFieldId.value = ''
  paletteQuery.value = ''
  draggedPaletteKind.value = null
}

function seleccionarSeccion(sectionId: string) {
  activeSectionId.value = sectionId
  selectedFieldId.value = ''
}

function seleccionarCampo(sectionId: string, fieldId: string) {
  activeSectionId.value = sectionId
  selectedFieldId.value = fieldId
}

async function agregarSeccion(afterSectionId?: string) {
  const section = crearSeccion(form.value.sections.length + 1)
  const nextSections = [...form.value.sections]
  const index = afterSectionId
    ? nextSections.findIndex(item => item.id === afterSectionId)
    : -1

  if (index >= 0) {
    nextSections.splice(index + 1, 0, section)
  }
  else {
    nextSections.push(section)
  }

  form.value.sections = nextSections
  syncSectionCollapsedState(false)
  sectionCollapsed[section.id] = false
  activeSectionId.value = section.id
  selectedFieldId.value = ''

  await nextTick()
  document
    .querySelector<HTMLElement>(`[data-section-id="${section.id}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function eliminarSeccion(sectionId: string) {
  if (form.value.sections.length === 1) return

  const section = form.value.sections.find(item => item.id === sectionId)
  if (!section) return

  if (section.fields.length && !confirm('Esta sección tiene campos. ¿Querés eliminarla igual?')) {
    return
  }

  form.value.sections = form.value.sections.filter(item => item.id !== sectionId)
  delete sectionCollapsed[sectionId]

  if (section.fields.some(field => field.id === selectedFieldId.value)) {
    selectedFieldId.value = ''
  }

  if (activeSectionId.value === sectionId) {
    activeSectionId.value = form.value.sections[0]?.id ?? ''
    selectedFieldId.value = ''
  }
}

function moverSeccion(sectionId: string, direction: -1 | 1) {
  const index = form.value.sections.findIndex(section => section.id === sectionId)
  const targetIndex = index + direction

  if (index < 0 || targetIndex < 0 || targetIndex >= form.value.sections.length) return

  const next = [...form.value.sections]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  form.value.sections = next
}

async function agregarBloquePersona(afterSectionId?: string) {
  const personIndex = obtenerSiguienteIndiceBloquePersona()
  const section = crearBloquePersona(personIndex)
  const nextSections = [...form.value.sections]
  const index = afterSectionId
    ? nextSections.findIndex(item => item.id === afterSectionId)
    : -1

  if (index >= 0) {
    nextSections.splice(index + 1, 0, section)
  }
  else {
    nextSections.push(section)
  }

  form.value.sections = nextSections
  syncSectionCollapsedState(false)
  sectionCollapsed[section.id] = false
  activeSectionId.value = section.id
  selectedFieldId.value = section.fields[0]?.id ?? ''

  await nextTick()
  document
    .querySelector<HTMLElement>(`[data-section-id="${section.id}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function asegurarSeccionBase() {
  if (form.value.sections.length) return form.value.sections

  const section = crearSeccion(1)
  form.value.sections = [section]
  activeSectionId.value = section.id
  return form.value.sections
}

async function agregarComponente(kind: PaletteKind, targetSectionId = activeSectionId.value || form.value.sections[0]?.id) {
  errorMsg.value = ''

  if (kind === 'section') {
    await agregarSeccion()
    return
  }

  if (kind === 'person_block') {
    await agregarBloquePersona()
    return
  }

  const sections = asegurarSeccionBase()
  const resolvedSectionId = sections.some(item => item.id === targetSectionId)
    ? targetSectionId
    : sections[0]?.id

  if (!resolvedSectionId) return

  const field = crearCampo(kind)
  form.value.sections = sections.map(section => (
    section.id === resolvedSectionId
      ? { ...section, fields: [...section.fields, field] }
      : section
  ))

  activeSectionId.value = resolvedSectionId
  selectedFieldId.value = field.id
}

function duplicarCampo(sectionId: string, fieldId: string) {
  const section = form.value.sections.find(item => item.id === sectionId)
  if (!section) return

  const index = section.fields.findIndex(field => field.id === fieldId)
  if (index < 0) return

  const source = section.fields[index]
  const duplicate: BuilderField = {
    ...source,
    id: crearIdLocal('field'),
    key: crearClaveUnica(`${source.key}_copia`, source.id),
    label: `${source.label} copia`,
  }

  form.value.sections = form.value.sections.map(item => (
    item.id === sectionId
      ? {
          ...item,
          fields: [
            ...item.fields.slice(0, index + 1),
            duplicate,
            ...item.fields.slice(index + 1),
          ],
        }
      : item
  ))

  selectedFieldId.value = duplicate.id
  activeSectionId.value = sectionId
}

function eliminarCampo(sectionId: string, fieldId: string) {
  const removedField = form.value.sections
    .flatMap(section => section.fields)
    .find(field => field.id === fieldId)
  const removedKey = removedField?.key ?? ''

  form.value.sections = form.value.sections.map(section => ({
    ...section,
    fields: section.fields
      .filter(field => !(section.id === sectionId && field.id === fieldId))
      .map((field) => {
        if (removedKey && field.padron_source_key === removedKey) {
          return {
            ...field,
            padron_source_key: '',
            padron_value: undefined,
          }
        }

        return field
      }),
  }))

  if (selectedFieldId.value === fieldId) {
    selectedFieldId.value = ''
  }
}

function moverCampo(sectionId: string, fieldId: string, direction: -1 | 1) {
  const section = form.value.sections.find(item => item.id === sectionId)
  if (!section) return

  const index = section.fields.findIndex(field => field.id === fieldId)
  const targetIndex = index + direction

  if (index < 0 || targetIndex < 0 || targetIndex >= section.fields.length) return

  const nextFields = [...section.fields]
  const [moved] = nextFields.splice(index, 1)
  nextFields.splice(targetIndex, 0, moved)
  form.value.sections = form.value.sections.map(item => (
    item.id === sectionId
      ? { ...item, fields: nextFields }
      : item
  ))
}

function actualizarCampoSeleccionado(patch: Partial<BuilderField>) {
  const location = selectedFieldLocation.value
  if (!location) return

  const previousField = location.field
  const nextField: BuilderField = {
    ...previousField,
    ...patch,
  }

  nextField.padron_source = Boolean(nextField.padron_source)

  if (nextField.padron_source) {
    nextField.padron_source_key = ''
    nextField.padron_value = undefined
  }
  else {
    nextField.padron_source_key = nextField.padron_source_key?.trim() ?? ''
    if (!nextField.padron_source_key) {
      nextField.padron_value = undefined
    }
  }

  form.value.sections = form.value.sections.map(section => ({
    ...section,
    fields: section.fields.map((field) => {
      if (field.id === previousField.id) {
        return nextField
      }

      if (previousField.key !== nextField.key && field.padron_source_key === previousField.key) {
        return {
          ...field,
          padron_source_key: nextField.key,
        }
      }

      if (previousField.padron_source && !nextField.padron_source && field.padron_source_key === previousField.key) {
        return {
          ...field,
          padron_source_key: '',
          padron_value: undefined,
        }
      }

      return field
    }),
  }))
}

function regenerarClaveSeleccionada() {
  const location = selectedFieldLocation.value
  if (!location) return

  actualizarCampoSeleccionado({
    key: crearClaveUnica(location.field.label || location.field.key || 'campo', location.field.id),
  })
}

function actualizarAnchoSeleccionado(value: string | number) {
  actualizarCampoSeleccionado({
    width: value === 'full' ? 'full' : 'half',
  })
}

async function insertarPlaceholder(key: string) {
  const token = `{{${key}}}`
  const current = form.value.content
  const start = hasDocumentContentCursor.value ? documentContentSelectionStart.value : current.length
  const end = hasDocumentContentCursor.value ? documentContentSelectionEnd.value : current.length
  const nextContent = `${current.slice(0, start)}${token}${current.slice(end)}`
  const nextCursor = start + token.length

  form.value.content = normalizarContenidoDocumento(nextContent)
  hasDocumentContentCursor.value = true
  documentContentSelectionStart.value = nextCursor
  documentContentSelectionEnd.value = nextCursor

  await nextTick()
  documentContentTextarea.value?.focus()
  documentContentTextarea.value?.setSelectionRange(nextCursor, nextCursor)
}

function obtenerKindDesdeDrag(event?: DragEvent) {
  const fromTransfer = event?.dataTransfer?.getData('application/x-template-kind')
  if (fromTransfer) return fromTransfer as PaletteKind
  return draggedPaletteKind.value
}

function iniciarDrag(kind: PaletteKind, event?: DragEvent) {
  draggedPaletteKind.value = kind
  event?.dataTransfer?.setData('application/x-template-kind', kind)
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function finalizarDrag() {
  draggedPaletteKind.value = null
}

async function soltarEnCanvas(event?: DragEvent) {
  const kind = obtenerKindDesdeDrag(event)
  if (!kind) return

  await agregarComponente(kind)
  draggedPaletteKind.value = null
}

async function soltarEnSeccion(sectionId: string, event?: DragEvent) {
  const kind = obtenerKindDesdeDrag(event)
  if (!kind) return

  if (kind === 'section') {
    await agregarSeccion(sectionId)
  }
  else if (kind === 'person_block') {
    await agregarBloquePersona(sectionId)
  }
  else {
    await agregarComponente(kind, sectionId)
  }

  draggedPaletteKind.value = null
}

function validarBuilder() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    return 'Título y contenido del documento son obligatorios.'
  }

  const contentError = validarContenidoDocumento(form.value.content)
  if (contentError) {
    return contentError
  }

  const fields = flattenedFields.value

  if (!fields.length) {
    return 'Agregá al menos un campo al formulario antes de guardar.'
  }

  const missingField = fields.find(field => !field.label || !field.key)
  if (missingField) {
    return 'Todos los campos deben tener etiqueta y clave.'
  }

  const usedKeys = new Set<string>()
  for (const field of fields) {
    if (usedKeys.has(field.key)) {
      return `La clave "${field.key}" está repetida. Cada placeholder debe ser único.`
    }
    usedKeys.add(field.key)
  }

  const padronSources = new Set(
    fields
      .filter(field => field.padron_source)
      .map(field => field.key)
  )

  for (const field of fields) {
    const sourceKey = field.padron_source_key?.trim()
    if (!sourceKey) continue

    if (!padronSources.has(sourceKey)) {
      return `El campo "${field.label}" está vinculado a una cédula que ya no existe o no está marcada para consultar el padrón.`
    }

    if (!field.padron_value) {
      return `Elegí qué dato del padrón completa el campo "${field.label}".`
    }
  }

  return ''
}

async function guardarPlantilla() {
  form.value.content = normalizarContenidoDocumento(form.value.content)

  const validationError = validarBuilder()
  if (validationError) {
    errorMsg.value = validationError
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { data: { user } } = await supabase.auth.getUser()

  const payload = {
    title: form.value.title.trim(),
    content: form.value.content.trim(),
    servicio_id: templateEnEdicionServicioId.value,
    fields: flattenedFields.value,
  }

  const { error } = isEditing.value
    ? await supabase
        .from('document_templates')
        .update(payload)
        .eq('id', templateEnEdicionId.value!)
    : await supabase
        .from('document_templates')
        .insert([{
          ...payload,
          created_by: user?.id,
        }])

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await navigateTo({
    path: '/admin/plantillas',
    query: { status: isEditing.value ? 'updated' : 'created' },
  })
}

function irAlPasoSiguiente() {
  if (builderStep.value === 'form') {
    builderStep.value = 'document'
  }
}

function irAlPasoAnterior() {
  if (builderStep.value === 'document') {
    builderStep.value = 'form'
  }
}

function togglePanel(panel: keyof typeof panelCollapsed) {
  panelCollapsed[panel] = !panelCollapsed[panel]
}

watch(builderStep, async (step) => {
  errorMsg.value = ''

  if (step !== 'document') return

  await nextTick()
  documentContentTextarea.value?.focus()
})

onMounted(async () => {
  await cargarPerfil()
  resetBuilder()

  if (isEditing.value) {
    await cargarPlantillaParaEdicion()
  }
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
      v-if="loadingTemplate"
      class="flex min-h-0 flex-1 items-center justify-center rounded-[32px] border border-default bg-default p-8 shadow-sm"
    >
      <div class="grid gap-4">
        <USkeleton class="h-8 w-64" />
        <USkeleton class="h-5 w-full max-w-2xl" />
        <USkeleton class="h-40 w-full rounded-3xl" />
      </div>
    </div>

    <div
      v-else
      class="flex min-h-0 flex-1 flex-col"
    >
      <div
        class="sticky top-0 z-20 rounded-[34px] border border-white/45 bg-default/64 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.5)] backdrop-blur-3xl backdrop-brightness-105 backdrop-saturate-150 lg:px-8 xl:shrink-0"
        :class="builderHeaderCollapsed ? 'px-5 py-3' : 'px-5 py-5'"
      >
        <div v-if="builderHeaderCollapsed" class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 flex-wrap items-center gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              {{ isEditing ? 'Editar plantilla' : 'Crear plantilla' }}
            </h2>
            <UBadge color="primary" variant="soft">
              {{ builderStepSummary.eyebrow }}
            </UBadge>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2">
            <UButton color="neutral" variant="outline" @click="void volverAlListado()">
              Cancelar
            </UButton>

            <UButton
              v-if="isFormStep"
              trailing-icon="i-lucide-arrow-right"
              @click="irAlPasoSiguiente"
            >
              Continuar
            </UButton>

            <UButton v-else :loading="loading" @click="guardarPlantilla">
              {{
                loading
                  ? 'Guardando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Guardar plantilla'
              }}
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              square
              icon="i-lucide-chevron-down"
              @click="builderHeaderCollapsed = false"
            />
          </div>
        </div>

        <div v-else class="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <h2 class="text-2xl font-semibold text-highlighted">
              {{ isEditing ? 'Editar plantilla' : 'Crear plantilla' }}
            </h2>
            <p class="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
              {{ builderStepSummary.eyebrow }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ builderStepSummary.description }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 2xl:justify-end">
            <div class="text-left 2xl:text-right">
              <p class="text-sm text-muted">{{ builderStepSummary.title }}</p>
              <p class="text-xs text-toned">
                {{ analytics.fields }} campos listos para insertar · {{ analytics.placeholders }} placeholders disponibles
              </p>
            </div>

            <UButton color="neutral" variant="outline" @click="void volverAlListado()">
              Cancelar
            </UButton>

            <UButton
              v-if="isFormStep"
              trailing-icon="i-lucide-arrow-right"
              @click="irAlPasoSiguiente"
            >
              Continuar
            </UButton>

            <UButton v-else :loading="loading" @click="guardarPlantilla">
              {{
                loading
                  ? 'Guardando...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Guardar plantilla'
              }}
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              square
              icon="i-lucide-chevron-up"
              @click="builderHeaderCollapsed = true"
            />
          </div>
        </div>
      </div>

      <div class="grid flex-1 gap-5 pt-5 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:min-h-0 2xl:grid-cols-[260px_minmax(0,1fr)_320px] 2xl:overflow-hidden">
        <aside class="self-start 2xl:sticky 2xl:top-5 2xl:min-h-0">
          <div class="flex flex-col gap-4 2xl:h-[calc(100vh-9.5rem)] 2xl:min-h-0">
            <UCard class="rounded-[30px] border-white/50 bg-default/80 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div class="grid gap-5">
                <div>
                  <p class="text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
                    Flujo de creación
                  </p>
                  <h3 class="mt-2 text-lg font-semibold text-highlighted">{{ builderStepSummary.title }}</h3>
                  <p class="mt-2 text-sm text-muted">
                    {{ builderStepSummary.description }}
                  </p>
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
              </div>
            </UCard>

            <UCard
              v-if="isFormStep"
              :ui="{
                header: panelCollapsed.components
                  ? 'px-4 py-3 sm:px-4 sm:py-3'
                  : 'p-4 sm:px-6',
                body: panelCollapsed.components
                  ? 'p-4 sm:p-6'
                  : 'min-h-0 flex flex-1 flex-col p-4 sm:p-6'
              }"
              :class="panelCollapsed.components
                ? '2xl:flex-none'
                : '2xl:min-h-0 2xl:flex 2xl:flex-1 2xl:flex-col 2xl:overflow-hidden'"
            >
              <template #header>
                <div class="flex justify-between gap-3" :class="panelCollapsed.components ? 'items-center' : 'items-start'">
                  <div>
                    <h3
                      class="font-semibold text-highlighted"
                      :class="panelCollapsed.components ? 'text-base' : 'text-lg'"
                    >
                      Componentes
                    </h3>
                    <p v-if="!panelCollapsed.components" class="mt-1 text-sm text-muted">
                      Layout elements, bloques guiados y campos para construir el formulario.
                    </p>
                  </div>

                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                    :icon="panelCollapsed.components ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                    @click="togglePanel('components')"
                  />
                </div>
              </template>

              <UScrollArea
                v-if="!panelCollapsed.components"
                class="min-h-0 2xl:flex-1 2xl:overscroll-contain 2xl:[scrollbar-gutter:stable]"
              >
                <div class="grid gap-4 2xl:pr-1">
                  <UInput
                    v-model="paletteQuery"
                    icon="i-lucide-search"
                    placeholder="Buscar componentes"
                  />

                  <div class="grid gap-5">
                    <div
                      v-for="group in paletteGroups"
                      :key="group.title"
                      class="grid gap-3"
                    >
                      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <div class="flex min-w-0 flex-wrap items-center gap-2">
                          <p class="text-sm font-medium text-muted">{{ group.title }}</p>
                          <UBadge color="neutral" variant="subtle" size="sm">
                            {{ group.items.length }}
                          </UBadge>
                        </div>

                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          square
                          :icon="componentGroupCollapsed[group.title] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                          @click.stop="toggleComponentGroup(group.title)"
                        />
                      </div>

                      <div v-if="componentGroupCollapsed[group.title]" class="rounded-2xl border border-dashed border-default bg-muted/20 px-4 py-3 text-sm text-muted">
                        Grupo minimizado
                      </div>

                      <div v-else class="grid gap-3">
                        <button
                          v-for="item in group.items"
                          :key="item.label"
                          type="button"
                          draggable="true"
                          class="rounded-2xl border border-default bg-default px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5"
                          @click.prevent="void agregarComponente(item.kind)"
                          @dragstart="(event) => iniciarDrag(item.kind, event)"
                          @dragend="finalizarDrag"
                        >
                          <div class="flex items-start gap-3">
                            <div class="rounded-xl bg-primary/10 p-2 text-primary">
                              <UIcon :name="item.icon" class="size-5" />
                            </div>

                            <div class="min-w-0">
                              <p class="font-medium text-highlighted">{{ item.label }}</p>
                              <p class="mt-1 text-sm text-muted">{{ item.description }}</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </UScrollArea>
            </UCard>
          </div>
        </aside>

        <template v-if="isFormStep">
          <div class="grid min-w-0 gap-5 2xl:flex 2xl:h-[calc(100vh-9.5rem)] 2xl:min-h-0 2xl:flex-col">
            <UCard>
                <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <UFormField label="Título de la plantilla" required>
                    <UInput
                      v-model="form.title"
                      placeholder="Ej: Poder generalísimo sin límite de suma"
                    />
                  </UFormField>

                  <div class="rounded-2xl border border-default bg-muted/30 p-4">
                    <p class="text-xs uppercase tracking-wide text-toned">Nombre en trámites</p>
                    <p class="mt-2 font-medium text-highlighted">
                      {{ form.title.trim() || 'Escribí un título para definir el nombre visible.' }}
                    </p>
                    <p class="mt-2 text-sm text-muted">
                      Este título se guarda como `title` y es el nombre que después aparece en la selección de trámites.
                    </p>
                  </div>
                </div>
              </UCard>

            <UCard
              class="2xl:min-h-0 2xl:flex 2xl:flex-1 2xl:flex-col 2xl:overflow-hidden"
              :ui="{ body: 'min-h-0 flex flex-1 flex-col p-4 sm:p-6' }"
            >
                <template #header>
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 class="text-lg font-semibold text-highlighted">Canvas del formulario</h3>
                      <p class="mt-1 text-sm text-muted">
                        Arrastrá componentes desde la izquierda o hacé clic para agregarlos a la sección activa.
                      </p>
                    </div>

                    <div class="flex items-center gap-2">
                      <UBadge color="neutral" variant="subtle">
                        {{ analytics.sections }} secciones
                      </UBadge>
                      <UBadge color="primary" variant="soft">
                        {{ analytics.fields }} campos
                      </UBadge>
                      <UButton color="primary" variant="soft" @click="void agregarBloquePersona()">
                        Agregar nombre | cédula
                      </UButton>
                      <UButton color="neutral" variant="outline" @click="void agregarSeccion()">
                        Agregar sección
                      </UButton>
                    </div>
                  </div>
                </template>

                <UScrollArea
                  class="min-h-0 2xl:flex-1 2xl:overscroll-contain 2xl:[scrollbar-gutter:stable]"
                  @dragover.prevent
                  @drop.prevent="(event) => void soltarEnCanvas(event)"
                >
                  <div class="grid gap-5 2xl:pr-1">
                    <div
                      class="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-sm text-primary"
                      @dragover.prevent
                      @drop.prevent="(event) => void soltarEnCanvas(event)"
                    >
                      Soltá elementos aquí para agregarlos al canvas. Los elementos de layout crean nuevas secciones.
                    </div>

                    <article
                      v-for="(section, sectionIndex) in form.sections"
                      :key="section.id"
                      :data-section-id="section.id"
                      class="rounded-[28px] border transition"
                      :class="[
                        activeSectionId === section.id ? 'border-primary bg-primary/5' : 'border-default bg-default',
                        sectionCollapsed[section.id] ? 'p-4' : 'p-5'
                      ]"
                      @click="seleccionarSeccion(section.id)"
                      @dragover.prevent
                      @drop.prevent="(event) => void soltarEnSeccion(section.id, event)"
                    >
                      <div
                        class="flex flex-wrap justify-between gap-4"
                        :class="sectionCollapsed[section.id] ? 'items-center' : 'items-start'"
                      >
                        <div class="min-w-0 flex-1">
                          <div v-if="sectionCollapsed[section.id]" class="flex flex-wrap items-center gap-2">
                            <p class="truncate font-semibold text-highlighted">
                              {{ section.title || `Sección ${sectionIndex + 1}` }}
                            </p>
                            <UBadge color="neutral" variant="subtle">
                              {{ section.fields.length }} campo(s)
                            </UBadge>
                            <UBadge color="warning" variant="soft">
                              Minimizada
                            </UBadge>
                          </div>

                          <div v-else class="grid gap-3">
                            <UInput
                              :model-value="section.title"
                              placeholder="Título de la sección"
                              @update:model-value="(value) => { section.title = value }"
                            />
                            <UTextarea
                              :model-value="section.description"
                              :rows="2"
                              placeholder="Descripción opcional para orientar al cliente"
                              @update:model-value="(value) => { section.description = value }"
                            />
                          </div>
                        </div>

                        <div class="flex items-center gap-2">
                          <UButton
                            size="sm"
                            color="neutral"
                            variant="ghost"
                            :icon="sectionCollapsed[section.id] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                            square
                            @click.stop="toggleSectionCollapse(section.id)"
                          />
                          <UButton
                            size="sm"
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-arrow-up"
                            square
                            :disabled="sectionIndex === 0"
                            @click.stop="moverSeccion(section.id, -1)"
                          />
                          <UButton
                            size="sm"
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-arrow-down"
                            square
                            :disabled="sectionIndex === form.sections.length - 1"
                            @click.stop="moverSeccion(section.id, 1)"
                          />
                          <UButton
                            size="sm"
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            square
                            :disabled="form.sections.length === 1"
                            @click.stop="eliminarSeccion(section.id)"
                          />
                        </div>
                      </div>

                      <div v-if="!sectionCollapsed[section.id] && section.fields.length" class="mt-5 grid gap-4 md:grid-cols-2">
                        <article
                          v-for="(field, fieldIndex) in section.fields"
                          :key="field.id"
                          role="button"
                          tabindex="0"
                          class="rounded-2xl border px-4 py-4 text-left transition"
                          :class="[
                            field.width === 'full' ? 'md:col-span-2' : '',
                            selectedFieldId === field.id
                              ? 'border-primary bg-default shadow-sm'
                              : 'border-default bg-muted/30 hover:border-primary/60 hover:bg-default'
                          ]"
                          @click.stop="seleccionarCampo(section.id, field.id)"
                          @keydown.enter.prevent="seleccionarCampo(section.id, field.id)"
                          @keydown.space.prevent="seleccionarCampo(section.id, field.id)"
                        >
                          <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p class="font-medium text-highlighted">
                                {{ field.label || 'Campo sin título' }}
                                <span v-if="field.required" class="text-error">*</span>
                              </p>
                              <p class="mt-1 text-xs text-toned">{{ field.key || 'clave_pendiente' }}</p>
                            </div>

                            <UBadge color="neutral" variant="subtle">
                              {{ fieldTypeLabels[field.type] }}
                            </UBadge>
                          </div>

                          <div v-if="field.padron_source || field.padron_source_key" class="mt-3 flex flex-wrap gap-2">
                            <UBadge v-if="field.padron_source" color="success" variant="soft">
                              Consulta padrón por cédula
                            </UBadge>
                            <UBadge v-if="field.padron_source_key" color="primary" variant="soft">
                              Se completa desde otra cédula
                            </UBadge>
                          </div>

                          <div class="mt-4">
                            <input
                              v-if="field.type === 'text' || field.type === 'number' || field.type === 'date'"
                              :type="field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'"
                              :placeholder="field.placeholder || field.label"
                              disabled
                              class="w-full rounded-xl border border-default bg-default px-4 py-3 text-sm text-muted"
                            >

                            <textarea
                              v-else-if="field.type === 'textarea'"
                              :placeholder="field.placeholder || field.label"
                              disabled
                              rows="4"
                              class="w-full rounded-xl border border-default bg-default px-4 py-3 text-sm text-muted"
                            />

                            <div v-else class="flex items-center gap-6 rounded-xl border border-default bg-default px-4 py-3 text-sm text-highlighted">
                              <label class="flex items-center gap-2">
                                <input type="radio" disabled>
                                <span>Sí</span>
                              </label>
                              <label class="flex items-center gap-2">
                                <input type="radio" disabled>
                                <span>No</span>
                              </label>
                            </div>
                          </div>

                          <p v-if="field.help" class="mt-3 text-xs text-muted">
                            {{ field.help }}
                          </p>

                          <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <span class="text-xs text-toned">
                              {{ field.width === 'full' ? 'Ancho completo' : 'Media columna' }}
                            </span>

                            <div class="flex items-center gap-1">
                              <UButton
                                size="xs"
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-arrow-up"
                                square
                                :disabled="fieldIndex === 0"
                                @click.stop="moverCampo(section.id, field.id, -1)"
                              />
                              <UButton
                                size="xs"
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-arrow-down"
                                square
                                :disabled="fieldIndex === section.fields.length - 1"
                                @click.stop="moverCampo(section.id, field.id, 1)"
                              />
                              <UButton
                                size="xs"
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-copy"
                                square
                                @click.stop="duplicarCampo(section.id, field.id)"
                              />
                              <UButton
                                size="xs"
                                color="error"
                                variant="ghost"
                                icon="i-lucide-trash-2"
                                square
                                @click.stop="eliminarCampo(section.id, field.id)"
                              />
                            </div>
                          </div>
                        </article>
                      </div>

                      <div
                        v-if="!sectionCollapsed[section.id]"
                        class="mt-5 rounded-2xl border border-dashed border-primary/50 bg-primary/5 px-4 py-5 text-sm text-primary"
                        @dragover.prevent
                        @drop.prevent="(event) => void soltarEnSeccion(section.id, event)"
                      >
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p class="font-medium">Soltá un componente acá</p>
                            <p class="mt-1 text-primary/80">
                              También podés usar la paleta para agregar campos a esta sección.
                            </p>
                          </div>

                          <UButton color="primary" variant="soft" @click.stop="seleccionarSeccion(section.id)">
                            Sección activa
                          </UButton>
                        </div>
                      </div>
                    </article>
                  </div>
                </UScrollArea>
            </UCard>
          </div>

          <aside class="self-start xl:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-5 2xl:min-h-0">
            <div class="flex flex-col gap-4 2xl:h-[calc(100vh-9.5rem)] 2xl:min-h-0">
              <UCard
                :ui="{
                  header: panelCollapsed.analytics
                    ? 'px-4 py-3 sm:px-4 sm:py-3'
                    : 'p-4 sm:px-6'
                }"
              >
                <template #header>
                  <div class="flex justify-between gap-3" :class="panelCollapsed.analytics ? 'items-center' : 'items-start'">
                    <div>
                      <h3
                        class="font-semibold text-highlighted"
                        :class="panelCollapsed.analytics ? 'text-base' : 'text-lg'"
                      >
                        Analytics
                      </h3>
                      <p v-if="!panelCollapsed.analytics" class="mt-1 text-sm text-muted">Resumen rápido del builder antes de pasar al documento.</p>
                    </div>

                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      :icon="panelCollapsed.analytics ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                      @click="togglePanel('analytics')"
                    />
                  </div>
                </template>

                <div v-if="!panelCollapsed.analytics" class="grid gap-3">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-2xl border border-default bg-muted/30 p-4">
                      <p class="text-xs uppercase tracking-wide text-toned">Secciones</p>
                      <p class="mt-2 text-2xl font-semibold text-highlighted">{{ analytics.sections }}</p>
                    </div>
                    <div class="rounded-2xl border border-default bg-muted/30 p-4">
                      <p class="text-xs uppercase tracking-wide text-toned">Campos</p>
                      <p class="mt-2 text-2xl font-semibold text-highlighted">{{ analytics.fields }}</p>
                    </div>
                    <div class="rounded-2xl border border-default bg-muted/30 p-4">
                      <p class="text-xs uppercase tracking-wide text-toned">Obligatorios</p>
                      <p class="mt-2 text-2xl font-semibold text-highlighted">{{ analytics.required }}</p>
                    </div>
                    <div class="rounded-2xl border border-default bg-muted/30 p-4">
                      <p class="text-xs uppercase tracking-wide text-toned">Placeholders</p>
                      <p class="mt-2 text-2xl font-semibold text-highlighted">{{ analytics.placeholders }}</p>
                    </div>
                  </div>

                  <div class="rounded-2xl border border-default p-4">
                    <p class="text-sm font-medium text-highlighted">Distribución por tipo</p>
                    <div class="mt-3 grid gap-2 text-sm text-muted">
                      <div class="flex items-center justify-between">
                        <span>Texto corto</span>
                        <span>{{ analytics.byType.text }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span>Texto largo</span>
                        <span>{{ analytics.byType.textarea }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span>Número</span>
                        <span>{{ analytics.byType.number }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span>Fecha</span>
                        <span>{{ analytics.byType.date }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span>Sí / No</span>
                        <span>{{ analytics.byType.boolean }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </UCard>

              <UCard
                v-if="activeSection"
                :ui="{
                  header: panelCollapsed.activeSection
                    ? 'px-4 py-3 sm:px-4 sm:py-3'
                    : 'p-4 sm:px-6'
                }"
              >
                <template #header>
                  <div class="flex justify-between gap-3" :class="panelCollapsed.activeSection ? 'items-center' : 'items-start'">
                    <div>
                      <h3
                        class="font-semibold text-highlighted"
                        :class="panelCollapsed.activeSection ? 'text-base' : 'text-lg'"
                      >
                        Sección activa
                      </h3>
                      <p v-if="!panelCollapsed.activeSection" class="mt-1 text-sm text-muted">Los componentes nuevos se agregan acá.</p>
                    </div>

                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      :icon="panelCollapsed.activeSection ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                      @click="togglePanel('activeSection')"
                    />
                  </div>
                </template>

                <div v-if="!panelCollapsed.activeSection" class="grid gap-3 text-sm">
                  <div class="rounded-2xl border border-default bg-muted/30 p-4">
                    <p class="font-medium text-highlighted">{{ activeSection.title || 'Sección sin título' }}</p>
                    <p class="mt-2 text-muted">
                      {{ activeSection.description || 'Sin descripción configurada.' }}
                    </p>
                  </div>
                  <p class="text-muted">
                    {{ activeSection.fields.length }} campo(s) dentro de esta sección.
                  </p>
                </div>
              </UCard>

              <UCard
                :ui="{
                  header: panelCollapsed.fieldEditor
                    ? 'px-4 py-3 sm:px-4 sm:py-3'
                    : 'p-4 sm:px-6',
                  body: 'min-h-0 flex flex-1 flex-col p-4 sm:p-6'
                }"
                class="2xl:min-h-0 2xl:flex 2xl:flex-col 2xl:overflow-hidden"
                :class="selectedField && !panelCollapsed.fieldEditor ? '2xl:flex-1' : '2xl:flex-none'"
              >
                <template #header>
                  <div class="flex justify-between gap-3" :class="panelCollapsed.fieldEditor ? 'items-center' : 'items-start'">
                    <div>
                      <h3
                        class="font-semibold text-highlighted"
                        :class="panelCollapsed.fieldEditor ? 'text-base' : 'text-lg'"
                      >
                        Editor del campo
                      </h3>
                      <p v-if="!panelCollapsed.fieldEditor" class="mt-1 text-sm text-muted">Ajustá el campo seleccionado en el canvas.</p>
                    </div>

                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      :icon="panelCollapsed.fieldEditor ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                      @click="togglePanel('fieldEditor')"
                    />
                  </div>
                </template>

                <UScrollArea
                  v-if="!panelCollapsed.fieldEditor"
                  class="min-h-0 2xl:flex-1 2xl:overscroll-contain 2xl:[scrollbar-gutter:stable]"
                >
                  <div class="grid gap-4 2xl:pr-1">
                    <template v-if="selectedField">
                    <UFormField label="Etiqueta" required>
                      <UInput
                        :model-value="selectedField.label"
                        placeholder="Nombre visible del campo"
                        @update:model-value="(value) => { actualizarCampoSeleccionado({ label: value }) }"
                      />
                    </UFormField>

                    <div class="grid gap-2">
                      <UFormField label="Clave del placeholder" required>
                        <UInput
                          :model-value="selectedField.key"
                          placeholder="nombre_cliente"
                          @update:model-value="(value) => { actualizarCampoSeleccionado({ key: normalizarTextoPlano(String(value ?? '')) }) }"
                        />
                      </UFormField>
                      <div class="flex justify-end">
                        <UButton color="neutral" variant="ghost" size="sm" @click="regenerarClaveSeleccionada">
                          Autogenerar clave
                        </UButton>
                      </div>
                    </div>

                    <UFormField label="Tipo">
                      <UInput :model-value="fieldTypeLabels[selectedField.type]" disabled />
                    </UFormField>

                    <UFormField label="Placeholder">
                      <UInput
                        :model-value="selectedField.placeholder"
                        placeholder="Texto guía dentro del input"
                        @update:model-value="(value) => { actualizarCampoSeleccionado({ placeholder: value }) }"
                      />
                    </UFormField>

                    <UFormField label="Ayuda adicional">
                      <UTextarea
                        :model-value="selectedField.help"
                        :rows="3"
                        placeholder="Mensaje complementario para orientar al cliente"
                        @update:model-value="(value) => { actualizarCampoSeleccionado({ help: value }) }"
                      />
                    </UFormField>

                    <div
                      v-if="selectedField.padron_source || selectedField.padron_source_key"
                      class="grid gap-4 rounded-2xl border border-default bg-muted/30 p-4"
                    >
                      <div>
                        <p class="font-medium text-highlighted">Autocompletado con padrón</p>
                        <p class="mt-1 text-sm text-muted">
                          Este campo ya forma parte de un bloque guiado de nombre y cédula.
                        </p>
                      </div>

                      <p
                        v-if="selectedField.padron_source"
                        class="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
                      >
                        Este es el campo fuente de cédula. Cuando el cliente escriba una cédula válida, el resto del bloque se completa automáticamente.
                      </p>

                      <p
                        v-else
                        class="rounded-xl border border-primary/20 bg-primary/8 px-3 py-2 text-sm text-muted"
                      >
                        Este campo se llena desde la cédula vinculada del bloque. Si necesitás otro vínculo, agregá un nuevo bloque `Nombre | Cédula` desde la paleta.
                      </p>
                    </div>

                    <UFormField label="Ancho">
                      <USelect
                        :model-value="selectedField.width ?? 'half'"
                        value-key="value"
                        :items="[
                          { label: 'Media columna', value: 'half' },
                          { label: 'Ancho completo', value: 'full' }
                        ]"
                        @update:model-value="actualizarAnchoSeleccionado"
                      />
                    </UFormField>

                    <UCheckbox
                      :model-value="selectedField.required ?? true"
                      label="Campo obligatorio"
                      @update:model-value="(value) => { actualizarCampoSeleccionado({ required: Boolean(value) }) }"
                    />
                    </template>

                    <div
                      v-else
                      class="rounded-2xl border border-dashed border-default px-4 py-5 text-sm text-muted"
                    >
                      Seleccioná un campo del canvas para editar etiqueta, placeholder, ancho y obligatoriedad.
                    </div>
                  </div>
                </UScrollArea>
              </UCard>
            </div>
          </aside>
        </template>

        <template v-else>
          <div class="grid min-w-0 gap-5">
            <UCard>
              <template #header>
                <div>
                  <h3 class="text-lg font-semibold text-highlighted">Contenido del documento</h3>
                  <p class="mt-1 text-sm text-muted">
                    Este texto se guarda en `content`. Los placeholders del formulario y del notario se reemplazan al generar el documento.
                  </p>
                </div>
              </template>

              <div class="grid gap-4">
                <p class="text-sm text-muted">
                  Los placeholders se agrupan por sección del formulario para que sea más claro qué datos pertenecen a cada bloque del documento.
                </p>

                <div class="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
                  <div class="grid gap-4 rounded-2xl border border-default bg-muted/20 p-4 2xl:max-h-[calc(100vh-20rem)] 2xl:overflow-y-auto">
                    <div>
                      <p class="font-medium text-highlighted">Bloques de placeholders</p>
                      <p class="mt-1 text-sm text-muted">
                        Hacé clic en cualquier variable para insertarla en el texto de la derecha.
                      </p>
                    </div>

                    <div class="grid gap-4">
                      <div
                        v-for="group in availablePlaceholderGroups"
                        :key="group.id"
                        class="grid gap-3 rounded-2xl border border-default bg-default p-4"
                      >
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                          <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                              <p class="font-medium text-highlighted">{{ group.title }}</p>
                              <UBadge color="neutral" variant="subtle" size="sm">
                                {{ group.items.length }}
                              </UBadge>
                            </div>
                            <p v-if="group.description && !placeholderGroupCollapsed[group.id]" class="mt-1 text-sm text-muted">
                              {{ group.description }}
                            </p>
                          </div>

                          <UButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            square
                            :icon="placeholderGroupCollapsed[group.id] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
                            @click.stop="togglePlaceholderGroup(group.id)"
                          />
                        </div>

                        <div
                          v-if="placeholderGroupCollapsed[group.id]"
                          class="rounded-2xl border border-dashed border-default bg-muted/20 px-4 py-3 text-sm text-muted"
                        >
                          Grupo minimizado
                        </div>

                        <div v-else class="grid gap-3">
                          <button
                            v-for="placeholder in group.items"
                            :key="placeholder.token"
                            type="button"
                            class="rounded-2xl border border-default bg-muted/20 px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5"
                            @click="insertarPlaceholder(placeholder.key)"
                          >
                            <p class="text-sm font-medium text-highlighted">
                              {{ placeholder.label }}
                            </p>
                            <p class="mt-1 text-xs text-muted">
                              {{ placeholder.source }}
                            </p>
                            <p class="mt-2 font-mono text-xs text-toned">
                              {{ placeholder.token }}
                            </p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid gap-4">
                    <textarea
                      ref="documentContentTextarea"
                      :value="form.content"
                      rows="20"
                      placeholder="Ejemplo: Yo {{nombre_cliente}}, cédula {{cedula_cliente}}, comparezco ante {{nombre_notario}}..."
                      class="min-h-[560px] w-full rounded-2xl border border-default bg-default px-4 py-3 font-mono text-sm text-highlighted outline-none transition focus:border-primary"
                      @input="actualizarContenidoDocumento"
                      @click="recordarCursorContenido"
                      @focus="recordarCursorContenido"
                      @keyup="recordarCursorContenido"
                      @select="recordarCursorContenido"
                    ></textarea>

                    <UAlert
                      v-if="documentContentError"
                      color="warning"
                      variant="soft"
                      title="Revisá el formato del documento"
                      :description="documentContentError"
                    />
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <aside class="grid gap-4 self-start xl:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-5">
            <UCard>
              <template #header>
                <div>
                  <h3 class="text-lg font-semibold text-highlighted">Resumen</h3>
                  <p class="mt-1 text-sm text-muted">Verificá la plantilla antes de guardarla.</p>
                </div>
              </template>

              <div class="grid gap-4">
                <div class="rounded-2xl border border-default bg-muted/30 p-4">
                  <p class="text-xs uppercase tracking-wide text-toned">Título visible</p>
                  <p class="mt-2 font-medium text-highlighted">
                    {{ form.title.trim() || 'Sin título todavía' }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-2xl border border-default bg-muted/30 p-4">
                    <p class="text-xs uppercase tracking-wide text-toned">Secciones</p>
                    <p class="mt-2 text-2xl font-semibold text-highlighted">{{ analytics.sections }}</p>
                  </div>
                  <div class="rounded-2xl border border-default bg-muted/30 p-4">
                    <p class="text-xs uppercase tracking-wide text-toned">Campos</p>
                    <p class="mt-2 text-2xl font-semibold text-highlighted">{{ analytics.fields }}</p>
                  </div>
                </div>

                <div class="rounded-2xl border border-default p-4">
                  <p class="text-sm font-medium text-highlighted">Guía rápida</p>
                  <ul class="mt-3 grid gap-2 text-sm text-muted">
                    <li>Usá los bloques de la izquierda para insertar placeholders válidos.</li>
                    <li>Si querés corregir preguntas del cliente, volvés al paso de formulario sin perder el texto.</li>
                    <li>El documento final se genera reemplazando cada `{{placeholder}}` con la respuesta real.</li>
                  </ul>
                </div>
              </div>
            </UCard>
          </aside>
        </template>
      </div>
    </div>
  </div>
</template>
