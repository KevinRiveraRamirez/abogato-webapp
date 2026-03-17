<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const supabase = useSupabaseClient()
const { profile, cargarPerfil } = useUsuario()

type Servicio = {
  id: number
  nombre: string
}

type Field = {
  key: string
  label: string
  type: 'text' | 'date' | 'number'
}

type Template = {
  id: string
  title: string
  fields: Field[]
  servicio_id: number
  activo: boolean
}

type Ticket = {
  id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
  priority: 'low' | 'normal' | 'high'
  created_by: string
  assigned_to: string | null
  created_at: string
}

const tickets = ref<Ticket[]>([])
const abogados = ref<{ user_id: string; display_name: string | null }[]>([])
const servicios = ref<Servicio[]>([])
const plantillas = ref<Template[]>([])

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const filtroEstado = ref('todos')
const mostrarFormulario = ref(false)

const tramiteSeleccionadoId = ref('')
const nuevaDescripcion = ref('')
const nuevaPrioridad = ref<'low' | 'normal' | 'high'>('normal')
const nuevoAbogado = ref('')
const fieldValues = ref<Record<string, string>>({})
const ticketRecienCreadoId = ref('')


const archivosAdjuntos = ref<File[]>([])

const formatosPermitidos = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

const tamañoMaximo = 10 * 1024 * 1024 // 10MB
let cedulaLookupTimeout: ReturnType<typeof setTimeout> | null = null
const padronMensajes = ref<Record<string, string>>({})

function normalizarTexto(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function esCampoCedula(field: Field) {
  const key = normalizarTexto(field.key)
  const label = normalizarTexto(field.label)

  return ['cedula', 'identificacion', 'identidad'].some((candidate) =>
    key.includes(candidate) || label.includes(candidate)
  )
}

function esCampoNombre(field: Field) {
  const key = normalizarTexto(field.key)
  const label = normalizarTexto(field.label)

  return ['nombre', 'apellido'].some((candidate) =>
    key.includes(candidate) || label.includes(candidate)
  )
}

function buscarCampoPorCandidatos(campos: Field[], candidatos: string[], exclusions: string[] = []) {
  return campos.find((field) => {
    const key = normalizarTexto(field.key)
    const label = normalizarTexto(field.label)

    const coincide = candidatos.some((candidate) => key.includes(candidate) || label.includes(candidate))
    const excluido = exclusions.some((candidate) => key.includes(candidate) || label.includes(candidate))

    return coincide && !excluido
  })
}

const indicesCedula = computed(() =>
  camposFormulario.value
    .map((field, index) => (esCampoCedula(field) ? index : -1))
    .filter(index => index >= 0)
)

function obtenerTokenPersona(field: Field) {
  const source = `${normalizarTexto(field.key)}${normalizarTexto(field.label)}`
  const esConyuge = ['conyuge', 'esposo', 'esposa', 'pareja'].some((candidate) => source.includes(candidate))
  const digitos = source.match(/\d+/)?.[0] ?? ''

  if (esConyuge && digitos) return `conyuge-${digitos}`
  if (esConyuge) return 'conyuge'
  if (digitos) return `persona-${digitos}`

  return 'titular'
}

const camposOrdenados = computed(() => {
  const ordenados: Field[] = []
  const usados = new Set<string>()

  indicesCedula.value.forEach((cedulaIndex) => {
    const cedula = camposFormulario.value[cedulaIndex]
    const token = obtenerTokenPersona(cedula)
    const relacionados = camposFormulario.value.filter((field) =>
      field.key !== cedula.key &&
      !esCampoCedula(field) &&
      obtenerTokenPersona(field) === token
    )
    const nombres = relacionados.filter(esCampoNombre)
    const otros = relacionados.filter((field) => !esCampoNombre(field))

    if (cedula) {
      ordenados.push(cedula)
      usados.add(cedula.key)
    }

    nombres.forEach((field) => {
      ordenados.push(field)
      usados.add(field.key)
    })

    otros.forEach((field) => {
      ordenados.push(field)
      usados.add(field.key)
    })
  })

  camposFormulario.value.forEach((field) => {
    if (!usados.has(field.key)) {
      ordenados.push(field)
    }
  })

  return ordenados
})

function obtenerGrupoPosicionalDeCedula(cedulaKey: string) {
  const cedulaIndex = camposFormulario.value.findIndex((field) => field.key === cedulaKey)
  if (cedulaIndex < 0) return []

  const siguienteCedulaIndex = camposFormulario.value.findIndex(
    (field, index) => index > cedulaIndex && esCampoCedula(field)
  )

  return camposFormulario.value.slice(
    cedulaIndex,
    siguienteCedulaIndex >= 0 ? siguienteCedulaIndex : camposFormulario.value.length
  )
}

function obtenerCamposRelacionadosConCedula(cedulaKey: string) {
  const cedulaField = camposFormulario.value.find((field) => field.key === cedulaKey)
  if (!cedulaField) return []

  const token = obtenerTokenPersona(cedulaField)
  const relacionados = camposFormulario.value.filter((field) =>
    field.key !== cedulaKey &&
    !esCampoCedula(field) &&
    obtenerTokenPersona(field) === token
  )

  if (relacionados.length) return relacionados

  return obtenerGrupoPosicionalDeCedula(cedulaKey).filter((field) => !esCampoCedula(field))
}

async function autocompletarDesdePadron(cedulaKey: string, cedula: string) {
  if (!cedula || cedula.length < 9) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: '' }
    return
  }

  const { data, error } = await supabase
    .from('padron_electores')
    .select('cedula, nombre, apellido_1, apellido_2, nombre_completo')
    .eq('cedula', cedula)
    .maybeSingle()

  if (error) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No se pudo consultar el padrón en este momento.' }
    return
  }

  if (!data) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No encontramos esa cédula en el padrón.' }
    return
  }

  const actualizaciones: Record<string, string> = { ...fieldValues.value }
  const grupo = obtenerCamposRelacionadosConCedula(cedulaKey)

  const campoNombreCompleto = buscarCampoPorCandidatos(grupo, ['nombrecompleto'])
  const campoNombre = buscarCampoPorCandidatos(grupo, ['nombre'], ['nombrecompleto'])
  const campoApellido1 = buscarCampoPorCandidatos(grupo, ['apellido1', 'primerapellido'])
  const campoApellido2 = buscarCampoPorCandidatos(grupo, ['apellido2', 'segundoapellido'])

  if (campoNombreCompleto) {
    actualizaciones[campoNombreCompleto.key] = data.nombre_completo
  }

  if (campoNombre) {
    actualizaciones[campoNombre.key] = data.nombre
  }

  if (campoApellido1) {
    actualizaciones[campoApellido1.key] = data.apellido_1
  }

  if (campoApellido2) {
    actualizaciones[campoApellido2.key] = data.apellido_2 ?? ''
  }

  fieldValues.value = actualizaciones
  padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: `Datos encontrados para ${data.nombre_completo}.` }
}

