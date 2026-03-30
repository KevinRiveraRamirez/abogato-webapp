import type { Database } from '~/types/database.types'

export type StateLookupSource = 'ticket_padron' | 'vehicle_transfer_padron'
export type StateLookupFailureKind = 'error' | 'not_found'

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Lookup failed'
}

function shouldRetryLookup(error: unknown) {
  const message = normalizeErrorMessage(error).toLowerCase()

  return [
    'network',
    'fetch',
    'timeout',
    'tempor',
    'connection',
    'offline',
    'failed to fetch',
  ].some(fragment => message.includes(fragment))
}

export function useStateLookupMonitor() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function resolveCurrentUserId() {
    if (user.value?.id) {
      return user.value.id
    }

    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  async function registerLookupFailure(input: {
    source: StateLookupSource
    queryValue: string
    failureKind: StateLookupFailureKind
    ticketId?: string | null
    errorMessage?: string | null
  }) {
    const userId = await resolveCurrentUserId()

    if (!userId) return

    await supabase
      .from('system_lookup_failures')
      .insert([{
        user_id: userId,
        ticket_id: input.ticketId ?? null,
        source: input.source,
        query_value: input.queryValue.trim().slice(0, 160),
        failure_kind: input.failureKind,
        error_message: input.errorMessage?.trim().slice(0, 500) ?? null,
      }])
  }

  async function runLookupWithRetry<T>(
    task: () => Promise<T>,
    options: {
      retries?: number
      retryDelayMs?: number
    } = {}
  ) {
    const retries = Math.max(0, options.retries ?? 2)
    const retryDelayMs = Math.max(120, options.retryDelayMs ?? 250)

    let attempt = 0

    while (true) {
      try {
        return await task()
      } catch (error) {
        if (attempt >= retries || !shouldRetryLookup(error)) {
          throw error
        }

        attempt += 1
        await sleep(retryDelayMs * attempt)
      }
    }
  }

  return {
    registerLookupFailure,
    runLookupWithRetry,
  }
}
