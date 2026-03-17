type Profile = {
  user_id: string
  role: 'cliente' | 'abogado' | 'admin'
  display_name: string | null
  office_address: string | null
}

export function useUsuario() {
  const supabase = useSupabaseClient()
  const profile = ref<Profile | null>(null)

  async function cargarPerfil() {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user?.id) {
      profile.value = null
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('user_id, role, display_name, office_address')
      .eq('user_id', user.id)
      .maybeSingle()

    profile.value = (data as Profile) ?? null
  }

  return { profile, cargarPerfil }
}
