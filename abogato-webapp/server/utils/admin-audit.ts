type PaginationDefaults = {
  page?: number
  perPage?: number
  maxPerPage?: number
}

type QueryRecord = Record<string, unknown>

type DisplayProfile = {
  display_name?: string | null
  contact_email?: string | null
  first_name?: string | null
  last_name?: string | null
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

export function parseAdminPagination(
  query: QueryRecord,
  defaults: PaginationDefaults = {},
) {
  const page = parsePositiveInteger(query.page, defaults.page ?? 1)
  const maxPerPage = defaults.maxPerPage ?? 50
  const requestedPerPage = parsePositiveInteger(query.perPage, defaults.perPage ?? 10)
  const perPage = Math.min(requestedPerPage, maxPerPage)

  return {
    page,
    perPage,
    offset: (page - 1) * perPage,
  }
}

export function getAuditProfileLabel(
  profile: DisplayProfile | null | undefined,
  fallback = 'Usuario del sistema',
) {
  const displayName = profile?.display_name?.trim()

  if (displayName) {
    return displayName
  }

  const firstName = profile?.first_name?.trim()
  const lastName = profile?.last_name?.trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

  if (fullName) {
    return fullName
  }

  const contactEmail = profile?.contact_email?.trim()

  if (contactEmail) {
    return contactEmail
  }

  return fallback
}

export function sanitizeAuditSearchTerm(value: unknown) {
  return String(value ?? '')
    .replace(/[(),"]/g, ' ')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function toSupabaseIlikeValue(term: string) {
  return `*${sanitizeAuditSearchTerm(term)}*`
}

export function parseCsvSelection(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}
