export const useMyProfile = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const getMyProfile = async () => {
    if (!user.value) return null

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.value.id)
      .single()

    if (error) {
      // Si el perfil no existe todavía, retorna null y lo resolvemos con ensureProfile
      return null
    }

    return data as { id: string; role: string }
  }

  return { getMyProfile }
}