const plantillaSeleccionada = computed(() =>
  plantillas.value.find(p => p.id === tramiteSeleccionadoId.value) ?? null
)

const camposFormulario = computed(() => plantillaSeleccionada.value?.fields ?? [])

const resumenTramiteSeleccionado = computed(() => {
  if (!plantillaSeleccionada.value) return ''

  const servicio = servicios.value.find(s => s.id === plantillaSeleccionada.value?.servicio_id)
  return servicio ? `${servicio.nombre} · ${plantillaSeleccionada.value.title}` : plantillaSeleccionada.value.title
})

watch(tramiteSeleccionadoId, (templateId) => {
  const template = plantillas.value.find(p => p.id === templateId)
  const nextValues: Record<string, string> = {}

  template?.fields.forEach((field) => {
    nextValues[field.key] = fieldValues.value[field.key] ?? ''
  })

  fieldValues.value = nextValues
  padronMensajes.value = {}
})

watch(fieldValues, (values) => {
  if (cedulaLookupTimeout) {
    clearTimeout(cedulaLookupTimeout)
  }

  const cedulas = indicesCedula.value.map((index) => {
    const field = camposFormulario.value[index]
    return {
      key: field.key,
      value: (values[field.key] ?? '').replace(/\D/g, ''),
    }
  })

  cedulas.forEach(({ key, value }) => {
    if (!value) {
      padronMensajes.value = { ...padronMensajes.value, [key]: '' }
      return
    }

    if (value.length < 9) {
      padronMensajes.value = {
        ...padronMensajes.value,
        [key]: 'Ingresá una cédula completa para autocompletar los datos.',
      }
    }
  })

  const completas = cedulas.filter(({ value }) => value.length >= 9)
  if (!completas.length) return

  cedulaLookupTimeout = setTimeout(() => {
    completas.forEach(({ key, value }) => {
      autocompletarDesdePadron(key, value)
    })
  }, 450)
}, { deep: true })

