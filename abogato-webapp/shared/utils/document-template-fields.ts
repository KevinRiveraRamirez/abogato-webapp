export const templateFieldTypes = ['text', 'textarea', 'number', 'date', 'boolean'] as const
export type TemplateFieldType = typeof templateFieldTypes[number]

export const templateFieldWidths = ['half', 'full'] as const
export type TemplateFieldWidth = typeof templateFieldWidths[number]

export const templateFieldPadronValues = ['nombre_completo', 'nombre', 'apellido_1', 'apellido_2'] as const
export type TemplateFieldPadronValue = typeof templateFieldPadronValues[number]

export type TemplateField = {
  key: string
  label: string
  type: TemplateFieldType
  required?: boolean
  placeholder?: string
  help?: string
  width?: TemplateFieldWidth
  section_id?: string
  section_title?: string
  section_description?: string
  padron_source?: boolean
  padron_source_key?: string
  padron_value?: TemplateFieldPadronValue
}

export type TemplateFieldSection = {
  id: string
  title: string
  description: string
  fields: TemplateField[]
}

const templateFieldTypesSet = new Set<string>(templateFieldTypes)
const templateFieldPadronValuesSet = new Set<string>(templateFieldPadronValues)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isTemplateField(value: unknown): value is TemplateField {
  if (!isRecord(value)) return false

  if (typeof value.key !== 'string' || typeof value.label !== 'string') return false
  if (!templateFieldTypesSet.has(String(value.type))) return false

  if (value.required != null && typeof value.required !== 'boolean') return false
  if (value.placeholder != null && typeof value.placeholder !== 'string') return false
  if (value.help != null && typeof value.help !== 'string') return false
  if (value.width != null && !templateFieldWidths.includes(value.width as TemplateFieldWidth)) return false
  if (value.section_id != null && typeof value.section_id !== 'string') return false
  if (value.section_title != null && typeof value.section_title !== 'string') return false
  if (value.section_description != null && typeof value.section_description !== 'string') return false
  if (value.padron_source != null && typeof value.padron_source !== 'boolean') return false
  if (value.padron_source_key != null && typeof value.padron_source_key !== 'string') return false
  if (value.padron_value != null && !templateFieldPadronValuesSet.has(String(value.padron_value))) return false

  return true
}

export function isTemplateFieldList(value: unknown): value is TemplateField[] {
  return Array.isArray(value) && value.every(isTemplateField)
}

export function normalizeTemplateField(field: TemplateField): TemplateField {
  return {
    ...field,
    type: templateFieldTypesSet.has(field.type) ? field.type : 'text',
    required: field.required ?? true,
    width: field.width === 'full' ? 'full' : 'half',
    placeholder: field.placeholder?.trim() ?? '',
    help: field.help?.trim() ?? '',
    section_id: field.section_id?.trim() ?? '',
    section_title: field.section_title?.trim() ?? '',
    section_description: field.section_description?.trim() ?? '',
    padron_source: field.padron_source ?? false,
    padron_source_key: field.padron_source_key?.trim() ?? '',
    padron_value: templateFieldPadronValuesSet.has(String(field.padron_value)) ? field.padron_value : undefined,
  }
}

export function normalizeTemplateFields(fields: TemplateField[]) {
  return fields.map(normalizeTemplateField)
}

export function groupTemplateFields(fields: TemplateField[]): TemplateFieldSection[] {
  const sections: TemplateFieldSection[] = []
  const indexById = new Map<string, number>()

  normalizeTemplateFields(fields).forEach((field) => {
    const id = field.section_id || 'default'
    const title = field.section_title || ''
    const description = field.section_description || ''
    const existingIndex = indexById.get(id)

    if (existingIndex == null) {
      indexById.set(id, sections.length)
      sections.push({
        id,
        title,
        description,
        fields: [field],
      })
      return
    }

    const section = sections[existingIndex]

    if (!section.title && title) section.title = title
    if (!section.description && description) section.description = description
    section.fields.push(field)
  })

  return sections
}
