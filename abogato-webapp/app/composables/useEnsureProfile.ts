export function useEnsureProfile() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  return async function ensureProfile(defaultRole: 'cliente' | 'abogado' = 'cliente') {
    if (!user.value?.id) return

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, role, display_name, first_name, last_name, contact_email, contact_phone, personal_address, office_address')
      .eq('user_id', user.value.id)
      .maybeSingle()

    if (error) return

    if (!data) {
      await supabase
        .from('profiles')
        .insert([{
          user_id: user.value.id,
          role: defaultRole,
          contact_email: user.value.email ?? null,
          contact_phone: user.value.phone ?? null
        }])
    }
  }
}
