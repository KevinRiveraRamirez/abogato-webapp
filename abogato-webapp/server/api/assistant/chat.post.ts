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
        statusMessage:
          'Falta configurar GROQ_API_KEY (runtimeConfig.groqApiKey) en el servidor',
      })
    }

    const supabase = await serverSupabaseClient(event)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id ?? null

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
              content: `Eres un asistente legal dentro de una plataforma de tickets.

Reglas:
- Responde preguntas legales comunes de forma clara.
- Si NO estás seguro o la pregunta es específica del caso:
DI EXACTAMENTE:
"No tengo suficiente información para ayudarte con precisión. Te recomiendo crear un ticket para que un abogado revise tu caso."
- No inventes información.`,
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
        statusMessage:
          errorText || 'Error al consultar Groq (chat completions)',
      })
    }

    const completion = (await completionRes.json()) as any

    const respuesta = completion.choices[0]?.message?.content || ''

    const suggestTicket = respuesta
      .toLowerCase()
      .includes('no tengo suficiente información')

    if (userId) {
      await supabase.from('ai_conversations').insert([
        {
          user_id: userId,
          role: 'user',
          content: body.message,
        },
        {
          user_id: userId,
          role: 'assistant',
          content: respuesta,
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
      statusMessage: error?.message || 'Error al consultar Groq',
    })
  }
})