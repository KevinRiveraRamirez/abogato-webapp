import type { H3Event } from 'h3'
import {
  canManageAdminAccounts,
  isAdminLikeRole,
  type AppRole,
} from '~~/shared/roles'

type AdminProfile = {
  user_id: string
  role: AppRole
  is_active: boolean
}

type SelectOptions = {
  columns?: string
  filters?: Record<string, string>
  orderBy?: { column: string, ascending?: boolean }
  limit?: number
  offset?: number
}

type UpdateOptions = {
  filters?: Record<string, string>
  columns?: string
}

type CreateAuthUserInput = {
  email: string
  password: string
  email_confirm?: boolean
  user_metadata?: Record<string, unknown>
}

type AuthUser = {
  id: string
  email?: string | null
}

function getSupabaseConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const supabaseUrl = config.supabaseUrl?.trim()
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Config error',
      message: 'Falta configurar SUPABASE_URL y una clave server de Supabase en SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY.',
    })
  }

  if (serviceRoleKey.startsWith('sb_publishable_')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Config error',
      message: 'La clave configurada para el servidor es publishable. Usá SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY para las rutas admin.',
    })
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '')

  return {
    restBaseUrl: `${baseUrl}/rest/v1`,
    authBaseUrl: `${baseUrl}/auth/v1`,
    serviceRoleKey,
  }
}

function withQuery(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function buildParams(options: SelectOptions = {}) {
  const params = new URLSearchParams()

  params.set('select', options.columns ?? '*')

  for (const [key, value] of Object.entries(options.filters ?? {})) {
    params.set(key, value)
  }

  if (options.orderBy) {
    params.set('order', `${options.orderBy.column}.${options.orderBy.ascending === false ? 'desc' : 'asc'}`)
  }

  if (options.limit !== undefined) {
    params.set('limit', String(options.limit))
  }

  if (options.offset !== undefined) {
    params.set('offset', String(options.offset))
  }

  return params
}

async function parseErrorMessage(response: Response) {
  const text = await response.text()

  if (!text) {
    return `Supabase respondió ${response.status}.`
  }

  try {
    const parsed = JSON.parse(text) as { message?: string; msg?: string; error_description?: string }
    return parsed.message || parsed.msg || parsed.error_description || text
  } catch {
    return text
  }
}

async function requestJson<T>(url: string, init: RequestInit, message: string) {
  const response = await fetch(url, init)

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: 'Supabase request failed',
      message: `${message} ${await parseErrorMessage(response)}`,
    })
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

export function toSupabaseInFilter(values: Array<string | number>) {
  return `(${values.map((value) => JSON.stringify(String(value))).join(',')})`
}

export function createSupabaseAdminApi(event: H3Event) {
  const { restBaseUrl, authBaseUrl, serviceRoleKey } = getSupabaseConfig(event)

  const serviceHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }

  return {
    async getUserFromAccessToken(accessToken: string) {
      return requestJson<AuthUser>(`${authBaseUrl}/user`, {
        method: 'GET',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }, 'No se pudo validar la sesión.')
    },

    async createUser(input: CreateAuthUserInput) {
      const response = await requestJson<{ user?: AuthUser | null }>(`${authBaseUrl}/admin/users`, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify(input),
      }, 'No se pudo crear la cuenta.')

      return response.user ?? null
    },

    async selectRows<T>(table: string, options: SelectOptions = {}) {
      const params = buildParams(options)

      return requestJson<T[]>(withQuery(`${restBaseUrl}/${table}`, params), {
        method: 'GET',
        headers: serviceHeaders,
      }, `No se pudo consultar ${table}.`)
    },

    async selectSingle<T>(table: string, options: SelectOptions = {}) {
      const rows = await this.selectRows<T>(table, {
        ...options,
        limit: 1,
      })

      return rows[0] ?? null
    },

    async countRows(table: string, filters: Record<string, string> = {}) {
      const params = new URLSearchParams()

      params.set('select', '*')

      for (const [key, value] of Object.entries(filters)) {
        params.set(key, value)
      }

      const response = await fetch(withQuery(`${restBaseUrl}/${table}`, params), {
        method: 'HEAD',
        headers: {
          ...serviceHeaders,
          Prefer: 'count=exact',
        },
      })

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          statusMessage: 'Supabase request failed',
          message: `No se pudo contar ${table}. ${await parseErrorMessage(response)}`,
        })
      }

      const contentRange = response.headers.get('content-range') ?? ''
      const total = contentRange.split('/')[1]

      return total ? Number(total) : 0
    },

    async updateRows<T>(table: string, values: Record<string, unknown>, options: UpdateOptions = {}) {
      const params = new URLSearchParams()

      params.set('select', options.columns ?? '*')

      for (const [key, value] of Object.entries(options.filters ?? {})) {
        params.set(key, value)
      }

      return requestJson<T[]>(withQuery(`${restBaseUrl}/${table}`, params), {
        method: 'PATCH',
        headers: {
          ...serviceHeaders,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(values),
      }, `No se pudo actualizar ${table}.`)
    },

    async updateSingle<T>(table: string, values: Record<string, unknown>, options: UpdateOptions = {}) {
      const rows = await this.updateRows<T>(table, values, options)
      return rows[0] ?? null
    },

    async upsertRows(table: string, values: Record<string, unknown> | Array<Record<string, unknown>>) {
      await requestJson<null>(`${restBaseUrl}/${table}`, {
        method: 'POST',
        headers: {
          ...serviceHeaders,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(values),
      }, `No se pudo guardar ${table}.`)
    },
  }
}

export async function requireAdminAccess(event: H3Event, options: { requireSuperadmin?: boolean } = {}) {
  const authorization = getHeader(event, 'authorization') ?? ''
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim()

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Falta el token de acceso para validar la sesión.',
    })
  }

  const adminApi = createSupabaseAdminApi(event)
  const authUser = await adminApi.getUserFromAccessToken(accessToken)

  if (!authUser?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'La sesión no es válida o expiró.',
    })
  }

  const currentProfile = await adminApi.selectSingle<AdminProfile>('profiles', {
    columns: 'user_id, role, is_active',
    filters: {
      user_id: `eq.${authUser.id}`,
    },
  })

  if (!currentProfile?.user_id || !isAdminLikeRole(currentProfile.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Solo las cuentas admin o superadmin pueden usar este recurso.',
    })
  }

  if (currentProfile.is_active === false) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Tu cuenta está desactivada.',
    })
  }

  if (options.requireSuperadmin && !canManageAdminAccounts(currentProfile.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Solo una cuenta superadmin puede completar esta acción.',
    })
  }

  return {
    adminApi,
    currentUserId: authUser.id,
    currentProfile,
  }
}
