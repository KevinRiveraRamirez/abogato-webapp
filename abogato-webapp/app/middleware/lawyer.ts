export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/login', { replace: true })
  }

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.value.id)
    .maybeSingle()

  if (!data || (data.role !== 'abogado' && data.role !== 'admin')) {
    return navigateTo('/tickets', { replace: true })
  }
})
