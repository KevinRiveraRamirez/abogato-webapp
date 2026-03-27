import { requireAdminAccess } from '~~/server/utils/admin-access'

type AppRole = 'cliente' | 'abogado' | 'admin'

type CreateUserBody = {
  email?: string
  password?: string
  displayName?: string
  role?: AppRole
  officeAddress?: string
}

const validRoles = new Set<AppRole>(['cliente', 'abogado', 'admin'])

function validatePassword(password: string) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'La contraseña debe incluir al menos una mayúscula.'
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número.'
  return ''
}

export default defineEventHandler(async (event) => {
  const { adminApi } = await requireAdminAccess(event)
  const body = await readBody<CreateUserBody>(event).catch(() => ({} as CreateUserBody))

  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  const displayName = body.displayName?.trim() ?? ''
  const role = body.role ?? 'abogado'
  const officeAddress = body.officeAddress?.trim() ?? ''

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
      is_active: true,
    },
  }
})
