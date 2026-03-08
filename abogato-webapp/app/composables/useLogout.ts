export const useLogout = () => {
  const supabase = useSupabaseClient()

  return async () => {
    await supabase.auth.signOut()
    await navigateTo("/login", { replace: true })
  }
}
