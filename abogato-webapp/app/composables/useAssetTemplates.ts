import type { Ref } from 'vue'

export type AssetType = 'mueble' | 'inmueble'
export type AssetTemplateFieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean'

export type AssetTemplateField = {
  key: string
  label: string
  type: AssetTemplateFieldType
  required?: boolean
  help?: string
  placeholder?: string
}

export type AssetTemplate = {
  id: string
  title: string
  asset_type: AssetType
  category: string | null
  fields: AssetTemplateField[]
  activo: boolean
  created_at: string | null
  updated_at: string | null
}

export function useAssetTemplates() {
  const supabase = useSupabaseClient()

  const cache = useState<Record<string, AssetTemplate[]>>('asset-templates:cache', () => ({}))
  const loading = useState<boolean>('asset-templates:loading', () => false)
  const lastError = useState<string | null>('asset-templates:last-error', () => null)
  const templates = useState<AssetTemplate[]>('asset-templates:list', () => [])

  async function loadTemplatesByType(assetType: AssetType, { force = false } = {}) {
    lastError.value = null

    if (!force && cache.value[assetType]?.length) {
      templates.value = cache.value[assetType]
      return
    }

    loading.value = true

    const { data, error } = await supabase
      .from('asset_templates')
      .select('id, title, asset_type, category, fields, activo, created_at, updated_at')
      .eq('asset_type', assetType)
      .eq('activo', true)
      .order('updated_at', { ascending: false })

    loading.value = false

    if (error) {
      lastError.value = error.message
      templates.value = []
      return
    }

    const normalized = (data ?? []) as AssetTemplate[]
    cache.value[assetType] = normalized
    templates.value = normalized
  }

  function clearCache() {
    cache.value = {}
  }

  return {
    templates,
    loading,
    lastError,
    loadTemplatesByType,
    clearCache,
  }
}

