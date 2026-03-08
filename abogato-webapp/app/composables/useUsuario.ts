type Profile = {
  user_id: string
  role: 'cliente' | 'abogado' | 'admin'
  display_name: string | null
}

export function useUsuario() {
  const supabase = useSupabaseClient()
  const authUser = useSupabaseUser()
  const profile = ref<Profile | null>(null)

  async function cargarPerfil() {
    if (!authUser.value?.id) {
      profile.value = null
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('user_id, role, display_name')
      .eq('user_id', authUser.value.id)
      .maybeSingle()

    profile.value = (data as Profile) ?? null
  }

  return { profile, cargarPerfil }
}
