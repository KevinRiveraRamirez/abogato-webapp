<script setup lang="ts">
import type { ClientAsset, ClientAssetInput } from '~/composables/useClientAssets'
import type { AssetTemplate, AssetTemplateField } from '~/composables/useAssetTemplates'

definePageMeta({ layout: 'app', middleware: ['auth', 'client'] })

const supabaseUser = useSupabaseUser()
const {
  assets,
  hasAssets,
  loading,
  lastError,
  loadAssets,
  createAsset,
  updateAsset,
  softDeleteAsset,
} = useClientAssets()

const {
  templates,
  loading: templatesLoading,
  lastError: templatesLastError,
  loadTemplatesByType,
} = useAssetTemplates()

const showForm = ref(false)
const editingAsset = ref<ClientAsset | null>(null)

const form = reactive<ClientAssetInput>({
  asset_type: 'mueble',
  name: '',
  category: '',
  main_identifier: '',
  location: '',
  estimated_value: null,
  notes: '',
})

const formErrors = reactive<Record<string, string>>({})
const saving = ref(false)

const isEditing = computed(() => !!editingAsset.value)

const selectedTemplateId = ref<string | null>(null)
const fieldValues = reactive<Record<string, unknown>>({})

const selectedTemplate = computed<AssetTemplate | null>(() => {
  if (!selectedTemplateId.value) return null
  return templates.value.find(t => t.id === selectedTemplateId.value) ?? null
})

const selectedTemplateFields = computed<AssetTemplateField[]>(() => selectedTemplate.value?.fields ?? [])

function clearFieldValues() {
  Object.keys(fieldValues).forEach((k) => {
    delete fieldValues[k]
  })
}

function syncFieldValuesForSelectedTemplate() {
  const tpl = selectedTemplate.value

  if (!tpl) {
    // Si estamos editando y las plantillas todavía no cargaron,
    // no queremos borrar los valores precargados desde el bien.
    if (editingAsset.value) return
    clearFieldValues()
    return
  }

  const allowedKeys = new Set(tpl.fields.map(f => f.key))

  // Remover valores de campos que ya no aplican.
  Object.keys(fieldValues).forEach((k) => {
    if (!allowedKeys.has(k)) delete fieldValues[k]
  })

  // Garantizar keys presentes (para render y validación).
  for (const f of tpl.fields) {
    if (!(f.key in fieldValues)) fieldValues[f.key] = null
  }
}

function resetForm() {
  editingAsset.value = null
  form.asset_type = 'mueble'
  form.name = ''
  form.category = ''
  form.main_identifier = ''
  form.location = ''
  form.estimated_value = null
  form.notes = ''

  selectedTemplateId.value = null
  clearFieldValues()

  Object.keys(formErrors).forEach(key => {
    formErrors[key] = ''
  })
}

function validateForm() {
  Object.keys(formErrors).forEach(key => {
    formErrors[key] = ''
  })

  let ok = true

  if (!form.name.trim()) {
    formErrors.name = 'El nombre del bien es obligatorio.'
    ok = false
  }

  if (!form.asset_type) {
    formErrors.asset_type = 'Seleccioná el tipo de bien.'
    ok = false
  }

  // Validar campos extra según plantilla (si se seleccionó una).
  const tpl = selectedTemplate.value
  if (tpl) {
    for (const field of tpl.fields) {
      if (!field.required) continue

      const value = fieldValues[field.key]

      if (field.type === 'boolean') {
        if (value === null || value === undefined) {
          formErrors[field.key] = `Completá: ${field.label}`
          ok = false
        }
        continue
      }

      const isEmpty = value === null
        || value === undefined
        || (typeof value === 'string' && !value.trim())

      if (isEmpty) {
        formErrors[field.key] = `Completá: ${field.label}`
        ok = false
      }
    }
  }

  return ok
}

function startCreate() {
  resetForm()
  showForm.value = true

  // Cargar plantillas del tipo inicial para que aparezca la lista.
  void loadTemplatesByType(form.asset_type)
}

