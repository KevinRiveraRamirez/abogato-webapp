<script setup lang="ts">
import type { Database, Json } from '~/types/database.types'

definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()

type Servicio = { id: number; nombre: string }
type Field = { key: string; label: string; type: 'text' | 'date' | 'number' }
type Template = {
  id: string
  title: string
  content: string
  fields: Field[]
  servicio_id: number
  activo: boolean
  created_at: string
}

type TemplateRow = Database['public']['Tables']['document_templates']['Row']

function esListaDeCampos(value: Json): value is Field[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false

    const field = item as Record<string, unknown>
    return typeof field.key === 'string'
      && typeof field.label === 'string'
      && ['text', 'date', 'number'].includes(String(field.type))
  })
}

function normalizarPlantilla(row: TemplateRow): Template | null {
  if (row.servicio_id == null) return null

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    fields: esListaDeCampos(row.fields) ? row.fields : [],
    servicio_id: row.servicio_id,
    activo: row.activo ?? true,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

const servicios = ref<Servicio[]>([])
const plantillas = ref<Template[]>([])
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const mostrarFormulario = ref(false)

const form = ref({
  title: '',
  content: '',
  servicio_id: '',
  fields: [] as Field[]
})

const nuevoField = ref({ key: '', label: '', type: 'text' as 'text' | 'date' | 'number' })

async function cargarServicios() {
  const { data } = await supabase.from('servicios').select('id, nombre').eq('activo', true)
  servicios.value = data ?? []
}

async function cargarPlantillas() {
  const { data } = await supabase
    .from('document_templates')
    .select('*')
    .order('created_at', { ascending: false })

  plantillas.value = (data ?? [])
    .map(normalizarPlantilla)
    .filter((template): template is Template => template !== null)
}

function agregarField() {
  const { key, label, type } = nuevoField.value
  if (!key.trim() || !label.trim()) return
  form.value.fields.push({ key: key.trim(), label: label.trim(), type })
  nuevoField.value = { key: '', label: '', type: 'text' }
}

function eliminarField(index: number) {
  form.value.fields.splice(index, 1)
}

async function guardarPlantilla() {
  if (!form.value.title.trim() || !form.value.content.trim() || !form.value.servicio_id) {
    errorMsg.value = 'Título, contenido y servicio son obligatorios.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('document_templates').insert([{
    title: form.value.title.trim(),
    content: form.value.content.trim(),
    servicio_id: Number(form.value.servicio_id),
    fields: form.value.fields,
    created_by: user?.id
  }])

  loading.value = false

  if (error) { errorMsg.value = error.message; return }

  successMsg.value = 'Plantilla creada correctamente.'
  form.value = { title: '', content: '', servicio_id: '', fields: [] }
  mostrarFormulario.value = false
  await cargarPlantillas()
}

async function toggleActivo(p: Template) {
  await supabase
    .from('document_templates')
    .update({ activo: !p.activo })
    .eq('id', p.id)
  await cargarPlantillas()
}

onMounted(async () => {
  await cargarPerfil()
  await Promise.all([cargarServicios(), cargarPlantillas()])
})
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Plantillas de documentos</h1>
        <p class="mt-1 text-sm text-muted">
          Centralizá las plantillas legales y los campos dinámicos de cada trámite.
        </p>
      </div>
      <UButton @click="mostrarFormulario = !mostrarFormulario">
        {{ mostrarFormulario ? 'Cancelar' : 'Nueva plantilla' }}
      </UButton>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo guardar"
      :description="errorMsg"
      class="mb-4"
    />
    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Plantilla creada"
      :description="successMsg"
      class="mb-4"
    />

    <UCard v-if="mostrarFormulario" class="mb-6">
      <template #header>
        <div>
          <h2 class="text-lg font-semibold text-highlighted">Nueva plantilla</h2>
          <p class="mt-1 text-sm text-muted">
            Definí el documento base y los campos que la app le pedirá al cliente.
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <UFormField label="Título" required>
          <UInput
            v-model="form.title"
            placeholder="Ej: Contrato de divorcio por mutuo acuerdo"
          />
        </UFormField>

        <UFormField label="Servicio" required>
          <USelect
            v-model="form.servicio_id"
            value-key="value"
            :items="[
              { label: 'Seleccionar servicio', value: '' },
              ...servicios.map((s) => ({ label: s.nombre, value: String(s.id) }))
            ]"
          />
        </UFormField>

        <UFormField
          label="Contenido del documento"
          required
          help="Usá {{nombre_campo}} para variables del formulario y {{nombre_notario}} / {{direccion_notario}} para datos del abogado asignado."
        >
          <UTextarea
            v-model="form.content"
            class="font-mono"
            :rows="10"
            placeholder="Yo {{nombre_cliente}}, con cédula {{cedula}}, declaro..."
          />
        </UFormField>

        <div class="grid gap-3">
          <div class="flex items-center justify-between">
            <h3 class="font-medium text-highlighted">Campos del formulario</h3>
            <UBadge color="neutral" variant="subtle">
              {{ form.fields.length }} configurados
            </UBadge>
          </div>

          <div v-if="form.fields.length" class="grid gap-2">
            <UCard
              v-for="(f, i) in form.fields"
              :key="i"
              :ui="{ body: 'flex flex-wrap items-center justify-between gap-3 px-4 py-3' }"
            >
              <div class="text-sm">
                <strong>{{ f.label }}</strong>
                <span class="text-muted"> · {{ f.key }} · {{ f.type }}</span>
              </div>
              <UButton size="sm" color="error" variant="ghost" @click="eliminarField(i)">
                Eliminar
              </UButton>
            </UCard>
          </div>

          <div class="grid gap-3 rounded-2xl border border-dashed border-default p-4">
            <div class="grid gap-3 md:grid-cols-3">
              <UFormField label="Clave">
                <UInput v-model="nuevoField.key" placeholder="nombre_cliente" />
              </UFormField>
              <UFormField label="Etiqueta">
                <UInput v-model="nuevoField.label" placeholder="Nombre completo" />
              </UFormField>
              <UFormField label="Tipo">
                <USelect
                  v-model="nuevoField.type"
                  value-key="value"
                  :items="[
                    { label: 'Texto', value: 'text' },
                    { label: 'Fecha', value: 'date' },
                    { label: 'Número', value: 'number' }
                  ]"
                />
              </UFormField>
            </div>
            <div>
              <UButton color="neutral" variant="outline" @click="agregarField">
                Agregar campo
              </UButton>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <UButton :loading="loading" @click="guardarPlantilla">
            Guardar plantilla
          </UButton>
          <UButton color="neutral" variant="ghost" @click="mostrarFormulario = false">
            Cancelar
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard v-if="plantillas.length === 0">
      <p class="text-sm text-muted">No hay plantillas creadas aún.</p>
    </UCard>

    <div v-else class="grid gap-3">
      <UCard
        v-for="p in plantillas"
        :key="p.id"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="font-medium text-highlighted">{{ p.title }}</p>
            <p class="mt-1 text-sm text-muted">
              {{ servicios.find(s => s.id === p.servicio_id)?.nombre ?? 'Servicio desconocido' }}
              · {{ p.fields.length }} campos
            </p>
            <p class="mt-1 text-xs text-toned">{{ new Date(p.created_at).toLocaleDateString('es-CR') }}</p>
          </div>
          <UButton
            size="sm"
            :color="p.activo ? 'success' : 'neutral'"
            :variant="p.activo ? 'soft' : 'outline'"
            @click="toggleActivo(p)"
          >
            {{ p.activo ? 'Activa' : 'Inactiva' }}
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
