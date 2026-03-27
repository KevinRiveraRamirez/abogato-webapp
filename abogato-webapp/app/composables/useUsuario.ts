type Profile = {
  user_id: string
  role: 'cliente' | 'abogado' | 'admin'
  is_active: boolean
  display_name: string | null
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  contact_phone: string | null
  personal_address: string | null
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
      .select('user_id, role, is_active, display_name, first_name, last_name, contact_email, contact_phone, personal_address, office_address')
      .eq('user_id', user.id)
      .maybeSingle()

    profile.value = (data as Profile) ?? null
  }

  return { profile, cargarPerfil }
}
