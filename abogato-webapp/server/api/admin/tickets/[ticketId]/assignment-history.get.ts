import { getQuery } from 'h3'
import { getAuditProfileLabel, parseAdminPagination } from '~~/server/utils/admin-audit'
import { requireAdminAccess, toSupabaseInFilter } from '~~/server/utils/admin-access'

type TicketAssignmentSource = 'auto' | 'manual' | 'self' | 'unassigned'

type TicketAssignmentHistoryRow = {
  id: string
  ticket_id: string
  previous_assigned_to: string | null
  assigned_to: string | null
  assigned_by: string | null
  assignment_source: TicketAssignmentSource
  notes: string | null
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
  const ticketId = getRouterParam(event, 'ticketId')

  if (!ticketId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Falta el identificador del ticket.',
    })
  }

  const targetTicket = await adminApi.selectSingle<{ id: string }>('tickets', {
    columns: 'id',
    filters: {
      id: `eq.${ticketId}`,
    },
  })

  if (!targetTicket?.id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
      message: 'No se encontró el ticket solicitado.',
    })
  }

  const { page, perPage, offset } = parseAdminPagination(getQuery(event), {
    perPage: 5,
    maxPerPage: 20,
  })

  const filters = {
    ticket_id: `eq.${ticketId}`,
  }

  const [rows, total] = await Promise.all([
    adminApi.selectRows<TicketAssignmentHistoryRow>('ticket_assignment_history', {
      columns: 'id, ticket_id, previous_assigned_to, assigned_to, assigned_by, assignment_source, notes, created_at',
      filters,
      orderBy: {
        column: 'created_at',
        ascending: false,
      },
      limit: perPage,
      offset,
    }),
    adminApi.countRows('ticket_assignment_history', filters),
  ])

  const relatedProfileIds = [...new Set(
    rows.flatMap(row => [
      row.previous_assigned_to,
      row.assigned_to,
      row.assigned_by,
    ]).filter((value): value is string => Boolean(value))
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
      assigned_by_name: row.assigned_by
        ? getAuditProfileLabel(relatedProfilesById[row.assigned_by], 'Usuario del sistema')
        : 'Sistema',
      previous_assigned_to_name: row.previous_assigned_to
        ? getAuditProfileLabel(relatedProfilesById[row.previous_assigned_to], 'Abogado no disponible')
        : 'Sin asignar',
      assigned_to_name: row.assigned_to
        ? getAuditProfileLabel(relatedProfilesById[row.assigned_to], 'Abogado no disponible')
        : 'Sin asignar',
    })),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
})
