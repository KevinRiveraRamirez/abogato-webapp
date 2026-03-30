import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body?.message || typeof body.message !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'El mensaje es requerido',
      })
    }

    const config = useRuntimeConfig()
    const groqApiKey = config.groqApiKey
    if (!groqApiKey || typeof groqApiKey !== 'string') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Falta configurar GROQ_API_KEY en el servidor',
      })
    }

    const supabase = await serverSupabaseClient(event)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id ?? null

    // ✅ HU-045: Buscar en FAQ antes de llamar a Groq
    const { data: faqs } = await supabase
      .from('faq')
      .select('pregunta, respuesta')
      .eq('activa', true)

    let respuesta = ''
    let respondidaPorFaq = false

    if (faqs && faqs.length > 0) {
      const mensajeLower = body.message.toLowerCase()
      const match = faqs.find(faq =>
        faq.pregunta.toLowerCase().split(' ').some((palabra: string) =>
          palabra.length > 4 && mensajeLower.includes(palabra)
        )
      )
      if (match) {
        respuesta = match.respuesta
        respondidaPorFaq = true
      }
    }

    // Si no hubo match en FAQ, llamar a Groq
    if (!respondidaPorFaq) {
      const completionRes = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: `Eres un asistente legal en Costa Rica.

REGLAS CRÍTICAS:
- SOLO responde si estás seguro de la información legal.
- Si no estás completamente seguro, responde EXACTAMENTE:
"No tengo suficiente información para ayudarte con precisión. Te recomiendo crear un ticket para que un abogado revise tu caso."
- NUNCA inventes números de leyes, fechas o artículos.
- NUNCA supongas leyes.
- Si mencionas una ley, debe ser real y conocida en Costa Rica.

Contexto:
- Usuario en Costa Rica
- Usa términos locales (cédula, Registro Nacional, etc).`,
              },
              {
                role: 'user',
                content: body.message,
              },
            ],
          }),
        },
      )

      if (!completionRes.ok) {
        const errorText = await completionRes.text().catch(() => '')
        throw createError({
          statusCode: completionRes.status,
          statusMessage: errorText || 'Error al consultar Groq',
        })
      }

      const completion = (await completionRes.json()) as any
      respuesta = completion.choices[0]?.message?.content || ''
    }

    const suggestTicket = respuesta
      .toLowerCase()
      .includes('no tengo suficiente información')

    // ✅ HU-047/048: Guardar con was_escalated para analytics
    if (userId) {
      await supabase.from('ai_conversations').insert([
        {
          user_id: userId,
          role: 'user',
          content: body.message,
          was_escalated: false,
        },
        {
          user_id: userId,
          role: 'assistant',
          content: respuesta,
          was_escalated: suggestTicket,
        },
      ])
    }

    return {
      ok: true,
      reply: respuesta,
      suggestTicket,
    }
  } catch (error: any) {
    console.error('Error en /api/chat:', error)
    throw createError({
      statusCode: error?.status || 500,
      statusMessage: error?.message || 'Error al consultar el asistente',
    })
  }
})