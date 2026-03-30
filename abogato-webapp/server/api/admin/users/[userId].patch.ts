import { requireAdminAccess } from '~~/server/utils/admin-access'
import {
  canManageAdminAccounts,
  isSuperadminRole,
  type AppRole,
  type LawyerAvailabilityStatus,
} from '~~/shared/roles'

type UpdateUserBody = {
  role?: Extract<AppRole, 'cliente' | 'abogado' | 'admin'>
  isActive?: boolean
  officeAddress?: string | null
  professionalLicenseNumber?: string | null
  availabilityStatus?: LawyerAvailabilityStatus | null
}

const validRoles = new Set<Extract<AppRole, 'cliente' | 'abogado' | 'admin'>>(['cliente', 'abogado', 'admin'])
const validAvailabilityStatuses = new Set<LawyerAvailabilityStatus>(['available', 'busy', 'offline'])

function buildProfessionalLicenseExpiryDate() {
  const expiryDate = new Date()
  expiryDate.setFullYear(expiryDate.getFullYear() + 5)
  return expiryDate.toISOString()
}

export default defineEventHandler(async (event) => {
  const { adminApi, currentUserId, currentProfile } = await requireAdminAccess(event)
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

  if (userId === currentUserId && body.role && body.role !== currentProfile.role) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'No podés cambiar tu propio rol desde esta vista.',
    })
  }

  const targetProfile = await adminApi.selectSingle<{
    user_id: string
    role: AppRole
    professional_license_number: string | null
  }>('profiles', {
    columns: 'user_id, role, professional_license_number',
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

  if (
    !canManageAdminAccounts(currentProfile.role)
    && (targetProfile.role === 'admin' || targetProfile.role === 'superadmin')
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Solo una cuenta superadmin puede editar administradores.',
    })
  }

  if (targetProfile.role === 'superadmin' && !isSuperadminRole(currentProfile.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Solo una cuenta superadmin puede editar otra cuenta superadmin.',
    })
  }

  const updates: Record<string, unknown> = {}
  const nextRole = body.role ?? targetProfile.role
  const normalizedProfessionalLicenseNumber = body.professionalLicenseNumber === undefined
    ? targetProfile.professional_license_number
    : body.professionalLicenseNumber?.trim().toUpperCase() || null
  const requiresProfessionalLicenseNow = nextRole === 'abogado'
    && (
      body.role === 'abogado'
      || body.professionalLicenseNumber !== undefined
      || targetProfile.role !== 'abogado'
    )

  if (body.role !== undefined) {
    if (!validRoles.has(body.role)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        message: 'El rol seleccionado no es válido.',
      })
    }

    if (body.role === 'admin' && !canManageAdminAccounts(currentProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Solo una cuenta superadmin puede asignar el rol admin.',
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

  if (body.professionalLicenseNumber !== undefined) {
    if (nextRole !== 'abogado' && normalizedProfessionalLicenseNumber) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        message: 'La cédula profesional solo aplica a cuentas con rol abogado.',
      })
    }

    updates.professional_license_number = normalizedProfessionalLicenseNumber
    updates.professional_license_expires_at = normalizedProfessionalLicenseNumber
      ? buildProfessionalLicenseExpiryDate()
      : null
  }

  if (requiresProfessionalLicenseNow && !normalizedProfessionalLicenseNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'La cédula profesional es obligatoria para las cuentas abogado.',
    })
  }

  if (normalizedProfessionalLicenseNumber) {
    const duplicateProfessionalLicense = await adminApi.selectSingle<{ user_id: string }>('profiles', {
      columns: 'user_id',
      filters: {
        professional_license_number: `eq.${normalizedProfessionalLicenseNumber}`,
        user_id: `neq.${userId}`,
      },
    })

    if (duplicateProfessionalLicense?.user_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        message: 'La cédula profesional ya está registrada en otra cuenta.',
      })
    }
  }

  if (body.availabilityStatus !== undefined) {
    if (body.availabilityStatus !== null && !validAvailabilityStatuses.has(body.availabilityStatus)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        message: 'El estado de disponibilidad no es válido.',
      })
    }

    if (nextRole !== 'abogado' && body.availabilityStatus) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation error',
        message: 'Solo las cuentas abogado pueden tener disponibilidad operativa.',
      })
    }

    updates.availability_status = nextRole === 'abogado' ? (body.availabilityStatus ?? 'available') : null
  } else if (body.role === 'abogado' && targetProfile.role !== 'abogado') {
    updates.availability_status = 'available'
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
    professional_license_number: string | null
    professional_license_expires_at: string | null
    availability_status: LawyerAvailabilityStatus | null
    is_active: boolean
    deactivated_at: string | null
  }>('profiles', updates, {
    filters: {
      user_id: `eq.${userId}`,
    },
    columns: 'user_id, role, display_name, contact_email, office_address, professional_license_number, professional_license_expires_at, availability_status, is_active, deactivated_at',
  })

  return { user: data }
})
