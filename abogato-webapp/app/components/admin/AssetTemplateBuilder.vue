<script setup lang="ts">
import { computed, reactive } from 'vue'

type AssetType = 'mueble' | 'inmueble'
type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean'

type AssetTemplateField = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  help?: string
  placeholder?: string
}

type AssetTemplateRow = {
  id: string
  title: string
  asset_type: AssetType
  category: string | null
  fields: AssetTemplateField[]
  activo: boolean
  created_at: string | null
  updated_at: string | null
}

const props = defineProps<{ templateId?: string | null }>()

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const formErrors = reactive<Record<string, string>>({})
const template = reactive<{
  title: string
  asset_type: AssetType
  category: string
  activo: boolean
  fields: Array<AssetTemplateField & { _id: string }>
}>({
  title: '',
  asset_type: 'mueble',
  category: '',
  activo: true,
  fields: [],
})

const isEditing = computed(() => Boolean(props.templateId))

function clearErrors() {
  errorMsg.value = ''
  successMsg.value = ''
  Object.keys(formErrors).forEach(k => {
    formErrors[k] = ''
  })
}

function normalizeField(input: Partial<AssetTemplateField>): AssetTemplateField & { _id: string } {
  const baseKey = (input.key ?? 'campo').trim() || 'campo'
  return {
    _id: import.meta.client && typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`.replace('.', ''),
    key: baseKey,
    label: (input.label ?? 'Campo').trim() || 'Campo',
    type: (input.type ?? 'text') as FieldType,
    required: Boolean(input.required),
    help: (input.help ?? '').trim() || undefined,
    placeholder: (input.placeholder ?? '').trim() || undefined,
  }
}

function addField(kind: FieldType) {
  const nextIndex = template.fields.length + 1
  template.fields.push(
    normalizeField({
      type: kind,
      key: `${kind}_${nextIndex}`,
      label: kind === 'text'
        ? 'Campo de texto'
        : kind === 'textarea'
          ? 'Campo descriptivo'
          : kind === 'number'
            ? 'Campo numérico'
            : kind === 'date'
              ? 'Fecha'
              : 'Confirmación',
      required: false,
    })
  )
}

function removeField(fieldId: string) {
  template.fields = template.fields.filter(f => f._id !== fieldId)
}

function validate() {
  clearErrors()
  let ok = true

  if (!template.title.trim()) {
    formErrors.title = 'El título es obligatorio.'
    ok = false
  }

  const seenKeys = new Set<string>()
  for (const field of template.fields) {
    const key = field.key.trim()
    if (!key) {
      errorMsg.value = 'Hay un campo sin key. Asigná una key única.'
      ok = false
      break
    }
    if (seenKeys.has(key)) {
      errorMsg.value = `La key "${key}" está repetida. Debe ser única.`
      ok = false
      break
    }
    seenKeys.add(key)
  }

  return ok
}

async function loadTemplate() {
  if (!props.templateId) return
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('asset_templates')
    .select('*')
    .eq('id', props.templateId)
    .single()

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  const row = data as AssetTemplateRow
  template.title = row.title ?? ''
  template.asset_type = row.asset_type ?? 'mueble'
  template.category = row.category ?? ''
  template.activo = row.activo ?? true
  template.fields = Array.isArray(row.fields)
    ? (row.fields as AssetTemplateField[]).map(f => normalizeField(f))
    : []
}

async function saveTemplate() {
  if (!validate()) return
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''

  const payload = {
    title: template.title.trim(),
    asset_type: template.asset_type,
    category: template.category.trim() || null,
    activo: template.activo,
    fields: template.fields.map(({ _id, ...rest }) => ({
      ...rest,
      key: rest.key.trim(),
      label: rest.label.trim(),
      help: rest.help?.trim() || undefined,
      placeholder: rest.placeholder?.trim() || undefined,
    })),
    created_by: profile.value?.user_id ?? null,
  }

  const query = props.templateId
    ? supabase.from('asset_templates').update(payload).eq('id', props.templateId).select('id').single()
    : supabase.from('asset_templates').insert(payload).select('id').single()

  const { data, error } = await query
  saving.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  const id = (data as { id: string }).id
  successMsg.value = props.templateId ? 'Plantilla actualizada.' : 'Plantilla creada.'

  if (!props.templateId) {
    await navigateTo(`/admin/plantillas/bienes/${id}`, { replace: true })
  }
}

onMounted(() => {
  void cargarPerfil()
  void loadTemplate()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6">
    <AppPageHeader
      eyebrow="Admin"
      :title="isEditing ? 'Editar plantilla de bienes' : 'Nueva plantilla de bienes'"
      description="Definí campos específicos para bienes muebles o inmuebles. Estas plantillas se usarán para capturar datos relevantes al registrar bienes desde la UI."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :to="'/admin/plantillas/bienes'">
          Volver al listado
        </UButton>
        <UButton :loading="saving" @click="saveTemplate">
          Guardar plantilla
        </UButton>
      </template>
    </AppPageHeader>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo guardar la plantilla"
      :description="errorMsg"
    />

    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Listo"
      :description="successMsg"
    />

    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold text-highlighted">Configuración</h2>
          <p class="mt-1 text-sm text-muted">Tipo, categoría y estado de la plantilla.</p>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="Título" required :error="formErrors.title">
          <UInput v-model="template.title" placeholder="Ejemplo: Vehículo (plantilla completa)" />
        </UFormField>

        <UFormField label="Tipo de bien" required>
          <USelect
            v-model="template.asset_type"
            :items="[
              { label: 'Bien mueble', value: 'mueble' },
              { label: 'Bien inmueble', value: 'inmueble' },
            ]"
            value-key="value"
          />
        </UFormField>

        <UFormField label="Categoría (opcional)">
          <USelect
            v-model="template.category"
            :items="[
              { label: 'Vehículo', value: 'vehiculo' },
              { label: 'Propiedad', value: 'propiedad' },
              { label: 'Mobiliario', value: 'mobiliario' },
              { label: 'Equipo', value: 'equipo' },
              { label: 'Otro', value: 'otro' },
            ]"
            value-key="value"
            placeholder="Sin categoría"
          />
        </UFormField>

        <UFormField label="Estado">
          <UToggle v-model="template.activo" on-icon="i-lucide-check" off-icon="i-lucide-x" />
          <p class="mt-2 text-xs text-muted">
            {{ template.activo ? 'Activa: disponible para la UI.' : 'Inactiva: no se sugiere en registros.' }}
          </p>
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">Campos de datos</h2>
            <p class="mt-1 text-sm text-muted">
              Estos campos se guardan en la plantilla para capturar datos relevantes del bien al registrarlo.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton size="sm" color="neutral" variant="outline" @click="addField('text')">Texto</UButton>
            <UButton size="sm" color="neutral" variant="outline" @click="addField('textarea')">Texto largo</UButton>
            <UButton size="sm" color="neutral" variant="outline" @click="addField('number')">Número</UButton>
            <UButton size="sm" color="neutral" variant="outline" @click="addField('date')">Fecha</UButton>
            <UButton size="sm" color="neutral" variant="outline" @click="addField('boolean')">Sí/No</UButton>
          </div>
        </div>
      </template>

      <div v-if="!template.fields.length" class="rounded-2xl border border-dashed border-default px-4 py-10 text-center">
        <p class="font-medium text-highlighted">Sin campos definidos</p>
        <p class="mt-2 text-sm text-muted">Agregá al menos un campo para capturar información específica del bien.</p>
      </div>

      <div v-else class="grid gap-3">
        <div
          v-for="field in template.fields"
          :key="field._id"
          class="rounded-2xl border border-default/80 bg-default/95 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-[0.16em] text-muted">Campo</p>
              <p class="mt-1 font-semibold text-highlighted">{{ field.label }}</p>
              <p class="mt-1 text-xs text-muted">Key: <span class="text-highlighted">{{ field.key }}</span> • Tipo: {{ field.type }}</p>
            </div>

            <UButton color="error" variant="ghost" size="sm" @click="removeField(field._id)">
              Eliminar
            </UButton>
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <UFormField label="Label" required>
              <UInput v-model="field.label" />
            </UFormField>
            <UFormField label="Key" required help="Usala como identificador interno, sin espacios (ej. placa, finca, serie).">
              <UInput v-model="field.key" />
            </UFormField>

            <UFormField label="Tipo">
              <USelect
                v-model="field.type"
                :items="[
                  { label: 'Texto corto', value: 'text' },
                  { label: 'Texto largo', value: 'textarea' },
                  { label: 'Número', value: 'number' },
                  { label: 'Fecha', value: 'date' },
                  { label: 'Sí/No', value: 'boolean' },
                ]"
                value-key="value"
              />
            </UFormField>

            <UFormField label="Requerido">
              <UToggle v-model="field.required" on-icon="i-lucide-check" off-icon="i-lucide-x" />
            </UFormField>

            <UFormField label="Placeholder (opcional)">
              <UInput v-model="field.placeholder" />
            </UFormField>

            <UFormField label="Ayuda (opcional)">
              <UInput v-model="field.help" />
            </UFormField>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

