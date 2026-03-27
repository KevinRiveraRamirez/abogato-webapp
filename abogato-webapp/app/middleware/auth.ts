export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return navigateTo("/login", { replace: true })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.is_active === false) {
    if (import.meta.client) {
      await supabase.auth.signOut()
    }

    return navigateTo('/login?inactive=1', { replace: true })
  }
})
