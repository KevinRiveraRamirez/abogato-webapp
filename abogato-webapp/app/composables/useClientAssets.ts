// app/composables/useClientAssets.ts
import type { Ref } from 'vue'

type AssetType = 'mueble' | 'inmueble'

export type ClientAsset = {
  id: string
  owner_user_id: string
  asset_type: AssetType
  name: string
  template_id: string | null
  field_values: Record<string, unknown> | null
  category: string | null
  main_identifier: string | null
  location: string | null
  estimated_value: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ClientAssetInput = {
  asset_type: AssetType
  name: string
  template_id?: string | null
  field_values?: Record<string, unknown> | null
  category?: string | null
  main_identifier?: string | null
  location?: string | null
  estimated_value?: number | null
  notes?: string | null
}

export function useClientAssets() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const assets = useState<ClientAsset[]>('client-assets:list', () => [])
  const loading = useState<boolean>('client-assets:loading', () => false)
  const lastError = useState<string | null>('client-assets:last-error', () => null)

  const hasAssets: Ref<boolean> = computed(() => assets.value.length > 0)

  async function resolveUserId() {
    if (user.value?.id) return user.value.id

    const { data, error } = await supabase.auth.getUser()
    if (error) return null

    return data.user?.id ?? null
  }

  async function loadAssets() {
    lastError.value = null
    const userId = await resolveUserId()
    if (!userId) {
      assets.value = []
      return
    }

    loading.value = true

    const { data, error } = await supabase
      .from('client_assets')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    loading.value = false

    if (error) {
      lastError.value = error.message
      assets.value = []
      return
    }

    assets.value = (data ?? []) as ClientAsset[]
  }

  async function createAsset(input: ClientAssetInput) {
    lastError.value = null
    const userId = await resolveUserId()
    if (!userId) {
      lastError.value = 'No hay usuario autenticado.'
      return null
    }

    loading.value = true

    const payload = {
      owner_user_id: userId,
      asset_type: input.asset_type,
      name: input.name.trim(),
      template_id: input.template_id ?? null,
      field_values: input.field_values ?? {},
      category: input.category ?? null,
      main_identifier: input.main_identifier ?? null,
      location: input.location ?? null,
      estimated_value: input.estimated_value ?? null,
      notes: input.notes ?? null,
    }

    const { data, error } = await supabase
      .from('client_assets')
      .insert(payload)
      .select('*')
      .single()

    loading.value = false

    if (error) {
      lastError.value = error.message
      return null
    }

    const created = data as ClientAsset
    assets.value = [created, ...assets.value]
    return created
  }

  async function updateAsset(id: string, input: ClientAssetInput) {
    lastError.value = null
    const userId = await resolveUserId()
    if (!userId) {
      lastError.value = 'No hay usuario autenticado.'
      return null
    }

    loading.value = true

    const payload = {
      asset_type: input.asset_type,
      name: input.name.trim(),
      template_id: input.template_id ?? null,
      field_values: input.field_values ?? {},
      category: input.category ?? null,
      main_identifier: input.main_identifier ?? null,
      location: input.location ?? null,
      estimated_value: input.estimated_value ?? null,
      notes: input.notes ?? null,
    }

    const { data, error } = await supabase
      .from('client_assets')
      .update(payload)
      .eq('id', id)
      .eq('owner_user_id', userId)
      .select('*')
      .single()

    loading.value = false

    if (error) {
      lastError.value = error.message
      return null
    }

    const updated = data as ClientAsset
    assets.value = assets.value.map(asset => (asset.id === id ? updated : asset))
    return updated
  }

  async function softDeleteAsset(id: string) {
    lastError.value = null
    const userId = await resolveUserId()
    if (!userId) {
      lastError.value = 'No hay usuario autenticado.'
      return false
    }

    loading.value = true

    const { error } = await supabase
      .from('client_assets')
      .update({ is_active: false })
      .eq('id', id)
      .eq('owner_user_id', userId)

    loading.value = false

    if (error) {
      lastError.value = error.message
      return false
    }

    assets.value = assets.value.filter(asset => asset.id !== id)
    return true
  }

  return {
    assets,
    hasAssets,
    loading,
    lastError,
    loadAssets,
    createAsset,
    updateAsset,
    softDeleteAsset,
  }
}

