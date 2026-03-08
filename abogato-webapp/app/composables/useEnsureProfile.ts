export function useEnsureProfile() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  return async function ensureProfile(defaultRole: 'cliente' | 'abogado' = 'cliente') {
    if (!user.value?.id) return

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, role, display_name')
      .eq('user_id', user.value.id)
      .maybeSingle()

    if (error) return

    if (!data) {
      await supabase
        .from('profiles')
        .insert([{ user_id: user.value.id, role: defaultRole }])
    }
  }
}
