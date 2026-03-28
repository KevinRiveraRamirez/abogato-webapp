export const useLogout = () => {
  const supabase = useSupabaseClient()
  const { finish } = useSessionLoading()
  const { limpiarPerfil } = useUsuario()

  return async () => {
    finish()
    limpiarPerfil()
    await supabase.auth.signOut()
    await navigateTo("/login", { replace: true })
  }
}
