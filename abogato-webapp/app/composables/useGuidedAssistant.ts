type TemplateField = {
  id?: string
  key?: string
  name?: string
  label?: string
  type?: string
  required?: boolean
  placeholder?: string
  options?: Array<string | { label: string; value: string }>
}

type TemplateResponse = {
  ok: boolean
  template: {
    id: string
    title: string
    fields: TemplateField[]
    servicio_id?: string
    activo?: boolean
  }
}

export const useGuidedAssistant = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const getFieldKey = (field: TemplateField) => {
    return field.name || field.key || field.id || ''
  }

  const getFieldLabel = (field: TemplateField) => {
    return field.label || getFieldKey(field) || 'campo'
  }

  const getQuestionForField = (field: TemplateField) => {
    const label = getFieldLabel(field)
    return `Por favor ingresa ${label}.`
  }

  const normalizeOptions = (field: TemplateField) => {
    const options = field.options || []
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt }
      }
      return {
        label: opt.label,
        value: opt.value,
      }
    })
  }

  const validateField = (field: TemplateField, rawValue: string) => {
    const value = rawValue?.trim() ?? ''
    const label = getFieldLabel(field)
    const type = (field.type || 'text').toLowerCase()

    if (field.required && !value) {
      return `El campo ${label} es obligatorio.`
    }

    if (!value) return null

    if (type === 'number' && Number.isNaN(Number(value))) {
      return `${label} debe ser un número válido.`
    }

    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${label} debe ser un correo válido.`
    }

    if (type === 'date' && Number.isNaN(Date.parse(value))) {
      return `${label} debe ser una fecha válida.`
    }

    const key = getFieldKey(field).toLowerCase()

    if (key.includes('cedula') && !/^\d{9,12}$/.test(value)) {
      return `${label} debe tener entre 9 y 12 dígitos.`
    }

    if (key.includes('telefono') && !/^\d{8,15}$/.test(value)) {
      return `${label} debe tener entre 8 y 15 dígitos.`
    }

    const options = normalizeOptions(field)
    if (options.length > 0) {
      const valid = options.some((opt) => opt.value === value)
      if (!valid) {
        return `${label} debe ser una de las opciones permitidas: ${options.map((o) => o.value).join(', ')}.`
      }
    }

    return null
  }

  const fetchTemplate = async (templateId: string) => {
    loading.value = true
    error.value = null

    try {
      const res = await $fetch<TemplateResponse>('/api/assistant/template', {
        query: { templateId },
      })
      return res.template
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Error cargando plantilla'
      return null
    } finally {
      loading.value = false
    }
  }

  const submitGuidedDocument = async (payload: {
    templateId: string
    ticketId?: string | null
    fieldValues: Record<string, any>
  }) => {
    loading.value = true
    error.value = null

    try {
      return await $fetch('/api/assistant/submit-guided', {
        method: 'POST',
        body: payload,
      })
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Error guardando documento'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchTemplate,
    submitGuidedDocument,
    validateField,
    getFieldKey,
    getFieldLabel,
    getQuestionForField,
    normalizeOptions,
  }
}