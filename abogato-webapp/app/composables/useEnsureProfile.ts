import type { AppRole } from '~~/shared/roles'

export function useEnsureProfile() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  return async function ensureProfile(defaultRole: Extract<AppRole, 'cliente' | 'abogado'> = 'cliente') {
    if (!user.value?.id) return

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, role, is_active, display_name, first_name, last_name, contact_email, contact_phone, personal_address, office_address, professional_license_number, professional_license_expires_at, availability_status')
      .eq('user_id', user.value.id)
      .maybeSingle()

    if (error) return

    if (!data) {
      await supabase
        .from('profiles')
        .insert([{
          user_id: user.value.id,
          role: defaultRole,
          is_active: true,
          contact_email: user.value.email ?? null,
          contact_phone: user.value.phone ?? null,
          availability_status: defaultRole === 'abogado' ? 'available' : null,
        }])
    }
  }
}
