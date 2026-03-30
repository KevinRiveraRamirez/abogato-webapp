import Groq from 'groq-sdk'
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

    const groq = new Groq({
      apiKey: config.groqApiKey,
    })

    const supabase = await serverSupabaseClient(event)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id ?? null

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
      {
  role: "system",
  content: `
      Eres un asistente legal en Costa Rica.

        REGLAS CRÍTICAS:
        - SOLO responde si estás seguro de la información legal.
        - Si no estás completamente seguro, responde EXACTAMENTE:

        "No tengo suficiente información para ayudarte con precisión. Te recomiendo crear un ticket para que un abogado revise tu caso."

        - NUNCA inventes números de leyes, fechas o artículos.
        - NUNCA supongas leyes.
        - Si mencionas una ley, debe ser real y conocida en Costa Rica.

        Contexto:
        - Usuario en Costa Rica
        - Usa términos locales (cédula, Registro Nacional, etc)
        `
        },
        {
          role: 'user',
          content: body.message,
        },
      ],
    })

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