function abrirFormularioNuevoTicket() {
  successMsg.value = ''
  errorMsg.value = ''
  padronMensajes.value = {}
  mostrarFormulario.value = true
}

function cerrarFormularioNuevoTicket() {
  mostrarFormulario.value = false
  errorMsg.value = ''
  successMsg.value = ''
  padronMensajes.value = {}
}

function seleccionarArchivo(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])

  errorMsg.value = ''

  if (!files.length) {
    archivosAdjuntos.value = []
    return
  }

  for (const file of files) {
    if (!formatosPermitidos.includes(file.type)) {
      errorMsg.value = 'Formato no permitido. Solo PDF, JPG, PNG, DOC, DOCX, XLS y XLSX.'
      input.value = ''
      archivosAdjuntos.value = []
      return
    }

    if (file.size > tamañoMaximo) {
      errorMsg.value = `El archivo "${file.name}" supera el tamaño máximo permitido de 10MB.`
      input.value = ''
      archivosAdjuntos.value = []
      return
    }
  }

  archivosAdjuntos.value = files
}

const etiquetaEstado: Record<string, string> = {
  open: 'Pendiente',
  in_progress: 'En revisión',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado'
}

const etiquetaPrioridad: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta'
}

const claseEstado: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700'
}

const ticketsFiltrados = computed(() => {
  if (filtroEstado.value === 'todos') return tickets.value
  return tickets.value.filter(t => t.status === filtroEstado.value)
})

async function cargarAbogados() {
  const { data } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('role', 'abogado')

  abogados.value = data ?? []
}

async function cargarServicios() {
  const { data } = await supabase
    .from('servicios')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  servicios.value = data ?? []
}

async function cargarPlantillas() {
  const { data } = await supabase
    .from('document_templates')
    .select('id, title, fields, servicio_id, activo')
    .eq('activo', true)
    .order('title')

  plantillas.value = (data ?? []) as Template[]
}

async function cargarTickets() {
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) return

  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('created_by', authUser.id)
    .order('created_at', { ascending: false })

  loading.value = false

  if (error) { errorMsg.value = error.message; return }
  tickets.value = data ?? []
}

