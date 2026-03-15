export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return navigateTo('/login', { replace: true })
  }

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data || (data.role !== 'abogado' && data.role !== 'admin')) {
    return navigateTo('/tickets', { replace: true })
  }
})