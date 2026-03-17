<script setup lang="ts">
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'

definePageMeta({ layout: 'app', middleware: 'auth' })
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()

type Field = { key: string; label: string; type: 'text' | 'date' | 'number' }
type Template = { id: string; title: string; content: string; fields: Field[]; servicio_id: number }
type FieldValue = string | number | null | undefined

const ticket = ref<any>(null)
const abogadoAsignado = ref<{ display_name: string | null; office_address: string | null } | null>(null)
const plantillas = ref<Template[]>([])
const plantillaSeleccionada = ref<Template | null>(null)
const fieldValues = ref<Record<string, FieldValue>>({})

function textoDeCampo(value: FieldValue) {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

function campoEstaVacio(value: FieldValue) {
  return textoDeCampo(value).trim() === ''
}
const loading = ref(false)
const errorMsg = ref('')
const paso = ref<'seleccionar' | 'llenar' | 'previsualizar'>('seleccionar')

const documentoGenerado = computed(() => {
  if (!plantillaSeleccionada.value) return ''
  return renderDocumentTemplate(
    plantillaSeleccionada.value.content,
    fieldValues.value,
    {
      nombre_notario: abogadoAsignado.value?.display_name ?? null,
      direccion_notario: abogadoAsignado.value?.office_address ?? null
    }
  )
})

function seleccionarPlantilla(p: Template) {
  plantillaSeleccionada.value = p
  fieldValues.value = {}
  p.fields.forEach(f => { fieldValues.value[f.key] = '' })
  paso.value = 'llenar'
}

function previsualizarDocumento() {
  const camposVacios = plantillaSeleccionada.value?.fields.filter(f => campoEstaVacio(fieldValues.value[f.key]))
  if (camposVacios?.length) { errorMsg.value = 'Completá todos los campos antes de continuar.'; return }
  errorMsg.value = ''
  paso.value = 'previsualizar'
}

async function guardarDocumento() {
  if (!plantillaSeleccionada.value || !user.value) return
  loading.value = true
  errorMsg.value = ''
  const { error } = await supabase.from('documents').insert([{
    ticket_id: route.params.id as string,
    template_id: plantillaSeleccionada.value.id,
    field_values: fieldValues.value,
    status: 'submitted',
    created_by: user.value.id
  }])
  loading.value = false
  if (error) { errorMsg.value = error.message; return }
  router.push(`/ticket/${route.params.id}`)
}

onMounted(async () => {
  const [{ data: t }, { data: p }] = await Promise.all([
    supabase.from('tickets').select('*').eq('id', route.params.id as string).maybeSingle(),
    supabase.from('document_templates').select('*').eq('activo', true)
  ])
  ticket.value = t
  plantillas.value = p ?? []

  if (t?.assigned_to) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, office_address')
      .eq('user_id', t.assigned_to)
      .maybeSingle()

    abogadoAsignado.value = data ?? null
  }
})
</script>

<template>
  <ClientOnly fallback="Cargando...">
    <div class="mx-auto max-w-4xl">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-highlighted">Generar documento legal</h1>
          <p v-if="ticket" class="mt-1 text-sm text-muted">Ticket: {{ ticket.title }}</p>
        </div>
        <UButton
          :to="`/ticket/${route.params.id}`"
          color="neutral"
          variant="ghost"
          leading-icon="i-lucide-arrow-left"
        >
          Volver al ticket
        </UButton>
      </div>

      <UAlert
        v-if="errorMsg"
        color="error"
        variant="soft"
        title="No se pudo continuar"
        :description="errorMsg"
        class="mb-4"
      />

      <UCard v-if="paso === 'seleccionar'">
        <template #header>
          <div>
            <h2 class="text-lg font-semibold text-highlighted">Seleccioná el tipo de documento</h2>
            <p class="mt-1 text-sm text-muted">Elegí una plantilla para comenzar.</p>
          </div>
        </template>

        <div v-if="plantillas.length === 0" class="text-sm text-muted">No hay plantillas disponibles aún.</div>
        <div v-else class="grid gap-3">
          <UCard
            v-for="p in plantillas"
            :key="p.id"
            :ui="{ body: 'cursor-pointer px-5 py-4 transition-colors hover:bg-elevated/60' }"
            @click="seleccionarPlantilla(p)"
          >
            <p class="font-medium text-highlighted">{{ p.title }}</p>
            <p class="mt-1 text-sm text-muted">{{ p.fields.length }} campos a completar</p>
          </UCard>
        </div>
      </UCard>

      <UCard v-if="paso === 'llenar'">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">Completá la información</h2>
              <p class="mt-1 text-sm text-muted">{{ plantillaSeleccionada?.title }}</p>
            </div>
            <UButton color="neutral" variant="ghost" leading-icon="i-lucide-arrow-left" @click="paso = 'seleccionar'">
              Cambiar plantilla
            </UButton>
          </div>
        </template>

        <div class="grid gap-4">
          <UFormField
            v-for="f in plantillaSeleccionada?.fields"
            :key="f.key"
            :label="f.label"
            required
          >
            <UInput
              v-model="fieldValues[f.key]"
              :type="f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'"
              :placeholder="`Ingresá ${f.label.toLowerCase()}`"
            />
          </UFormField>
        </div>

        <template #footer>
          <UButton trailing-icon="i-lucide-arrow-right" @click="previsualizarDocumento">
            Previsualizar documento
          </UButton>
        </template>
      </UCard>

      <UCard v-if="paso === 'previsualizar'">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">Previsualización del documento</h2>
              <p class="mt-1 text-sm text-muted">Revisá el texto antes de enviarlo al abogado.</p>
            </div>
            <UButton color="neutral" variant="ghost" leading-icon="i-lucide-pencil" @click="paso = 'llenar'">
              Editar información
            </UButton>
          </div>
        </template>

        <div class="rounded-2xl border border-default bg-elevated/40 p-6 font-serif text-sm leading-relaxed whitespace-pre-wrap">
          {{ documentoGenerado }}
        </div>

        <template #footer>
          <div class="flex flex-wrap gap-3">
            <UButton :loading="loading" @click="guardarDocumento">
              {{ loading ? 'Enviando...' : 'Enviar al abogado' }}
            </UButton>
            <UButton color="neutral" variant="outline" @click="paso = 'llenar'">
              Corregir información
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </ClientOnly>
</template>
