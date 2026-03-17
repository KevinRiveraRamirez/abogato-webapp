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

type FieldValue = string | number | null | undefined

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
const ticketRecienCreadoId = ref('')
const fieldValues = ref<Record<string, FieldValue>>({})

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
const padronMensajes = ref<Record<string, string>>({})
const ultimaCedulaBuscada = ref<Record<string, string>>({})
const ultimoLookupIdPorCampo = ref<Record<string, number>>({})
const cedulaLookupTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
let siguienteLookupId = 0

function normalizarTexto(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function textoDeCampo(value: FieldValue) {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

function campoEstaVacio(value: FieldValue) {
  return textoDeCampo(value).trim() === ''
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

function obtenerTipoPersona(field: Field) {
  const source = `${normalizarTexto(field.key)}${normalizarTexto(field.label)}`

  if (['apoderado', 'apoderada', 'mandatario', 'representante'].some((candidate) => source.includes(candidate))) {
    return 'apoderado'
  }

  if (['cliente', 'otorgante', 'poderdante', 'titular'].some((candidate) => source.includes(candidate))) {
    return 'cliente'
  }

  if (['conyuge', 'esposo', 'esposa', 'pareja'].some((candidate) => source.includes(candidate))) {
    return 'conyuge'
  }

  return 'titular'
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
  const tipoPersona = obtenerTipoPersona(field)
  const digitos = source.match(/\d+/)?.[0] ?? ''

  if (digitos) return `${tipoPersona}-${digitos}`
  return tipoPersona
}

function prioridadTokenPersona(token: string) {
  if (token.startsWith('cliente') || token.startsWith('titular')) return 0
  if (token.startsWith('apoderado')) return 1
  if (token.startsWith('conyuge')) return 2
  return 3
}

const camposOrdenados = computed(() => {
  const ordenados: Field[] = []
  const usados = new Set<string>()

  const indicesCedulaOrdenados = [...indicesCedula.value].sort((a, b) => {
    const campoA = camposFormulario.value[a]
    const campoB = camposFormulario.value[b]
    const prioridadA = campoA ? prioridadTokenPersona(obtenerTokenPersona(campoA)) : 99
    const prioridadB = campoB ? prioridadTokenPersona(obtenerTokenPersona(campoB)) : 99

    if (prioridadA !== prioridadB) return prioridadA - prioridadB
    return a - b
  })

  indicesCedulaOrdenados.forEach((cedulaIndex) => {
    const cedula = camposFormulario.value[cedulaIndex]
    if (!cedula) return

    const token = obtenerTokenPersona(cedula)
    const relacionados = camposFormulario.value.filter((field) =>
      field.key !== cedula.key &&
      !esCampoCedula(field) &&
      obtenerTokenPersona(field) === token
    )
    const nombres = relacionados.filter(esCampoNombre)
    const otros = relacionados.filter((field) => !esCampoNombre(field))

    ordenados.push(cedula)
    usados.add(cedula.key)

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

async function autocompletarDesdePadron(cedulaKey: string, cedula: string, lookupId: number) {
  if (!cedula || cedula.length < 9) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: '' }
    return
  }

  const { data, error } = await supabase
    .from('padron_electores')
    .select('cedula, nombre, apellido_1, apellido_2, nombre_completo')
    .eq('cedula', cedula)
    .maybeSingle()

  if (ultimoLookupIdPorCampo.value[cedulaKey] !== lookupId) return

  ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [cedulaKey]: cedula }

  if (error) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No se pudo consultar el padrón en este momento.' }
    return
  }

  if (!data) {
    padronMensajes.value = { ...padronMensajes.value, [cedulaKey]: 'No encontramos esa cédula en el padrón.' }
    return
  }

  const actualizaciones: Record<string, FieldValue> = { ...fieldValues.value }
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

const opcionesTramite = computed(() =>
  plantillas.value.map((p) => ({
    label: `${servicios.value.find((s) => s.id === p.servicio_id)?.nombre ?? 'Trámite'} - ${p.title}`,
    value: p.id,
  }))
)

const opcionesPrioridad = [
  { label: 'Baja', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'Alta', value: 'high' },
] as const

const camposFormulario = computed(() => plantillaSeleccionada.value?.fields ?? [])

const resumenTramiteSeleccionado = computed(() => {
  if (!plantillaSeleccionada.value) return ''

  const servicio = servicios.value.find(s => s.id === plantillaSeleccionada.value?.servicio_id)
  return servicio ? `${servicio.nombre} · ${plantillaSeleccionada.value.title}` : plantillaSeleccionada.value.title
})

watch(tramiteSeleccionadoId, (templateId) => {
  const template = plantillas.value.find(p => p.id === templateId)
  const nextValues: Record<string, FieldValue> = {}

  template?.fields.forEach((field) => {
    nextValues[field.key] = fieldValues.value[field.key] ?? ''
  })

  fieldValues.value = nextValues
  padronMensajes.value = {}
  ultimaCedulaBuscada.value = {}
})

watch(fieldValues, (values) => {
  const cedulas = indicesCedula.value.map((index) => {
    const field = camposFormulario.value[index]
    return {
      key: field.key,
      value: textoDeCampo(values[field.key]).replace(/\D/g, ''),
    }
  })

  cedulas.forEach(({ key, value }) => {
    const timeout = cedulaLookupTimeouts.get(key)
    if (timeout) {
      clearTimeout(timeout)
      cedulaLookupTimeouts.delete(key)
    }

    if (!value) {
      padronMensajes.value = { ...padronMensajes.value, [key]: '' }
      ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [key]: '' }
      return
    }

    if (value.length < 9) {
      padronMensajes.value = {
        ...padronMensajes.value,
        [key]: 'Ingresá una cédula completa para autocompletar los datos.',
      }
      ultimaCedulaBuscada.value = { ...ultimaCedulaBuscada.value, [key]: '' }
      return
    }

    if (ultimaCedulaBuscada.value[key] === value) return

    const lookupId = ++siguienteLookupId
    ultimoLookupIdPorCampo.value = { ...ultimoLookupIdPorCampo.value, [key]: lookupId }

    const nuevoTimeout = setTimeout(() => {
      autocompletarDesdePadron(key, value, lookupId)
    }, 450)

    cedulaLookupTimeouts.set(key, nuevoTimeout)
  })
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

const colorEstado: Record<string, 'warning' | 'info' | 'success' | 'neutral' | 'error'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
  cancelled: 'error'
}

const colorPrioridad: Record<Ticket['priority'], 'neutral' | 'warning' | 'error'> = {
  low: 'neutral',
  normal: 'warning',
  high: 'error'
}

const filtrosEstado = ['todos', 'open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const

const ticketsFiltrados = computed(() => {
  if (filtroEstado.value === 'todos') return tickets.value
  return tickets.value.filter(t => t.status === filtroEstado.value)
})

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

async function crearTicket() {
  if (!plantillaSeleccionada.value) {
    errorMsg.value = 'Seleccioná el tipo de trámite para continuar.'
    return
  }

  const camposVacios = camposFormulario.value.filter(field => campoEstaVacio(fieldValues.value[field.key]))
  if (camposVacios.length) {
    errorMsg.value = 'Completá todos los campos obligatorios del trámite.'
    return
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.id) { errorMsg.value = 'Sesión no válida.'; return }

  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  const { data: ticketCreado, error } = await supabase
    .from('tickets')
    .insert([{
      created_by: authUser.id,
      assigned_to: null,
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
  await Promise.all([cargarServicios(), cargarPlantillas(), cargarTickets()])
})
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Mis tickets</h1>
        <p class="mt-1 text-sm text-muted">
          Creá solicitudes, adjuntá documentos y seguí el estado de cada trámite.
        </p>
      </div>
      <UButton @click="mostrarFormulario ? cerrarFormularioNuevoTicket() : abrirFormularioNuevoTicket()">
        {{ mostrarFormulario ? 'Cancelar' : 'Nuevo ticket' }}
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

    <UCard
      v-if="successMsg && ticketRecienCreadoId"
      class="mb-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted">El ticket quedó creado. Si necesitás cargar datos del vehículo, continuá desde la página de traspasos.</p>
        <UButton :to="`/traspaso-carro?ticket=${ticketRecienCreadoId}`">
          Ir a traspasos
        </UButton>
      </div>
    </UCard>

    <UCard v-if="mostrarFormulario" class="mb-6">
      <template #header>
        <div>
          <h2 class="text-lg font-semibold text-highlighted">Nuevo ticket</h2>
          <p class="mt-1 text-sm text-muted">
            Seleccioná el tipo de trámite, completá los datos necesarios y agregá contexto o archivos de respaldo.
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <UFormField label="Tipo de trámite" required>
          <USelect
            v-model="tramiteSeleccionadoId"
            placeholder="Seleccioná un trámite"
            value-key="value"
            :items="opcionesTramite"
          />
        </UFormField>

        <UAlert
          v-if="plantillaSeleccionada"
          color="success"
          variant="soft"
          title="Trámite seleccionado"
          :description="resumenTramiteSeleccionado"
        />

        <div v-if="camposFormulario.length" class="grid gap-4 md:grid-cols-2">
          <UFormField
            v-for="field in camposOrdenados"
            :key="field.key"
            :label="field.label"
            required
            :help="esCampoCedula(field) ? padronMensajes[field.key] : undefined"
          >
            <UInput
              v-model="fieldValues[field.key]"
              :type="field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'"
              :placeholder="`Ingresá ${field.label.toLowerCase()}`"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="tramiteSeleccionadoId && !camposFormulario.length"
          color="warning"
          variant="soft"
          title="Plantilla sin campos"
          description="Este trámite no tiene campos configurados aún. Igual podés agregar una descripción y adjuntos."
        />

        <UFormField label="Descripción adicional">
          <UTextarea
            v-model="nuevaDescripcion"
            placeholder="Agregá contexto, dudas o instrucciones para el abogado"
            :rows="4"
          />
        </UFormField>

        <UFormField
          label="Adjuntar archivos"
          help="Podés adjuntar varios archivos. Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS y XLSX. Máximo 10MB por archivo."
        >
          <input
            type="file"
            multiple
            class="block w-full rounded-xl border border-default bg-default px-4 py-3 text-sm"
            @change="seleccionarArchivo"
          >
        </UFormField>

        <div v-if="archivosAdjuntos.length" class="grid gap-2">
          <UBadge
            v-for="archivo in archivosAdjuntos"
            :key="`${archivo.name}-${archivo.size}`"
            color="success"
            variant="subtle"
            class="w-fit"
          >
            {{ archivo.name }}
          </UBadge>
        </div>

        <div class="grid gap-4 sm:max-w-xs">
          <UFormField label="Prioridad">
            <USelect
              v-model="nuevaPrioridad"
              value-key="value"
              :items="opcionesPrioridad"
            />
          </UFormField>
        </div>

        <div class="flex flex-wrap gap-3">
          <UButton :loading="loading" @click="crearTicket">
            {{ loading ? 'Creando...' : 'Crear ticket' }}
          </UButton>
          <UButton color="neutral" variant="ghost" @click="cerrarFormularioNuevoTicket()">
            Cancelar
          </UButton>
        </div>
      </div>
    </UCard>

    <div class="mb-4 flex flex-wrap gap-2">
      <UButton
        v-for="f in filtrosEstado"
        :key="f"
        size="sm"
        :color="filtroEstado === f ? 'primary' : 'neutral'"
        :variant="filtroEstado === f ? 'solid' : 'outline'"
        @click="filtroEstado = f"
      >
        {{ f === 'todos' ? 'Todos' : etiquetaEstado[f] }}
      </UButton>
    </div>

    <UCard v-if="loading">
      <p class="text-sm text-muted">Cargando...</p>
    </UCard>

    <UCard v-else-if="ticketsFiltrados.length === 0">
      <p class="text-sm text-muted">No hay tickets{{ filtroEstado !== 'todos' ? ' con ese estado' : '' }}.</p>
    </UCard>

    <div v-else class="grid gap-3">
      <UCard
        v-for="t in ticketsFiltrados"
        :key="t.id"
      >
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <NuxtLink :to="`/ticket/${t.id}`" class="font-medium text-highlighted hover:text-primary">
              {{ t.title }}
            </NuxtLink>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <UBadge :color="colorEstado[t.status]" variant="subtle">
                {{ etiquetaEstado[t.status] }}
              </UBadge>
              <UBadge :color="colorPrioridad[t.priority]" variant="outline">
                Prioridad: {{ etiquetaPrioridad[t.priority] }}
              </UBadge>
            </div>
            <p class="mt-1 text-xs text-toned">
              {{ new Date(t.created_at).toLocaleDateString('es-CR') }}
            </p>
          </div>

          <UButton
            v-if="t.status === 'open'"
            color="error"
            variant="ghost"
            :disabled="loading"
            @click="cancelarTicket(t.id)"
          >
            Cancelar ticket
          </UButton>
        </div>

        <p v-if="t.description" class="mt-3 text-sm text-muted">{{ t.description }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UButton
            :to="`/ticket/${t.id}`"
            color="neutral"
            variant="outline"
          >
            Ver ticket
          </UButton>

        </div>
      </UCard>
    </div>
  </div>
</template>
