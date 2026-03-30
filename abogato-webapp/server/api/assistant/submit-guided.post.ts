import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const templateId = body?.templateId
  const ticketId = body?.ticketId || null
  const fieldValues = body?.fieldValues

  if (!templateId || !fieldValues || typeof fieldValues !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Datos incompletos para guardar el documento',
    })
  }

  const supabase = await serverSupabaseClient(event)
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Usuario no autenticado',
    })
  }

  const { data: template, error: templateError } = await supabase
    .from('document_templates')
    .select('id, fields, activo')
    .eq('id', templateId)
    .eq('activo', true)
    .single()

  if (templateError || !template) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Plantilla no encontrada',
    })
  }

  const fields = Array.isArray(template.fields) ? template.fields : []

  for (const field of fields) {
    const key = field.name || field.key || field.id
    const required = !!field.required

    if (!key) continue

    const value = fieldValues[key]

    if (required && (value === undefined || value === null || String(value).trim() === '')) {
      throw createError({
        statusCode: 400,
        statusMessage: `El campo ${key} es obligatorio`,
      })
    }
  }

  const payload = {
    ticket_id: ticketId,
    template_id: templateId,
    field_values: fieldValues,
    status: 'submitted',
    created_by: userId,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('documents')
    .insert(payload)
    .select('id, ticket_id, template_id, field_values, status')
    .single()

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: insertError.message,
    })
  }

  return {
    ok: true,
    document: inserted,
  }
})