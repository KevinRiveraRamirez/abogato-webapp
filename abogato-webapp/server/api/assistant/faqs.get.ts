import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Endpoint público para mostrar FAQs activas como sugerencias en el chat.
  const limit = Math.min(Number(getQuery(event)?.limit ?? 8) || 8, 20)

  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .from('faq')
    .select('pregunta')
    .or('activa.is.null,activa.eq.true')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'No se pudieron cargar las FAQs',
      message: error.message,
    })
  }

  return {
    ok: true,
    faqs: (data ?? []).filter((f) => !!f.pregunta).map((f) => ({ pregunta: f.pregunta })),
  }
})

