<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()

type Field = { key: string; label: string; type: 'text' | 'date' | 'number' }
type Template = { id: string; title: string; content: string; fields: Field[]; servicio_id: number }

const ticket = ref<any>(null)
const plantillas = ref<Template[]>([])
const plantillaSeleccionada = ref<Template | null>(null)
const fieldValues = ref<Record<string, string>>({})
const loading = ref(false)
const errorMsg = ref('')
const paso = ref<'seleccionar' | 'llenar' | 'previsualizar'>('seleccionar')

const documentoGenerado = computed(() => {
  if (!plantillaSeleccionada.value) return ''
  let content = plantillaSeleccionada.value.content
  for (const [key, value] of Object.entries(fieldValues.value)) {
    content = content.replaceAll(`{{${key}}}`, value || `[${key}]`)
  }
  return content
})

function seleccionarPlantilla(p: Template) {
  plantillaSeleccionada.value = p
  fieldValues.value = {}
  p.fields.forEach(f => { fieldValues.value[f.key] = '' })
  paso.value = 'llenar'
}

function previsualizarDocumento() {
  const camposVacios = plantillaSeleccionada.value?.fields.filter(f => !fieldValues.value[f.key]?.trim())
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
})
</script>

<template>
  <ClientOnly fallback="Cargando...">
    <div class="max-w-3xl mx-auto py-8 px-4">
      <NuxtLink :to="`/ticket/${route.params.id}`" class="text-sm text-gray-500 hover:underline mb-6 inline-block">
        ← Volver al ticket
      </NuxtLink>

      <h1 class="text-2xl font-semibold mb-2">Generar documento legal</h1>
      <p v-if="ticket" class="text-sm text-gray-500 mb-6">Ticket: {{ ticket.title }}</p>
      <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{{ errorMsg }}</div>

      <div v-if="paso === 'seleccionar'">
        <h2 class="text-lg font-medium mb-4">Seleccioná el tipo de documento</h2>
        <div v-if="plantillas.length === 0" class="text-gray-400 text-sm">No hay plantillas disponibles aún.</div>
        <div class="grid gap-3">
          <div v-for="p in plantillas" :key="p.id" class="border rounded-xl p-4 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors" @click="seleccionarPlantilla(p)">
            <p class="font-medium">{{ p.title }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ p.fields.length }} campos a completar</p>
          </div>
        </div>
      </div>

      <div v-if="paso === 'llenar'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium">Completá la información</h2>
          <button class="text-sm text-gray-500 hover:underline" @click="paso = 'seleccionar'">← Cambiar plantilla</button>
        </div>
        <p class="text-sm text-gray-500 mb-4">{{ plantillaSeleccionada?.title }}</p>
        <div class="grid gap-4">
          <div v-for="f in plantillaSeleccionada?.fields" :key="f.key" class="grid gap-1">
            <label class="text-sm font-medium">{{ f.label }} <span class="text-red-500">*</span></label>
            <input v-model="fieldValues[f.key]" :type="f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'" class="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500" :placeholder="`Ingresá ${f.label.toLowerCase()}`" />
          </div>
        </div>
        <button class="mt-6 bg-green-600 text-white px-5 py-2 rounded-lg text-sm" @click="previsualizarDocumento">Previsualizar documento →</button>
      </div>

      <div v-if="paso === 'previsualizar'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium">Previsualización del documento</h2>
          <button class="text-sm text-gray-500 hover:underline" @click="paso = 'llenar'">← Editar información</button>
        </div>
        <div class="border rounded-xl p-6 bg-white dark:bg-gray-900 font-serif text-sm leading-relaxed whitespace-pre-wrap mb-6">{{ documentoGenerado }}</div>
        <div class="flex gap-3">
          <button class="bg-green-600 text-white px-5 py-2 rounded-lg text-sm" :disabled="loading" @click="guardarDocumento">{{ loading ? 'Enviando...' : 'Enviar al abogado' }}</button>
          <button class="border px-5 py-2 rounded-lg text-sm text-gray-600" @click="paso = 'llenar'">Corregir información</button>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>