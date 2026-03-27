export function useAdminApi() {
  const supabase = useSupabaseClient()

  async function authHeaders() {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (!accessToken) {
      throw new Error('No se encontró una sesión activa para esta acción.')
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    }
  }

  async function adminFetch<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
    const headers = await authHeaders()

    return $fetch<T>(url, {
      ...options,
      headers: {
        ...headers,
        ...(options?.headers ?? {}),
      },
    })
  }

  return { adminFetch }
}
