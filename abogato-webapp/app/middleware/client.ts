import { isAdminLikeRole } from '~~/shared/roles'

export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return navigateTo('/login', { replace: true })
  }

  const { data } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) {
    return navigateTo('/tickets', { replace: true })
  }

  if (data.is_active === false) {
    if (import.meta.client) {
      await supabase.auth.signOut()
    }

    return navigateTo('/login?inactive=1', { replace: true })
  }

  if (isAdminLikeRole(data.role)) {
    return navigateTo('/admin/dashboard', { replace: true })
  }

  if (data.role === 'abogado') {
    return navigateTo('/lawyer/dashboard', { replace: true })
  }

  if (data.role !== 'cliente') {
    return navigateTo('/tickets', { replace: true })
  }
})
