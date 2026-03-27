import { requireAdminAccess } from '~~/server/utils/admin-access'

type AppRole = 'cliente' | 'abogado' | 'admin'

type UpdateUserBody = {
  role?: AppRole
  isActive?: boolean
  officeAddress?: string | null
}

const validRoles = new Set<AppRole>(['cliente', 'abogado', 'admin'])

export default defineEventHandler(async (event) => {
  const { adminApi, currentUserId } = await requireAdminAccess(event)
  const userId = getRouterParam(event, 'userId')
  const body = await readBody<UpdateUserBody>(event).catch(() => ({} as UpdateUserBody))

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'Falta el identificador del usuario.',
    })
  }

  if (userId === currentUserId && body.isActive === false) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'No podés desactivar tu propia cuenta.',
    })
  }

  if (userId === currentUserId && body.role && body.role !== 'admin') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'No podés quitarte el rol de admin desde esta vista.',
    })
  }

  const updates: Record<string, unknown> = {}

  if (body.role !== undefined) {
    if (!validRoles.has(body.role)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        message: 'El rol seleccionado no es válido.',
      })
    }

    updates.role = body.role

    if (body.role === 'cliente' && body.officeAddress === undefined) {
      updates.office_address = null
    }
  }

  if (body.isActive !== undefined) {
    updates.is_active = body.isActive
    updates.deactivated_at = body.isActive ? null : new Date().toISOString()
  }

  if (body.officeAddress !== undefined) {
    updates.office_address = body.officeAddress?.trim() || null
  }

  if (!Object.keys(updates).length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'No hay cambios para aplicar.',
    })
  }

  const data = await adminApi.updateSingle<{
    user_id: string
    role: AppRole
    display_name: string | null
    contact_email: string | null
    office_address: string | null
    is_active: boolean
    deactivated_at: string | null
  }>('profiles', updates, {
    filters: {
      user_id: `eq.${userId}`,
    },
    columns: 'user_id, role, display_name, contact_email, office_address, is_active, deactivated_at',
  })

  if (!data?.user_id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
      message: 'No se encontró el usuario solicitado.',
    })
  }

  return { user: data }
})
