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
const busqueda = ref('')
const filtroEstado = ref<'todos' | 'activas' | 'inactivas'>('todos')
const filtroOrigen = ref<'todos' | 'manuales' | 'vinculadas'>('todos')
const paginaActual = ref(1)
const cantidadPorPagina = ref(10)

const filtrosEstado = ['todos', 'activas', 'inactivas'] as const
const filtrosOrigen = ['todos', 'manuales', 'vinculadas'] as const
const opcionesCantidadPorPagina = [
  { label: '10 por página', value: 10 },
  { label: '20 por página', value: 20 },
  { label: '50 por página', value: 50 },
] as const

const etiquetaFiltroEstado: Record<(typeof filtrosEstado)[number], string> = {
  todos: 'Todas',
  activas: 'Activas',
  inactivas: 'Inactivas',
}

const etiquetaFiltroOrigen: Record<(typeof filtrosOrigen)[number], string> = {
  todos: 'Todos los orígenes',
  manuales: 'Sin servicio vinculado',
  vinculadas: 'Heredadas con servicio',
}

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

const plantillasFiltradas = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  return plantillas.value.filter((template) => {
    const coincideEstado = filtroEstado.value === 'todos'
      || (filtroEstado.value === 'activas' && template.activo)
      || (filtroEstado.value === 'inactivas' && !template.activo)

    const coincideOrigen = filtroOrigen.value === 'todos'
      || (filtroOrigen.value === 'manuales' && template.servicio_id == null)
      || (filtroOrigen.value === 'vinculadas' && template.servicio_id != null)

    if (!coincideEstado || !coincideOrigen) return false
    if (!termino) return true

    const textoBuscable = [
      template.title,
      template.content,
      template.servicio_id == null ? 'sin servicio vinculado' : 'plantilla heredada con servicio',
      ...template.fields.flatMap(field => [
        field.label,
        field.key,
        field.section_title ?? '',
        field.section_description ?? '',
        field.help ?? '',
      ]),
    ]
      .join(' ')
      .toLowerCase()

    return textoBuscable.includes(termino)
  })
})

const totalPlantillasFiltradas = computed(() => plantillasFiltradas.value.length)

const totalPaginas = computed(() => {
  return Math.max(1, Math.ceil(totalPlantillasFiltradas.value / cantidadPorPagina.value))
})

const plantillasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value
  return plantillasFiltradas.value.slice(inicio, inicio + cantidadPorPagina.value)
})

const resumenPaginacion = computed(() => {
  if (!totalPlantillasFiltradas.value) {
    return { inicio: 0, fin: 0 }
  }

  const inicio = (paginaActual.value - 1) * cantidadPorPagina.value + 1
  const fin = Math.min(inicio + cantidadPorPagina.value - 1, totalPlantillasFiltradas.value)

  return { inicio, fin }
})

const resumen = computed(() => ({
  total: plantillas.value.length,
  activas: plantillas.value.filter(template => template.activo).length,
  inactivas: plantillas.value.filter(template => !template.activo).length,
  manuales: plantillas.value.filter(template => template.servicio_id == null).length,
}))

const hayFiltrosActivos = computed(() =>
  Boolean(busqueda.value.trim())
  || filtroEstado.value !== 'todos'
  || filtroOrigen.value !== 'todos'
)

