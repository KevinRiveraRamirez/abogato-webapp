import type { AppRole, LawyerAvailabilityStatus } from '~~/shared/roles'

type Profile = {
  user_id: string
  role: AppRole
  is_active: boolean
  display_name: string | null
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  contact_phone: string | null
  personal_address: string | null
  office_address: string | null
  professional_license_number: string | null
  professional_license_expires_at: string | null
  availability_status: LawyerAvailabilityStatus | null
}

export function useUsuario() {
  const supabase = useSupabaseClient()
  const profile = useState<Profile | null>('usuario:profile', () => null)

  async function cargarPerfil() {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user?.id) {
      profile.value = null
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('user_id, role, is_active, display_name, first_name, last_name, contact_email, contact_phone, personal_address, office_address, professional_license_number, professional_license_expires_at, availability_status')
      .eq('user_id', user.id)
      .maybeSingle()

    profile.value = (data as Profile) ?? null
  }

  function limpiarPerfil() {
    profile.value = null
  }

  return { profile, cargarPerfil, limpiarPerfil }
}
