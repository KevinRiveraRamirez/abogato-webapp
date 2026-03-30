import { requireAdminAccess } from '~~/server/utils/admin-access'
import {
  canManageAdminAccounts,
  type AppRole,
} from '~~/shared/roles'

type CreateUserBody = {
  email?: string
  password?: string
  displayName?: string
  role?: Extract<AppRole, 'cliente' | 'abogado' | 'admin'>
  officeAddress?: string
  professionalLicenseNumber?: string
}

const validRoles = new Set<Extract<AppRole, 'cliente' | 'abogado' | 'admin'>>(['cliente', 'abogado', 'admin'])

function buildProfessionalLicenseExpiryDate() {
  const expiryDate = new Date()
  expiryDate.setFullYear(expiryDate.getFullYear() + 5)
  return expiryDate.toISOString()
}

function validatePassword(password: string) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula.'
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número.'
  return ''
}

export default defineEventHandler(async (event) => {
  const { adminApi, currentProfile } = await requireAdminAccess(event)
  const body = await readBody<CreateUserBody>(event).catch(() => ({} as CreateUserBody))

  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const displayName = body.displayName?.trim() ?? ''
  const role = body.role ?? 'abogado'
  const officeAddress = body.officeAddress?.trim() ?? ''
  const professionalLicenseNumber = body.professionalLicenseNumber?.trim().toUpperCase() ?? ''

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'El correo es obligatorio.',
    })
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: passwordError,
    })
  }

  if (!validRoles.has(role)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'El rol seleccionado no es válido.',
    })
  }

  if (role === 'admin' && !canManageAdminAccounts(currentProfile.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Solo una cuenta superadmin puede crear administradores.',
    })
  }

  if (role === 'abogado' && !professionalLicenseNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      message: 'La cédula profesional es obligatoria para crear un abogado.',
    })
  }

  if (professionalLicenseNumber) {
    const duplicateProfessionalLicense = await adminApi.selectSingle<{ user_id: string }>('profiles', {
      columns: 'user_id',
      filters: {
        professional_license_number: `eq.${professionalLicenseNumber}`,
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

  const professionalLicenseExpiresAt = role === 'abogado' && professionalLicenseNumber
    ? buildProfessionalLicenseExpiryDate()
    : null

  const createdUser = await adminApi.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { display_name: displayName } : undefined,
  })

  if (!createdUser?.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User creation failed',
      message: 'No se pudo crear la cuenta.',
    })
  }

  await adminApi.upsertRows('profiles', {
      user_id: createdUser.id,
      role,
      display_name: displayName || null,
      contact_email: email,
      office_address: role === 'cliente' ? null : officeAddress || null,
      professional_license_number: professionalLicenseNumber || null,
      professional_license_expires_at: professionalLicenseExpiresAt,
      availability_status: role === 'abogado' ? 'available' : null,
      is_active: true,
      deactivated_at: null,
    })

  return {
    user: {
      user_id: createdUser.id,
      display_name: displayName || null,
      contact_email: email,
      role,
      office_address: role === 'cliente' ? null : officeAddress || null,
      professional_license_number: professionalLicenseNumber || null,
      professional_license_expires_at: professionalLicenseExpiresAt,
      availability_status: role === 'abogado' ? 'available' : null,
      is_active: true,
    },
  }
})
