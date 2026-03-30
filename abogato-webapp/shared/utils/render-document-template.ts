type TemplateValue = string | number | boolean | null | undefined

export function renderDocumentTemplate(
  content: string,
  fieldValues: Record<string, TemplateValue>,
  systemValues: Record<string, TemplateValue> = {}
) {
  let output = content
  const values = { ...systemValues, ...fieldValues }

  for (const [key, value] of Object.entries(values)) {
    const normalized = value == null ? '' : String(value).trim()
    output = output.replaceAll(`{{${key}}}`, normalized || `[${key}]`)
  }

  return output.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => `[${key.trim()}]`)
}
