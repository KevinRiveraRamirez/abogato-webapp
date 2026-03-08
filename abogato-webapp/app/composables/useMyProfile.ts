export const useMyProfile = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const getMyProfile = async () => {
    if (!user.value) return null

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, role")
      .eq("user_id", user.value.id)
      .maybeSingle()

    if (error) return null

    return data as { user_id: string; role: string }
  }

  return { getMyProfile }
}