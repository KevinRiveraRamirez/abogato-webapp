<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

type AssetType = 'mueble' | 'inmueble'

type AssetTemplateField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'boolean'
  required?: boolean
  help?: string
  placeholder?: string
}

type AssetTemplate = {
  id: string
  title: string
  asset_type: AssetType
  category: string | null
  fields: AssetTemplateField[]
  activo: boolean
  created_at: string | null
}

const supabase = useSupabaseClient()

const templates = ref<AssetTemplate[]>([])
const loading = ref(false)
const errorMsg = ref('')
const busqueda = ref('')
const filtrosTipo = ref<AssetType[]>([])
const filtrosEstado = ref<Array<'activas' | 'inactivas'>>([])

const filtrosTipoOptions: Array<{ label: string; value: AssetType }> = [
  { label: 'Mueble', value: 'mueble' },
  { label: 'Inmueble', value: 'inmueble' },
]

function matchesFilters(t: AssetTemplate) {
  const term = busqueda.value.trim().toLowerCase()
  const okTipo = !filtrosTipo.value.length || filtrosTipo.value.includes(t.asset_type)
  const okEstado = !filtrosEstado.value.length
    || (filtrosEstado.value.includes('activas') && t.activo)
    || (filtrosEstado.value.includes('inactivas') && !t.activo)
  if (!okTipo || !okEstado) return false
  if (!term) return true

  const searchable = [
    t.title,
    t.asset_type,
    t.category ?? '',
    ...(t.fields ?? []).flatMap(f => [f.key, f.label, f.type, f.help ?? '']),
  ]
    .join(' ')
    .toLowerCase()

  return searchable.includes(term)
}

const templatesFiltradas = computed(() => templates.value.filter(matchesFilters))

async function loadTemplates() {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('asset_templates')
    .select('id, title, asset_type, category, fields, activo, created_at')
    .order('updated_at', { ascending: false })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    templates.value = []
    return
  }

  templates.value = (data ?? []) as AssetTemplate[]
}

async function toggleActivo(template: AssetTemplate) {
  const { error } = await supabase
    .from('asset_templates')
    .update({ activo: !template.activo })
    .eq('id', template.id)

  if (error) {
    errorMsg.value = error.message
    return
  }

  templates.value = templates.value.map(t => (t.id === template.id ? { ...t, activo: !t.activo } : t))
}

onMounted(() => {
  void loadTemplates()
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6">
    <AppPageHeader
      eyebrow="Admin"
      title="Plantillas de bienes"
      description="Creá y mantené plantillas para capturar datos relevantes de bienes muebles e inmuebles desde la UI."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :loading="loading" @click="loadTemplates">
          Actualizar
        </UButton>
        <UButton to="/admin/plantillas/bienes/nueva">
          Nueva plantilla
        </UButton>
      </template>
    </AppPageHeader>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo cargar las plantillas"
      :description="errorMsg"
    />

    <UCard>
      <template #header>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0">
            <h2 class="font-semibold text-highlighted">Catálogo</h2>
            <p class="mt-1 text-sm text-muted">Filtrá y abrí una plantilla para editarla.</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UInput v-model="busqueda" placeholder="Buscar por título, tipo, categoría o campos..." class="w-[min(100%,22rem)]" />
          </div>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-default/80 bg-default/95 p-4">
          <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Tipo</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              v-for="opt in filtrosTipoOptions"
              :key="opt.value"
              size="sm"
              :color="filtrosTipo.includes(opt.value) ? 'primary' : 'neutral'"
              :variant="filtrosTipo.includes(opt.value) ? 'solid' : 'outline'"
              @click="filtrosTipo = filtrosTipo.includes(opt.value) ? filtrosTipo.filter(v => v !== opt.value) : [...filtrosTipo, opt.value]"
            >
              {{ opt.label }}
            </UButton>
          </div>
        </div>

        <div class="rounded-2xl border border-default/80 bg-default/95 p-4">
          <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Estado</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              size="sm"
              :color="filtrosEstado.length === 0 ? 'primary' : 'neutral'"
              :variant="filtrosEstado.length === 0 ? 'solid' : 'outline'"
              @click="filtrosEstado = []"
            >
              Todas
            </UButton>
            <UButton
              size="sm"
              :color="filtrosEstado.includes('activas') ? 'primary' : 'neutral'"
              :variant="filtrosEstado.includes('activas') ? 'solid' : 'outline'"
              @click="filtrosEstado = filtrosEstado.includes('activas') ? filtrosEstado.filter(v => v !== 'activas') : [...filtrosEstado, 'activas']"
            >
              Activas
            </UButton>
            <UButton
              size="sm"
              :color="filtrosEstado.includes('inactivas') ? 'primary' : 'neutral'"
              :variant="filtrosEstado.includes('inactivas') ? 'solid' : 'outline'"
              @click="filtrosEstado = filtrosEstado.includes('inactivas') ? filtrosEstado.filter(v => v !== 'inactivas') : [...filtrosEstado, 'inactivas']"
            >
              Inactivas
            </UButton>
          </div>
        </div>

        <div class="rounded-2xl border border-default/80 bg-default/95 p-4">
          <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Resumen</p>
          <p class="mt-3 text-3xl font-semibold text-highlighted">{{ templatesFiltradas.length }}</p>
          <p class="mt-1 text-sm text-muted">Plantillas visibles con los filtros actuales.</p>
        </div>
      </div>

      <div v-if="loading && !templates.length" class="mt-6">
        <SkeletonListCards :items="4" />
      </div>

      <div v-else-if="!templatesFiltradas.length" class="mt-6 rounded-2xl border border-dashed border-default px-4 py-10 text-center">
        <p class="font-medium text-highlighted">No hay plantillas para este filtro.</p>
        <p class="mt-2 text-sm text-muted">Probá ajustar la búsqueda o limpiar filtros.</p>
      </div>

      <div v-else class="mt-6 grid gap-3">
        <div
          v-for="t in templatesFiltradas"
          :key="t.id"
          class="rounded-2xl border border-default/80 bg-default/95 p-4 shadow-sm"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-semibold text-highlighted">{{ t.title }}</p>
                <UBadge :color="t.asset_type === 'mueble' ? 'primary' : 'neutral'" variant="subtle" size="sm">
                  {{ t.asset_type === 'mueble' ? 'Mueble' : 'Inmueble' }}
                </UBadge>
                <UBadge v-if="t.category" color="neutral" variant="outline" size="sm">
                  {{ t.category }}
                </UBadge>
                <UBadge :color="t.activo ? 'success' : 'error'" variant="soft" size="sm">
                  {{ t.activo ? 'Activa' : 'Inactiva' }}
                </UBadge>
              </div>

              <p class="mt-2 text-sm text-muted">
                {{ (t.fields?.length ?? 0) }} campo(s) configurado(s).
              </p>
              <p v-if="t.created_at" class="mt-1 text-xs text-muted">
                Creada {{ new Date(t.created_at).toLocaleString('es-CR') }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton color="neutral" variant="outline" size="sm" :to="`/admin/plantillas/bienes/${t.id}`">
                Editar
              </UButton>
              <UButton
                :color="t.activo ? 'error' : 'success'"
                :variant="t.activo ? 'soft' : 'solid'"
                size="sm"
                @click="toggleActivo(t)"
              >
                {{ t.activo ? 'Desactivar' : 'Activar' }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