function limpiarFiltros() {
  busqueda.value = ''
  filtroEstado.value = 'todos'
  filtroOrigen.value = 'todos'
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CR')
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

watch([busqueda, filtroEstado, filtroOrigen, cantidadPorPagina], () => {
  paginaActual.value = 1
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

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

    <div v-if="plantillas.length" class="mb-6 space-y-4">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UCard>
          <p class="text-xs uppercase tracking-[0.22em] text-toned">Total</p>
          <p class="mt-3 text-3xl font-semibold text-highlighted">{{ resumen.total }}</p>
          <p class="mt-2 text-sm text-muted">Plantillas registradas en `document_templates`.</p>
        </UCard>

        <UCard>
          <p class="text-xs uppercase tracking-[0.22em] text-toned">Activas</p>
          <p class="mt-3 text-3xl font-semibold text-success-600">{{ resumen.activas }}</p>
          <p class="mt-2 text-sm text-muted">Disponibles para mostrarse en trámites.</p>
        </UCard>

        <UCard>
          <p class="text-xs uppercase tracking-[0.22em] text-toned">Inactivas</p>
          <p class="mt-3 text-3xl font-semibold text-warning-600">{{ resumen.inactivas }}</p>
          <p class="mt-2 text-sm text-muted">Ocultas del selector hasta reactivarlas.</p>
        </UCard>

        <UCard>
          <p class="text-xs uppercase tracking-[0.22em] text-toned">Sin servicio</p>
          <p class="mt-3 text-3xl font-semibold text-primary">{{ resumen.manuales }}</p>
          <p class="mt-2 text-sm text-muted">Plantillas nuevas creadas con título manual.</p>
        </UCard>
      </div>

      <UCard>
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div class="grid gap-3 xl:min-w-[340px] xl:max-w-xl">
            <div>
              <h2 class="font-semibold text-highlighted">Filtrar plantillas</h2>
              <p class="mt-1 text-sm text-muted">
                Buscá por nombre, placeholders, secciones o texto base del documento.
              </p>
            </div>

            <UInput
              v-model="busqueda"
              icon="i-lucide-search"
              placeholder="Buscar por título, campos o contenido"
            />
          </div>

          <div class="grid gap-3 xl:max-w-2xl xl:justify-items-end">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="estado in filtrosEstado"
                :key="estado"
                size="sm"
                :color="filtroEstado === estado ? 'primary' : 'neutral'"
                :variant="filtroEstado === estado ? 'solid' : 'outline'"
                @click="filtroEstado = estado"
              >
                {{ etiquetaFiltroEstado[estado] }}
              </UButton>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="origen in filtrosOrigen"
                :key="origen"
                size="sm"
                :color="filtroOrigen === origen ? 'primary' : 'neutral'"
                :variant="filtroOrigen === origen ? 'soft' : 'outline'"
                @click="filtroOrigen = origen"
              >
                {{ etiquetaFiltroOrigen[origen] }}
              </UButton>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>
                Mostrando {{ resumenPaginacion.inicio }}-{{ resumenPaginacion.fin }} de {{ totalPlantillasFiltradas }} visibles
              </span>
              <span>{{ plantillasFiltradas.length }} de {{ plantillas.length }} plantillas filtradas</span>
              <USelect
                v-model="cantidadPorPagina"
                class="min-w-40"
                value-key="value"
                :items="opcionesCantidadPorPagina"
              />
              <UButton
                v-if="hayFiltrosActivos"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="limpiarFiltros"
              >
                Limpiar filtros
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UCard v-if="plantillas.length === 0">
      <p class="text-sm text-muted">No hay plantillas creadas aún.</p>
    </UCard>

    <UCard v-else-if="plantillasFiltradas.length === 0">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="font-medium text-highlighted">No encontramos plantillas con esos filtros.</p>
          <p class="mt-1 text-sm text-muted">
            Ajustá la búsqueda o limpiá los filtros para volver a ver todo el catálogo.
          </p>
        </div>

        <UButton
          v-if="hayFiltrosActivos"
          color="neutral"
          variant="outline"
          @click="limpiarFiltros"
        >
          Limpiar filtros
        </UButton>
      </div>
    </UCard>

    <div v-else class="space-y-5">
      <div class="grid gap-4 lg:grid-cols-2">
        <UCard
          v-for="template in plantillasPaginadas"
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

              <p class="mt-3 text-xs text-toned">{{ formatearFecha(template.created_at) }}</p>
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

      <div class="flex flex-col gap-4 rounded-[1.6rem] border border-default/80 bg-default/85 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">
          Página {{ paginaActual }} de {{ totalPaginas }}
        </p>

        <UPagination
          v-model:page="paginaActual"
          :total="totalPlantillasFiltradas"
          :items-per-page="cantidadPorPagina"
          show-edges
          active-color="primary"
          active-variant="solid"
        />
      </div>
    </div>
  </div>
</template>
