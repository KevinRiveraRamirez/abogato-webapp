import { getQuery } from 'h3'
import { parseAdminPagination, getAuditProfileLabel } from '~~/server/utils/admin-audit'
import { requireAdminAccess, toSupabaseInFilter } from '~~/server/utils/admin-access'

type AuditChangedFields = Record<string, { old: unknown; new: unknown }>

type ProfileAuditRow = {
  id: string
  profile_user_id: string
  actor_user_id: string | null
  changed_fields: AuditChangedFields
  created_at: string
}

type AuditProfileRow = {
  user_id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  contact_email: string | null
}

export default defineEventHandler(async (event) => {
  const { adminApi } = await requireAdminAccess(event)
  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Falta el identificador del usuario.',
    })
  }

  const targetProfile = await adminApi.selectSingle<{ user_id: string }>('profiles', {
    columns: 'user_id',
    filters: {
      user_id: `eq.${userId}`,
    },
  })

  if (!targetProfile?.user_id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
      message: 'No se encontró el usuario solicitado.',
    })
  }

  const { page, perPage, offset } = parseAdminPagination(getQuery(event), {
    perPage: 5,
    maxPerPage: 20,
  })

  const filters = {
    profile_user_id: `eq.${userId}`,
  }

  const [rows, total] = await Promise.all([
    adminApi.selectRows<ProfileAuditRow>('profile_audit_logs', {
      columns: 'id, profile_user_id, actor_user_id, changed_fields, created_at',
      filters,
      orderBy: {
        column: 'created_at',
        ascending: false,
      },
      limit: perPage,
      offset,
    }),
    adminApi.countRows('profile_audit_logs', filters),
  ])

  const actorIds = [...new Set(
    rows
      .map(row => row.actor_user_id)
      .filter((value): value is string => Boolean(value))
  )]

  const actorProfiles = actorIds.length
    ? await adminApi.selectRows<AuditProfileRow>('profiles', {
        columns: 'user_id, display_name, first_name, last_name, contact_email',
        filters: {
          user_id: `in.${toSupabaseInFilter(actorIds)}`,
        },
      })
    : []

  const actorProfilesById = Object.fromEntries(
    actorProfiles.map(profile => [profile.user_id, profile])
  )

  return {
    items: rows.map(row => ({
      ...row,
      actor_name: row.actor_user_id
        ? getAuditProfileLabel(actorProfilesById[row.actor_user_id], 'Usuario del sistema')
        : 'Sistema',
    })),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
})
