<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

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
  plantillas.value = data ?? []
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
  <div class="max-w-4xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Plantillas de documentos</h1>
      <button
        class="bg-green-600 text-white px-4 py-2 rounded text-sm"
        @click="mostrarFormulario = !mostrarFormulario"
      >
        {{ mostrarFormulario ? 'Cancelar' : 'Nueva plantilla' }}
      </button>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{{ errorMsg }}</div>
    <div v-if="successMsg" class="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{{ successMsg }}</div>

    <div v-if="mostrarFormulario" class="border rounded-xl p-6 mb-6 bg-white dark:bg-gray-900">
      <h2 class="text-lg font-semibold mb-4">Nueva plantilla</h2>
      <div class="grid gap-4">
        <div class="grid gap-1">
          <label class="text-sm font-medium">Título *</label>
          <input v-model="form.title" class="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Ej: Contrato de divorcio por mutuo acuerdo" />
        </div>

        <div class="grid gap-1">
          <label class="text-sm font-medium">Servicio *</label>
          <select v-model="form.servicio_id" class="border rounded-lg px-3 py-2 text-sm w-full">
            <option value="">Seleccionar servicio</option>
            <option v-for="s in servicios" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </div>

        <div class="grid gap-1">
          <label class="text-sm font-medium">Contenido del documento *</label>
          <p class="text-xs text-gray-500">
            Usá <code v-pre>{{nombre_campo}}</code> para los campos variables. También podés usar
            <code v-pre>{{nombre_notario}}</code> y <code v-pre>{{direccion_notario}}</code>
            para completar datos del abogado asignado.
          </p>
          <textarea
            v-model="form.content"
            class="border rounded-lg px-3 py-2 text-sm w-full font-mono"
            rows="10"
            placeholder="Yo {{nombre_cliente}}, con cédula {{cedula}}, declaro..."
          />
        </div>

        <div class="grid gap-2">
          <label class="text-sm font-medium">Campos del formulario</label>
          <div v-if="form.fields.length" class="grid gap-2 mb-2">
            <div
              v-for="(f, i) in form.fields"
              :key="i"
              class="flex items-center justify-between border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800"
            >
              <span><strong>{{ f.label }}</strong> — <code v-pre>{{clave}}</code> ({{ f.type }})</span>
              <button class="text-red-500 text-xs hover:underline" @click="eliminarField(i)">Eliminar</button>
            </div>
          </div>

          <div class="flex gap-2 flex-wrap">
            <input v-model="nuevoField.key" class="border rounded px-3 py-2 text-sm" placeholder="clave (ej: nombre_cliente)" />
            <input v-model="nuevoField.label" class="border rounded px-3 py-2 text-sm" placeholder="etiqueta (ej: Nombre completo)" />
            <select v-model="nuevoField.type" class="border rounded px-3 py-2 text-sm">
              <option value="text">Texto</option>
              <option value="date">Fecha</option>
              <option value="number">Número</option>
            </select>
            <button class="border px-3 py-2 rounded text-sm" @click="agregarField">+ Agregar campo</button>
          </div>
        </div>

        <button
          class="bg-green-600 text-white px-5 py-2 rounded-lg text-sm w-fit"
          :disabled="loading"
          @click="guardarPlantilla"
        >
          {{ loading ? 'Guardando...' : 'Guardar plantilla' }}
        </button>
      </div>
    </div>

    <div v-if="plantillas.length === 0" class="text-center py-10 text-gray-400">
      No hay plantillas creadas aún.
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="p in plantillas"
        :key="p.id"
        class="border rounded-xl p-4 flex justify-between items-start gap-3"
      >
        <div>
          <p class="font-medium">{{ p.title }}</p>
          <p class="text-xs text-gray-500 mt-1">
            {{ servicios.find(s => s.id === p.servicio_id)?.nombre ?? 'Servicio desconocido' }}
            · {{ p.fields.length }} campos
          </p>
          <p class="text-xs text-gray-400 mt-1">{{ new Date(p.created_at).toLocaleDateString('es-CR') }}</p>
        </div>
        <button
          class="text-xs px-3 py-1 rounded border"
          :class="p.activo ? 'text-green-600 border-green-300' : 'text-gray-400 border-gray-300'"
          @click="toggleActivo(p)"
        >
          {{ p.activo ? 'Activa' : 'Inactiva' }}
        </button>
      </div>
    </div>
  </div>
</template>
