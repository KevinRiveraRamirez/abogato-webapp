<script setup lang="ts">
import type { Database } from '~/types/database.types'
import {
  groupTemplateFields,
  isTemplateFieldList,
  normalizeTemplateFields,
  type TemplateField,
} from '~~/shared/utils/document-template-fields'

definePageMeta({ layout: 'app', middleware: ['auth', 'admin'] })

const route = useRoute()
const supabase = useSupabaseClient()
const { cargarPerfil } = useUsuario()

type Template = {
  id: string
  title: string
  content: string
  fields: TemplateField[]
  servicio_id: number | null
  activo: boolean
  created_at: string
}

type TemplateRow = Database['public']['Tables']['document_templates']['Row']

const plantillas = ref<Template[]>([])
const errorMsg = ref('')
const successMsg = ref('')

function normalizarPlantilla(row: TemplateRow): Template {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    fields: isTemplateFieldList(row.fields) ? normalizeTemplateFields(row.fields) : [],
    servicio_id: row.servicio_id ?? null,
    activo: row.activo ?? true,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

function obtenerMensajeExito(status: string) {
  if (status === 'created') return 'Plantilla creada correctamente.'
  if (status === 'updated') return 'Plantilla actualizada correctamente.'
  return ''
}

async function cargarPlantillas() {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    errorMsg.value = error.message
    return
  }

  plantillas.value = (data ?? []).map(normalizarPlantilla)
}

async function toggleActivo(template: Template) {
  const accion = template.activo ? 'desactivar' : 'activar'
  if (!confirm(`¿Querés ${accion} la plantilla "${template.title}"?`)) return

  errorMsg.value = ''

  const { error } = await supabase
    .from('document_templates')
    .update({ activo: !template.activo })
    .eq('id', template.id)

  if (error) {
    errorMsg.value = error.message
    return
  }

  await cargarPlantillas()
  successMsg.value = template.activo
    ? 'Plantilla desactivada correctamente.'
    : 'Plantilla activada correctamente.'
}

onMounted(async () => {
  await cargarPerfil()
  await cargarPlantillas()

  const status = typeof route.query.status === 'string' ? route.query.status : ''
  const message = obtenerMensajeExito(status)

  if (message) {
    successMsg.value = message
    await navigateTo('/admin/plantillas', { replace: true })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-[1560px]">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Plantillas de documentos</h1>
        <p class="mt-1 text-sm text-muted">
          Diseñá formularios visuales para el admin y guardalos directamente en `document_templates`.
        </p>
      </div>

      <UButton to="/admin/plantillas/nueva">
        Nueva plantilla
      </UButton>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo completar la acción"
      :description="errorMsg"
      class="mb-4"
    />

    <UAlert
      v-if="successMsg"
      color="success"
      variant="soft"
      title="Operación exitosa"
      :description="successMsg"
      class="mb-4"
    />

    <UCard v-if="plantillas.length === 0">
      <p class="text-sm text-muted">No hay plantillas creadas aún.</p>
    </UCard>

    <div v-else class="grid gap-4 lg:grid-cols-2">
      <UCard
        v-for="template in plantillas"
        :key="template.id"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-highlighted">{{ template.title }}</p>
            <p class="mt-1 text-sm text-muted">
              {{ template.servicio_id == null ? 'Visible en el selector de trámites' : 'Plantilla heredada con servicio vinculado' }}
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
              <UBadge
                :color="template.activo ? 'success' : 'neutral'"
                :variant="template.activo ? 'soft' : 'outline'"
              >
                {{ template.activo ? 'Activa' : 'Inactiva' }}
              </UBadge>
              <UBadge color="neutral" variant="subtle">
                {{ groupTemplateFields(template.fields).length }} secciones
              </UBadge>
              <UBadge color="primary" variant="soft">
                {{ template.fields.length }} campos
              </UBadge>
            </div>

            <p class="mt-3 text-xs text-toned">{{ new Date(template.created_at).toLocaleDateString('es-CR') }}</p>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              :to="`/admin/plantillas/${template.id}`"
            >
              Editar
            </UButton>
            <UButton
              size="sm"
              :color="template.activo ? 'warning' : 'success'"
              :variant="template.activo ? 'outline' : 'soft'"
              @click="toggleActivo(template)"
            >
              {{ template.activo ? 'Desactivar' : 'Activar' }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
