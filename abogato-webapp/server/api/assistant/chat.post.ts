import { serverSupabaseClient } from '#supabase/server'

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOPWORDS = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'asi', 'aun',
  'bajo', 'bien', 'cada', 'casi', 'como', 'con', 'contra', 'cual', 'cuando',
  'de', 'del', 'desde', 'donde', 'dos', 'el', 'ella', 'ellas', 'ellos', 'en',
  'entre', 'era', 'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta',
  'estaba', 'estan', 'estas', 'este', 'esto', 'estos', 'fue', 'fuera', 'gran',
  'ha', 'hay', 'hasta', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me',
  'mi', 'mis', 'mismo', 'muy', 'no', 'nos', 'nuestra', 'nuestro', 'o', 'otra',
  'otro', 'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'se', 'sea',
  'segun', 'si', 'sin', 'sobre', 'son', 'su', 'sus', 'tambien', 'tan', 'te',
  'tiene', 'tu', 'tus', 'un', 'una', 'uno', 'unos', 'y', 'ya',
])

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

function scoreFaqMatch(message: string, faqPregunta: string) {
  const msg = normalizeText(message)
  const q = normalizeText(faqPregunta)

  if (!msg || !q) return 0
  if (msg.includes(q) || q.includes(msg)) return 1

  const msgTokens = new Set(tokenize(msg))
  const qTokens = new Set(tokenize(q))
  if (msgTokens.size === 0 || qTokens.size === 0) return 0

  let overlap = 0
  for (const t of qTokens) if (msgTokens.has(t)) overlap++

  // Similaridad tipo Jaccard ponderada por tamaño.
  const union = msgTokens.size + qTokens.size - overlap
  return union > 0 ? overlap / union : 0
}

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
    let faqs: Array<{ pregunta: string; respuesta: string }> = []

    const { data: faqData } = await supabase
      .from('faq')
      .select('pregunta, respuesta')
      .or('activa.is.null,activa.eq.true')

    faqs = (faqData ?? []) as Array<{ pregunta: string; respuesta: string }>

    let respuesta = ''
    let respondidaPorFaq = false

    if (faqs && faqs.length > 0) {
      const msgTokens = new Set(tokenize(body.message))

      const scored = faqs
        .map((faq) => {
          const qTokens = new Set(tokenize(faq.pregunta))
          let overlap = 0
          for (const t of qTokens) if (msgTokens.has(t)) overlap++

          return {
            faq,
            score: scoreFaqMatch(body.message, faq.pregunta),
            overlap,
          }
        })
        .sort((a, b) => (b.score - a.score) || (b.overlap - a.overlap))

      const best = scored[0]
      // Heurística: con 2+ tokens en común ya suele ser la misma intención.
      // Con 1 token, exigimos más parecido global.
      if (
        best &&
        ((best.overlap >= 2 && best.score >= 0.08) ||
          (best.overlap >= 1 && best.score >= 0.14) ||
          best.score >= 0.18)
      ) {
        respuesta = best.faq.respuesta
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