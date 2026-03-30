import { getQuery } from 'h3'
import {
  getAuditProfileLabel,
  parseAdminPagination,
  parseCsvSelection,
  sanitizeAuditSearchTerm,
  toSupabaseIlikeValue,
} from '~~/server/utils/admin-audit'
import { requireAdminAccess, toSupabaseInFilter } from '~~/server/utils/admin-access'

type ProfileAuditOrigin = 'manual' | 'system'
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

const VALID_ORIGINS = new Set<ProfileAuditOrigin>(['manual', 'system'])

export default defineEventHandler(async (event) => {
  const { adminApi } = await requireAdminAccess(event)
  const query = getQuery(event)
  const { page, perPage, offset } = parseAdminPagination(query, {
    perPage: 10,
    maxPerPage: 50,
  })
  const searchTerm = sanitizeAuditSearchTerm(query.search)
  const selectedOrigins = parseCsvSelection(query.origins)
    .filter((value): value is ProfileAuditOrigin => VALID_ORIGINS.has(value as ProfileAuditOrigin))

  const filters: Record<string, string> = {}

  if (selectedOrigins.length === 1) {
    filters.actor_user_id = selectedOrigins[0] === 'manual'
      ? 'not.is.null'
      : 'is.null'
  }

  if (searchTerm) {
    const matchingProfiles = await adminApi.selectRows<AuditProfileRow>('profiles', {
      columns: 'user_id, display_name, first_name, last_name, contact_email',
      filters: {
        or: `(
          display_name.ilike.${toSupabaseIlikeValue(searchTerm)},
          contact_email.ilike.${toSupabaseIlikeValue(searchTerm)},
          first_name.ilike.${toSupabaseIlikeValue(searchTerm)},
          last_name.ilike.${toSupabaseIlikeValue(searchTerm)}
        )`.replace(/\s+/g, ''),
      },
      limit: 50,
    })

    const matchingProfileIds = [...new Set(matchingProfiles.map(profile => profile.user_id))]

    if (!matchingProfileIds.length) {
      return {
        items: [],
        page,
        perPage,
        total: 0,
        totalPages: 1,
      }
    }

    filters.or = `(
      actor_user_id.in.${toSupabaseInFilter(matchingProfileIds)},
      profile_user_id.in.${toSupabaseInFilter(matchingProfileIds)}
    )`.replace(/\s+/g, '')
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

  const relatedProfileIds = [...new Set(
    rows.flatMap(row => [row.actor_user_id, row.profile_user_id].filter((value): value is string => Boolean(value)))
  )]

  const relatedProfiles = relatedProfileIds.length
    ? await adminApi.selectRows<AuditProfileRow>('profiles', {
        columns: 'user_id, display_name, first_name, last_name, contact_email',
        filters: {
          user_id: `in.${toSupabaseInFilter(relatedProfileIds)}`,
        },
      })
    : []

  const relatedProfilesById = Object.fromEntries(
    relatedProfiles.map(profile => [profile.user_id, profile])
  )

  return {
    items: rows.map(row => ({
      ...row,
      actor_name: row.actor_user_id
        ? getAuditProfileLabel(relatedProfilesById[row.actor_user_id], 'Usuario del sistema')
        : 'Sistema',
      target_name: getAuditProfileLabel(relatedProfilesById[row.profile_user_id], 'Cuenta sin nombre'),
      target_email: relatedProfilesById[row.profile_user_id]?.contact_email ?? null,
      change_count: Object.keys(row.changed_fields ?? {}).length,
    })),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
})