function startEdit(asset: ClientAsset) {
  editingAsset.value = asset
  form.asset_type = asset.asset_type
  form.name = asset.name
  form.category = asset.category ?? ''
  form.main_identifier = asset.main_identifier ?? ''
  form.location = asset.location ?? ''
  form.estimated_value = asset.estimated_value
  form.notes = asset.notes ?? ''

  selectedTemplateId.value = asset.template_id ?? null
  clearFieldValues()
  Object.assign(fieldValues, asset.field_values ?? {})

  Object.keys(formErrors).forEach(key => {
    formErrors[key] = ''
  })
  showForm.value = true
}

async function handleSubmit() {
  if (!validateForm()) return

  saving.value = true

  const tpl = selectedTemplate.value
  const field_values: Record<string, unknown> = {}

  if (tpl) {
    for (const f of tpl.fields) {
      const raw = fieldValues[f.key]

      if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) {
        field_values[f.key] = null
        continue
      }

      if (f.type === 'number') {
        field_values[f.key] = Number(raw)
        continue
      }

      if (f.type === 'boolean') {
        field_values[f.key] = Boolean(raw)
        continue
      }

      // text/textarea/date
      field_values[f.key] = raw
    }
  }

  const payload: ClientAssetInput = {
    asset_type: form.asset_type,
    name: form.name,
    template_id: selectedTemplateId.value ?? null,
    field_values,
    category: form.category || null,
    main_identifier: form.main_identifier || null,
    location: form.location || null,
    estimated_value: form.estimated_value,
    notes: form.notes || null,
  }

  if (editingAsset.value) {
    const updated = await updateAsset(editingAsset.value.id, payload)
    saving.value = false
    if (!updated) return
  } else {
    const created = await createAsset(payload)
    saving.value = false
    if (!created) return
  }

  showForm.value = false
  resetForm()
}

async function handleDelete(asset: ClientAsset) {
  const confirmar = window.confirm(
    `¿Querés archivar este bien (${asset.name})? Podrás seguir creándolo de nuevo más adelante.`
  )
  if (!confirmar) return

  await softDeleteAsset(asset.id)
}

onMounted(() => {
  if (supabaseUser.value?.id) {
    void loadAssets()
  }
})

watch(
  () => supabaseUser.value?.id,
  (id, prev) => {
    if (!id || id === prev) return
    void loadAssets()
  },
  { immediate: true }
)

watch(
  () => form.asset_type,
  async (nextType) => {
    if (!showForm.value) return

    await loadTemplatesByType(nextType)

    // Si estamos creando, resetear plantilla y valores al cambiar el tipo.
    if (!editingAsset.value) {
      selectedTemplateId.value = null
      clearFieldValues()
    }

    // Sincronizar valores con los campos reales de la plantilla seleccionada.
    syncFieldValuesForSelectedTemplate()
  }
)

watch(
  selectedTemplateId,
  async () => {
    if (!showForm.value) return
    // `templates` ya debería estar cargado por el watcher de `asset_type`.
    syncFieldValuesForSelectedTemplate()
  }
)
</script>

