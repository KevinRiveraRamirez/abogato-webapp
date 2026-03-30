import { getQuery } from 'h3'
import {
  getAuditProfileLabel,
  parseAdminPagination,
  parseCsvSelection,
  sanitizeAuditSearchTerm,
  toSupabaseIlikeValue,
} from '~~/server/utils/admin-audit'
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

type TicketRow = {
  id: string
  title: string
}

const VALID_SOURCES = new Set<TicketAssignmentSource>(['auto', 'manual', 'self', 'unassigned'])

export default defineEventHandler(async (event) => {
  const { adminApi } = await requireAdminAccess(event)
  const query = getQuery(event)
  const { page, perPage, offset } = parseAdminPagination(query, {
    perPage: 10,
    maxPerPage: 50,
  })
  const searchTerm = sanitizeAuditSearchTerm(query.search)
  const selectedSources = parseCsvSelection(query.sources)
    .filter((value): value is TicketAssignmentSource => VALID_SOURCES.has(value as TicketAssignmentSource))

  const filters: Record<string, string> = {}

  if (selectedSources.length && selectedSources.length < VALID_SOURCES.size) {
    filters.assignment_source = `in.${toSupabaseInFilter(selectedSources)}`
  }

  if (searchTerm) {
    const [matchingProfiles, matchingTickets] = await Promise.all([
      adminApi.selectRows<AuditProfileRow>('profiles', {
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
      }),
      adminApi.selectRows<TicketRow>('tickets', {
        columns: 'id, title',
        filters: {
          title: `ilike.${toSupabaseIlikeValue(searchTerm)}`,
        },
        limit: 50,
      }),
    ])

    const matchingProfileIds = [...new Set(matchingProfiles.map(profile => profile.user_id))]
    const matchingTicketIds = [...new Set(matchingTickets.map(ticket => ticket.id))]
    const orClauses: string[] = [`notes.ilike.${toSupabaseIlikeValue(searchTerm)}`]

    if (matchingProfileIds.length) {
      const idsFilter = toSupabaseInFilter(matchingProfileIds)
      orClauses.push(`assigned_by.in.${idsFilter}`)
      orClauses.push(`assigned_to.in.${idsFilter}`)
      orClauses.push(`previous_assigned_to.in.${idsFilter}`)
    }

    if (matchingTicketIds.length) {
      orClauses.push(`ticket_id.in.${toSupabaseInFilter(matchingTicketIds)}`)
    }

    filters.or = `(${orClauses.join(',')})`
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
  const relatedTicketIds = [...new Set(rows.map(row => row.ticket_id))]

  const [relatedProfiles, relatedTickets] = await Promise.all([
    relatedProfileIds.length
      ? adminApi.selectRows<AuditProfileRow>('profiles', {
          columns: 'user_id, display_name, first_name, last_name, contact_email',
          filters: {
            user_id: `in.${toSupabaseInFilter(relatedProfileIds)}`,
          },
        })
      : Promise.resolve([] as AuditProfileRow[]),
    relatedTicketIds.length
      ? adminApi.selectRows<TicketRow>('tickets', {
          columns: 'id, title',
          filters: {
            id: `in.${toSupabaseInFilter(relatedTicketIds)}`,
          },
        })
      : Promise.resolve([] as TicketRow[]),
  ])

  const relatedProfilesById = Object.fromEntries(
    relatedProfiles.map(profile => [profile.user_id, profile])
  )
  const relatedTicketsById = Object.fromEntries(
    relatedTickets.map(ticket => [ticket.id, ticket])
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
      ticket_title: relatedTicketsById[row.ticket_id]?.title ?? 'Ticket sin título',
    })),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
})
