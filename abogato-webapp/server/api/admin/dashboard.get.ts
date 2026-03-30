import { requireAdminAccess, toSupabaseInFilter } from '~~/server/utils/admin-access'

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
type TicketPriority = 'low' | 'normal' | 'high'

type TicketRow = {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  created_by: string
  assigned_to: string | null
  created_at: string
  reopen_requested: boolean
}

type NotificationRow = {
  id: string
  title: string
  type: string
  recipient_user_id: string
  created_at: string
}

type ProfileLookup = {
  user_id: string
  display_name: string | null
  contact_email: string | null
}

export default defineEventHandler(async (event) => {
  const { adminApi } = await requireAdminAccess(event)

  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
    cancelledTickets,
    reopenRequests,
    unassignedTickets,
    submittedDocuments,
    approvedDocuments,
    rejectedDocuments,
    totalUsers,
    activeUsers,
    inactiveUsers,
    adminUsers,
    lawyerUsers,
    clientUsers,
  ] = await Promise.all([
    adminApi.countRows('tickets'),
    adminApi.countRows('tickets', { status: 'eq.open' }),
    adminApi.countRows('tickets', { status: 'eq.in_progress' }),
    adminApi.countRows('tickets', { status: 'eq.resolved' }),
    adminApi.countRows('tickets', { status: 'eq.closed' }),
    adminApi.countRows('tickets', { status: 'eq.cancelled' }),
    adminApi.countRows('tickets', { reopen_requested: 'eq.true' }),
    adminApi.countRows('tickets', { assigned_to: 'is.null' }),
    adminApi.countRows('documents', { status: 'eq.submitted' }),
    adminApi.countRows('documents', { status: 'eq.approved' }),
    adminApi.countRows('documents', { status: 'eq.rejected' }),
    adminApi.countRows('profiles'),
    adminApi.countRows('profiles', { is_active: 'eq.true' }),
    adminApi.countRows('profiles', { is_active: 'eq.false' }),
    adminApi.countRows('profiles', { role: `in.${toSupabaseInFilter(['admin', 'superadmin'])}` }),
    adminApi.countRows('profiles', { role: 'eq.abogado' }),
    adminApi.countRows('profiles', { role: 'eq.cliente' }),
  ])

  const [recentTickets, recentNotifications] = await Promise.all([
    adminApi.selectRows<TicketRow>('tickets', {
      columns: 'id, title, status, priority, created_by, assigned_to, created_at, reopen_requested',
      orderBy: { column: 'created_at', ascending: false },
      limit: 6,
    }),
    adminApi.selectRows<NotificationRow>('notifications', {
      columns: 'id, title, type, recipient_user_id, created_at',
      orderBy: { column: 'created_at', ascending: false },
      limit: 6,
    }),
  ])

  const relatedUserIds = [
    ...new Set([
      ...((recentTickets ?? []) as TicketRow[]).flatMap(ticket => [ticket.created_by, ticket.assigned_to].filter(Boolean) as string[]),
      ...((recentNotifications ?? []) as NotificationRow[]).map(item => item.recipient_user_id),
    ]),
  ]

  let namesByUserId = new Map<string, string>()

  if (relatedUserIds.length) {
    const profiles = await adminApi.selectRows<ProfileLookup>('profiles', {
      columns: 'user_id, display_name, contact_email',
      filters: {
        user_id: `in.${toSupabaseInFilter(relatedUserIds)}`,
      },
    })

    namesByUserId = new Map(
      profiles.map((profile) => [
        profile.user_id,
        profile.display_name || profile.contact_email || 'Usuario',
      ])
    )
  }

  return {
    summary: {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      cancelledTickets,
      reopenRequests,
      unassignedTickets,
      submittedDocuments,
      approvedDocuments,
      rejectedDocuments,
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      lawyerUsers,
      clientUsers,
    },
    ticketsByStatus: [
      { key: 'open', label: 'Pendientes', value: openTickets },
      { key: 'in_progress', label: 'En revisión', value: inProgressTickets },
      { key: 'resolved', label: 'Resueltos', value: resolvedTickets },
      { key: 'closed', label: 'Cerrados', value: closedTickets },
      { key: 'cancelled', label: 'Cancelados', value: cancelledTickets },
    ],
    documentsByStatus: [
      { key: 'submitted', label: 'Pendientes de revisar', value: submittedDocuments },
      { key: 'approved', label: 'Aprobados', value: approvedDocuments },
      { key: 'rejected', label: 'Rechazados', value: rejectedDocuments },
    ],
    usersByRole: [
      { key: 'admin', label: 'Equipo admin', value: adminUsers },
      { key: 'abogado', label: 'Abogados', value: lawyerUsers },
      { key: 'cliente', label: 'Clientes', value: clientUsers },
    ],
    recentTickets: recentTickets.map(ticket => ({
      ...ticket,
      created_by_name: namesByUserId.get(ticket.created_by) ?? 'Cliente',
      assigned_to_name: ticket.assigned_to ? namesByUserId.get(ticket.assigned_to) ?? 'Asignado' : null,
    })),
    recentNotifications: recentNotifications.map(notification => ({
      ...notification,
      recipient_name: namesByUserId.get(notification.recipient_user_id) ?? 'Usuario',
    })),
  }
})
