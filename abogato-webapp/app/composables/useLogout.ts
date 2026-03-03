export const useLogout = () => {
  const supabase = useSupabaseClient()

  return async () => {
    // 1) Cerrar sesión en Supabase
    await supabase.auth.signOut()

    // 2) Limpiar caches/estado (cliente)
    if (process.client) {
      clearNuxtData()
      clearNuxtState()
    }

    // 3) Redirigir (replace evita volver con Back)
    await navigateTo("/login", { replace: true })
  }
}