async function abogadoMenosCargado(): Promise<string | null> {
  if (!abogados.value.length) return null

  const { data } = await supabase
    .from('tickets')
    .select('assigned_to')
    .in('status', ['open', 'in_progress'])
    .not('assigned_to', 'is', null)

  const conteo = new Map(abogados.value.map(a => [a.user_id, 0]))
  data?.forEach(t => {
    if (t.assigned_to && conteo.has(t.assigned_to)) {
      conteo.set(t.assigned_to, (conteo.get(t.assigned_to) ?? 0) + 1)
    }
  })

  return [...conteo.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null
}

async function crearTicket() {
  if (!plantillaSeleccionada.value) {
    errorMsg.value = 'Seleccioná el tipo de trámite para continuar.'
    return
  }

  const camposVacios = camposFormulario.value.filter(field => !fieldValues.value[field.key]?.trim())
  if (camposVacios.length) {
    errorMsg.value = 'Completá todos los campos obligatorios del trámite.'
    return
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) { errorMsg.value = 'Sesión no válida.'; return }

  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  // const assignedTo = nuevoAbogado.value || await abogadoMenosCargado()
  const assignedTo = await abogadoMenosCargado()

  const { data: ticketCreado, error } = await supabase
    .from('tickets')
    .insert([{
      created_by: authUser.id,
      assigned_to: assignedTo || null,
      title: plantillaSeleccionada.value.title,
      description: nuevaDescripcion.value.trim() || null,
      priority: nuevaPrioridad.value
    }])
    .select()
    .single()
    
  if (error) {
    loading.value = false
    errorMsg.value = error.message
    return
  }
  ticketRecienCreadoId.value = ticketCreado.id

  const { error: documentoError } = await supabase
    .from('documents')
    .insert([{
      ticket_id: ticketCreado.id,
      template_id: plantillaSeleccionada.value.id,
      field_values: fieldValues.value,
      status: 'submitted',
      created_by: authUser.id
    }])

  if (documentoError) {
    loading.value = false
    errorMsg.value = documentoError.message
    return
  }

  if (archivosAdjuntos.value.length) {
    for (const file of archivosAdjuntos.value) {
      const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${ticketCreado.id}/${Date.now()}_${nombreSeguro}`

      const { error: uploadError } = await supabase.storage
        .from('ticket-adjuntos')
        .upload(filePath, file)

      if (uploadError) {
        loading.value = false
        errorMsg.value = `Error subiendo archivo: ${uploadError.message}`
        return
      }
    }
  }

  loading.value = false

  tramiteSeleccionadoId.value = ''
  fieldValues.value = {}
  nuevaDescripcion.value = ''
  nuevaPrioridad.value = 'normal'
  nuevoAbogado.value = ''
  archivosAdjuntos.value = []
  mostrarFormulario.value = false
  successMsg.value = 'Tu ticket fue creado correctamente.'
  padronMensajes.value = {}

  await cargarTickets()
  
}

async function cancelarTicket(id: string) {
  if (!confirm('¿Cancelar este ticket?')) return

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser?.id) {
    errorMsg.value = authError?.message || 'Sesión no válida.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('created_by', authUser.id)
    .eq('status', 'open')

  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  await supabase.from('ticket_historial').insert([{
    ticket_id: id,
    changed_by: authUser.id,
    old_status: 'open',
    new_status: 'cancelled',
    notes: 'Ticket cancelado por el cliente'
  }])

  await cargarTickets()
}

onMounted(async () => {
  await cargarPerfil()
  await Promise.all([cargarAbogados(), cargarServicios(), cargarPlantillas(), cargarTickets()])
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Mis tickets</h1>
      <button
        class="bg-green-600 text-white px-4 py-2 rounded text-sm"
        @click="mostrarFormulario ? cerrarFormularioNuevoTicket() : abrirFormularioNuevoTicket()"
      >
        {{ mostrarFormulario ? 'Cancelar' : 'Nuevo ticket' }}
      </button>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
      {{ successMsg }}
    </div>
    <div
      v-if="successMsg && ticketRecienCreadoId"
      class="bg-blue-50 text-blue-700 p-3 rounded mb-4 text-sm flex items-center justify-between gap-3 flex-wrap"
      >
      <span>Ya podés completar el traspaso de propiedad para este ticket.</span>
      <NuxtLink
        :to="`/traspaso-carro/${ticketRecienCreadoId}`"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
      >
        Ir a traspaso de carro
       </NuxtLink>
    </div>
    <div v-if="mostrarFormulario" class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 mb-6">
      <h2 class="text-lg font-semibold mb-1">Nuevo ticket</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Seleccioná el tipo de trámite, completá los datos necesarios y agregá cualquier contexto extra o archivos de respaldo.
      </p>

      <div class="grid gap-4">
        <div class="grid gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de trámite <span class="text-red-500">*</span></label>
          <select
            v-model="tramiteSeleccionadoId"
            class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Seleccioná un trámite</option>
            <option v-for="p in plantillas" :key="p.id" :value="p.id">
              {{ servicios.find(s => s.id === p.servicio_id)?.nombre ?? 'Trámite' }} - {{ p.title }}
            </option>
          </select>
        </div>

        <div v-if="plantillaSeleccionada" class="rounded-xl border border-green-100 bg-green-50/80 dark:border-green-900 dark:bg-green-950/30 p-4">
          <p class="text-sm font-medium text-green-800 dark:text-green-200">Trámite seleccionado</p>
          <p class="text-sm text-green-700 dark:text-green-300 mt-1">{{ resumenTramiteSeleccionado }}</p>
          <p class="text-xs text-green-700/80 dark:text-green-400 mt-2">
            Completá todos los campos marcados con asterisco para generar correctamente la solicitud inicial.
          </p>
        </div>

        <div v-if="camposFormulario.length" class="grid gap-4">
          <div v-for="field in camposOrdenados" :key="field.key" class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ field.label }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="fieldValues[field.key]"
              :type="field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              :placeholder="`Ingresá ${field.label.toLowerCase()}`"
            />
            <p
              v-if="esCampoCedula(field) && padronMensajes[field.key]"
              class="text-xs"
              :class="padronMensajes[field.key].startsWith('Datos encontrados') ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'"
            >
              {{ padronMensajes[field.key] }}
            </p>
          </div>
        </div>

        <div v-if="tramiteSeleccionadoId && !camposFormulario.length" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este trámite no tiene campos configurados aún. Igual podés agregar una descripción y adjuntos.
        </div>

        <div class="grid gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Descripción adicional</label>
          <textarea
            v-model="nuevaDescripcion"
            class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Agregá contexto, dudas o instrucciones para el abogado"
            rows="4"
          />
        </div>

        <div class="grid gap-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Adjuntar archivos
          </label>

          <input
            type="file"
            multiple
            class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-800 text-sm"
            @change="seleccionarArchivo"
          />

          <p class="text-xs text-gray-500 dark:text-gray-400">
            Podés adjuntar varios archivos. Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS y XLSX. Máximo 10MB por archivo.
          </p>

          <ul v-if="archivosAdjuntos.length" class="grid gap-1 text-xs text-green-700 dark:text-green-300">
            <li v-for="archivo in archivosAdjuntos" :key="`${archivo.name}-${archivo.size}`">
              Archivo seleccionado: {{ archivo.name }}
            </li>
          </ul>
        </div>

        <div class="flex gap-4 flex-wrap">
          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Prioridad</label>
            <select v-model="nuevaPrioridad" class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm">
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <!--
          <div class="grid gap-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Abogado</label>
            <select v-model="nuevoAbogado" class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm">
              <option value="">Asignar automáticamente</option>
              <option v-for="a in abogados" :key="a.user_id" :value="a.user_id">
                {{ a.display_name ?? 'Abogado' }}
              </option>
            </select>
          </div>
          -->
        </div>

        <div class="flex gap-2 pt-1">
          <button
            class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            :disabled="loading"
            @click="crearTicket"
          >
            {{ loading ? 'Creando...' : 'Crear ticket' }}
          </button>
          <button
            class="border border-gray-300 dark:border-gray-600 px-5 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="cerrarFormularioNuevoTicket()"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-wrap mb-4">
      <button
        v-for="f in ['todos', 'open', 'in_progress', 'resolved', 'closed', 'cancelled']"
        :key="f"
        class="px-3 py-1 rounded border text-sm"
        :class="filtroEstado === f ? 'bg-green-600 text-white border-green-600' : 'border-gray-300'"
        @click="filtroEstado = f"
      >
        {{ f === 'todos' ? 'Todos' : etiquetaEstado[f] }}
      </button>
    </div>

    <p v-if="loading" class="text-gray-500 text-sm">Cargando...</p>

    <div v-else-if="ticketsFiltrados.length === 0" class="text-center py-10 text-gray-400">
      <p>No hay tickets{{ filtroEstado !== 'todos' ? ' con ese estado' : '' }}.</p>
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="t in ticketsFiltrados"
        :key="t.id"
        class="border rounded p-4 hover:shadow-sm transition-shadow"
      >
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <NuxtLink :to="`/ticket/${t.id}`" class="font-medium hover:underline">
              {{ t.title }}
            </NuxtLink>
            <div class="flex gap-2 mt-1 flex-wrap items-center">
              <span class="text-xs px-2 py-0.5 rounded-full" :class="claseEstado[t.status]">
                {{ etiquetaEstado[t.status] }}
              </span>
              <span class="text-xs text-gray-500">
                Prioridad: {{ etiquetaPrioridad[t.priority] }}
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-1">
              {{ new Date(t.created_at).toLocaleDateString('es-CR') }}
            </p>
          </div>

          <button
            v-if="t.status === 'open'"
            class="text-sm text-red-500 hover:underline"
            :disabled="loading"
            @click="cancelarTicket(t.id)"
          >
            Cancelar ticket
          </button>
        </div>

        <p v-if="t.description" class="text-sm text-gray-600 mt-2">{{ t.description }}</p>
        <div class="mt-3 flex gap-2 flex-wrap">
        <NuxtLink
          :to="`/ticket/${t.id}`"
          class="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Ver ticket
        </NuxtLink>

        <NuxtLink
          :to="`/traspaso-carro/${t.id}`"
          class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors"
        >
          Traspaso de carro
        </NuxtLink>
      </div>
      </div>
    </div>
  </div>
</template>