<template>
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <AppPageHeader
      eyebrow="Mis bienes"
      title="Registro de bienes y muebles"
      description="Guardá información clave de tus bienes para reutilizarla en trámites notariales, cesiones y contratos."
    >
      <template #actions>
        <UButton color="neutral" variant="outline" :loading="loading" @click="loadAssets">
          Actualizar
        </UButton>
        <UButton @click="startCreate">
          Registrar bien
        </UButton>
      </template>
    </AppPageHeader>

    <UAlert
      v-if="lastError"
      color="error"
      variant="soft"
      title="No se pudo cargar o guardar el bien"
      :description="lastError"
    />

    <UCard v-if="showForm">
      <template #header>
        <div>
          <h2 class="font-semibold text-highlighted">
            {{ isEditing ? 'Editar bien registrado' : 'Registrar nuevo bien' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            Completá los datos básicos. Podrás usar este bien en trámites relacionados más adelante.
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <div class="grid gap-4 md:grid-cols-2">
          <UFormField
            label="Tipo de bien"
            required
            :error="formErrors.asset_type"
          >
            <USelect
              v-model="form.asset_type"
              :items="[
                { label: 'Bien mueble (vehículos, mobiliario, equipo...)', value: 'mueble' },
                { label: 'Bien inmueble (propiedades, terrenos...)', value: 'inmueble' },
              ]"
              value-key="value"
            />
          </UFormField>

          <UFormField
            label="Nombre del bien"
            required
            :error="formErrors.name"
          >
            <UInput
              v-model="form.name"
              placeholder="Ejemplo: Vehículo Toyota Corolla 2018"
            />
          </UFormField>

          <UFormField
            label="Plantilla (opcional)"
            class="md:col-span-2"
            :error="templatesLastError ?? ''"
          >
            <USelect
              :model-value="selectedTemplateId"
              :items="[
                { label: 'Sin plantilla', value: null },
                ...templates.map(t => ({ label: t.title, value: t.id })),
              ]"
              value-key="value"
              placeholder="Elegí una plantilla"
              :loading="templatesLoading"
              @update:model-value="(v) => { selectedTemplateId = String(v ?? '') || null }"
            />

            <p v-if="!templatesLoading && !templates.length" class="mt-2 text-sm text-muted">
              No hay plantillas activas para este tipo de bien todavía.
            </p>
          </UFormField>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Categoría">
            <USelect
              v-model="form.category"
              :items="[
                { label: 'Vehículo', value: 'vehiculo' },
                { label: 'Propiedad', value: 'propiedad' },
                { label: 'Mobiliario', value: 'mobiliario' },
                { label: 'Equipo', value: 'equipo' },
                { label: 'Otro', value: 'otro' },
              ]"
              value-key="value"
              placeholder="Seleccioná una categoría"
            />
          </UFormField>

          <UFormField label="Identificador principal (placa, finca, serie...)">
            <UInput
              v-model="form.main_identifier"
              placeholder="Ejemplo: Placa ABC-123 o Finca 01-234567"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Ubicación">
            <UTextarea
              v-model="form.location"
              :rows="3"
              placeholder="Provincia, cantón, distrito o descripción de ubicación del bien"
            />
          </UFormField>

          <UFormField label="Valor estimado (₡)">
            <UInput
              v-model.number="form.estimated_value"
              type="number"
              min="0"
              placeholder="Opcional, referencia en colones"
            />
          </UFormField>
        </div>

        <UFormField label="Notas adicionales">
          <UTextarea
            v-model="form.notes"
            :rows="3"
            placeholder="Información relevante para tus trámites (estado, observaciones, uso previsto, etc.)"
          />
        </UFormField>

        <div v-if="selectedTemplateFields.length" class="rounded-[1.75rem] border border-default/80 bg-default/95 p-4">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="font-semibold text-highlighted">Campos según la plantilla</h3>
              <p class="mt-1 text-sm text-muted">
                Completá los campos definidos por la plantilla seleccionada.
              </p>
            </div>
            <UBadge color="primary" variant="soft">
              {{ selectedTemplateFields.length }} campo(s)
            </UBadge>
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div v-for="field in selectedTemplateFields" :key="field.key" class="min-w-0">
              <UFormField
                :label="field.label"
                :required="field.required"
                :help="field.help"
                :error="formErrors[field.key]"
              >
                <template v-if="field.type === 'text'">
                  <UInput
                    :model-value="(fieldValues[field.key] as string | null) ?? null"
                    :placeholder="field.placeholder"
                    @update:model-value="(v) => { fieldValues[field.key] = v ?? null }"
                  />
                </template>

                <template v-else-if="field.type === 'textarea'">
                  <UTextarea
                    :model-value="(fieldValues[field.key] as string | null) ?? ''"
                    :rows="3"
                    :placeholder="field.placeholder"
                    @update:model-value="(v) => { fieldValues[field.key] = v ?? null }"
                  />
                </template>

                <template v-else-if="field.type === 'number'">
                  <UInput
                    type="number"
                    min="0"
                    :model-value="(fieldValues[field.key] as number | null) ?? null"
                    :placeholder="field.placeholder"
                    @update:model-value="(v) => { fieldValues[field.key] = v === '' || v === null || v === undefined ? null : Number(v) }"
                  />
                </template>

                <template v-else-if="field.type === 'date'">
                  <UInput
                    type="date"
                    :model-value="(fieldValues[field.key] as string | null) ?? null"
                    :placeholder="field.placeholder"
                    @update:model-value="(v) => { fieldValues[field.key] = v ?? null }"
                  />
                </template>

                <template v-else-if="field.type === 'boolean'">
                  <USelect
                    :model-value="(fieldValues[field.key] as boolean | null) ?? null"
                    :items="[
                      { label: 'Sin definir', value: null },
                      { label: 'Sí', value: true },
                      { label: 'No', value: false },
                    ]"
                    value-key="value"
                    @update:model-value="(v) => { fieldValues[field.key] = v ?? null }"
                  />
                </template>
              </UFormField>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton :loading="saving" @click="handleSubmit">
            {{ isEditing ? 'Guardar cambios' : 'Registrar bien' }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="saving"
            @click="() => { showForm = false; resetForm() }"
          >
            Cancelar
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard v-if="!loading && !hasAssets && !showForm">
      <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold text-highlighted">Todavía no tenés bienes registrados</h2>
          <p class="mt-1 text-sm text-muted">
            Registrá tus bienes muebles e inmuebles para reutilizar sus datos cuando iniciés trámites de cesión, contratos u otros procesos legales.
          </p>
        </div>
        <UButton @click="startCreate">
          Registrar mi primer bien
        </UButton>
      </div>
    </UCard>

    <UCard v-if="hasAssets">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">Bienes registrados</h2>
            <p class="mt-1 text-sm text-muted">
              Estos bienes están asociados a tu perfil y podrán enlazarse a trámites compatibles.
            </p>
          </div>
          <UBadge color="neutral" variant="subtle">
            {{ assets.length }} bien(es)
          </UBadge>
        </div>
      </template>

      <div class="grid gap-3">
        <div
          v-for="asset in assets"
          :key="asset.id"
          class="rounded-2xl border border-default/80 bg-default/95 p-4 shadow-sm"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ asset.name }}
                </p>
                <UBadge
                  size="sm"
                  :color="asset.asset_type === 'mueble' ? 'primary' : 'neutral'"
                  variant="subtle"
                >
                  {{ asset.asset_type === 'mueble' ? 'Bien mueble' : 'Bien inmueble' }}
                </UBadge>
                <UBadge
                  v-if="asset.category"
                  size="sm"
                  color="neutral"
                  variant="outline"
                >
                  {{ asset.category }}
                </UBadge>
              </div>

              <p v-if="asset.main_identifier" class="text-xs text-muted">
                Identificador: {{ asset.main_identifier }}
              </p>

              <p v-if="asset.location" class="text-xs text-muted">
                Ubicación: {{ asset.location }}
              </p>

              <p v-if="asset.estimated_value !== null" class="text-xs text-muted">
                Valor estimado: ₡{{ asset.estimated_value.toLocaleString('es-CR') }}
              </p>

              <p v-if="asset.notes" class="text-xs text-muted">
                {{ asset.notes }}
              </p>

              <p class="text-[11px] uppercase tracking-[0.16em] text-muted">
                Registrado el {{ new Date(asset.created_at).toLocaleString('es-CR') }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                @click="startEdit(asset)"
              >
                Editar
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                size="sm"
                @click="handleDelete(asset)"
              >
                Archivar
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

