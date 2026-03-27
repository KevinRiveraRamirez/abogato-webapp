<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { DropdownMenuItem, TableColumn } from '#ui/types'
import type { Database, Json } from '~/types/database.types'

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

type FieldValue = string | number | undefined
type TicketRow = Database['public']['Tables']['tickets']['Row']
type TemplateRow = Database['public']['Tables']['document_templates']['Row']
type DocumentRow = Database['public']['Tables']['documents']['Row']

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

type DocumentoResumen = {
  ticket_id: string | null
  status: string
  created_at: string
}

function esListaDeCampos(value: Json): value is Field[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false

    const field = item as Record<string, unknown>
    return typeof field.key === 'string'
      && typeof field.label === 'string'
      && ['text', 'date', 'number'].includes(String(field.type))
  })
}

function normalizarEstadoTicket(value: string): Ticket['status'] {
  return ['open', 'in_progress', 'resolved', 'closed', 'cancelled'].includes(value)
    ? value as Ticket['status']
    : 'open'
}

function normalizarPrioridad(value: string): Ticket['priority'] {
  return ['low', 'normal', 'high'].includes(value)
    ? value as Ticket['priority']
    : 'normal'
}

function normalizarPlantilla(row: Pick<TemplateRow, 'id' | 'title' | 'fields' | 'servicio_id' | 'activo'>): Template | null {
  if (row.servicio_id == null) return null

  return {
    id: row.id,
    title: row.title,
    fields: esListaDeCampos(row.fields) ? row.fields : [],
    servicio_id: row.servicio_id,
    activo: row.activo ?? true,
  }
}

function normalizarTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: normalizarEstadoTicket(row.status),
    priority: normalizarPrioridad(row.priority),
    created_by: row.created_by,
    assigned_to: row.assigned_to,
    created_at: row.created_at,
  }
}

const tickets = ref<Ticket[]>([])
const servicios = ref<Servicio[]>([])
const plantillas = ref<Template[]>([])
const estadoDocumentoPorTicket = ref<Record<string, string>>({})

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const filtroEstado = ref('todos')
const busqueda = ref('')
const mostrarFormulario = ref(false)

const tramiteSeleccionadoId = ref('')
const nuevaDescripcion = ref('')
const nuevaPrioridad = ref<'low' | 'normal' | 'high'>('normal')
const nuevoAbogado = ref('')
const ticketRecienCreadoId = ref('')
const fieldValues = ref<Record<string, FieldValue>>({})

const archivosAdjuntos = ref<File[]>([])

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

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
] as Array<{ label: string, value: Ticket['priority'] }>

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
  const cedulas = indicesCedula.value.flatMap((index) => {
    const field = camposFormulario.value[index]
    if (!field) return []

    return [{
      key: field.key,
      value: textoDeCampo(values[field.key]).replace(/\D/g, ''),
    }]
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
  const termino = busqueda.value.trim().toLowerCase()

  return tickets.value.filter((ticket) => {
    const coincideEstado = filtroEstado.value === 'todos' || ticket.status === filtroEstado.value

    if (!coincideEstado) return false
    if (!termino) return true

    return [
      ticket.id,
      ticket.title,
      ticket.description ?? '',
      etiquetaEstado[ticket.status],
      etiquetaPrioridad[ticket.priority],
      estadoDocumentoPorTicket.value[ticket.id] === 'rejected' ? 'documento rechazado' : '',
    ].some((value) => String(value).toLowerCase().includes(termino))
  })
})

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function obtenerMenuAcciones(ticket: Ticket): DropdownMenuItem[][] {
  const items: DropdownMenuItem[][] = [[
    {
      label: 'Ver ticket',
      icon: 'i-lucide-external-link',
      to: `/ticket/${ticket.id}`,
    },
  ]]

  if (ticket.status === 'open') {
    items.push([
      {
        label: 'Cancelar ticket',
        icon: 'i-lucide-ban',
        color: 'error',
        onSelect: () => cancelarTicket(ticket.id),
      },
    ])
  }

  return items
}

const columns = computed<TableColumn<Ticket>[]>(() => [
  {
    accessorKey: 'id',
    header: 'Ticket',
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, `#${String(row.original.id).slice(0, 8)}`),
    meta: {
      class: {
        th: 'w-32',
        td: 'align-top',
      },
    },
  },
  {
    accessorKey: 'title',
    header: 'Asunto',
    cell: ({ row }) => h('div', { class: 'min-w-0' }, [
      h('p', { class: 'font-medium text-highlighted' }, row.original.title),
      row.original.description
        ? h('p', { class: 'mt-1 line-clamp-2 text-xs text-muted' }, row.original.description)
        : null,
    ]),
  },
  {
    accessorKey: 'priority',
    header: 'Prioridad',
    cell: ({ row }) => h(UBadge, {
      color: colorPrioridad[row.original.priority],
      variant: 'subtle',
    }, () => etiquetaPrioridad[row.original.priority]),
    meta: {
      class: {
        th: 'w-36',
        td: 'align-top',
      },
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, formatearFecha(row.original.created_at)),
    meta: {
      class: {
        th: 'w-36',
        td: 'align-top',
      },
    },
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => h('div', { class: 'flex flex-wrap items-center gap-2' }, [
      h(UBadge, {
        color: colorEstado[row.original.status],
        variant: 'subtle',
      }, () => etiquetaEstado[row.original.status]),
      estadoDocumentoPorTicket.value[row.original.id] === 'rejected'
        ? h(UBadge, {
            color: 'error',
            variant: 'soft',
          }, () => 'Documento rechazado')
        : null,
    ]),
    meta: {
      class: {
        th: 'w-56',
        td: 'align-top',
      },
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h(UDropdownMenu, {
      items: obtenerMenuAcciones(row.original),
    }, {
      default: () => h(UButton, {
        size: 'sm',
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-ellipsis',
        square: true,
      }),
    }),
    meta: {
      class: {
        th: 'w-16',
        td: 'align-top text-right',
      },
    },
  },
])

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

  plantillas.value = (data ?? [])
    .map((row) => normalizarPlantilla(row as Pick<TemplateRow, 'id' | 'title' | 'fields' | 'servicio_id' | 'activo'>))
    .filter((template): template is Template => template !== null)
}

async function cargarEstadosDocumento(ticketIds: string[]) {
  if (!ticketIds.length) {
    estadoDocumentoPorTicket.value = {}
    return
  }

  const { data, error } = await supabase
    .from('documents')
    .select('ticket_id, status, created_at')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: false })

  if (error) {
    errorMsg.value = error.message
    return
  }

  const siguienteEstado: Record<string, string> = {}

  for (const documento of (data ?? []) as Array<Pick<DocumentRow, 'ticket_id' | 'status' | 'created_at'>>) {
    if (!documento.status || !documento.created_at) continue
    if (!documento.ticket_id || siguienteEstado[documento.ticket_id]) continue
    siguienteEstado[documento.ticket_id] = documento.status
  }

  estadoDocumentoPorTicket.value = siguienteEstado
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
  tickets.value = (data ?? []).map((row) => normalizarTicket(row as TicketRow))
  await cargarEstadosDocumento(tickets.value.map(ticket => ticket.id))
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
  <div class="mx-auto w-full max-w-7xl">
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
              :model-value="fieldValues[field.key] ?? ''"
              :type="field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'"
              :placeholder="`Ingresá ${field.label.toLowerCase()}`"
              @update:model-value="(value) => { fieldValues[field.key] = value }"
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

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="grid gap-3 sm:max-w-md">
            <h2 class="font-semibold text-highlighted">Bandeja de tickets</h2>
            <UInput
              v-model="busqueda"
              icon="i-lucide-search"
              placeholder="Buscar por ticket, asunto, estado o prioridad"
            />
          </div>

          <div class="flex flex-wrap gap-2">
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
        </div>
      </template>

      <UTable
        :data="ticketsFiltrados"
        :columns="columns"
        :loading="loading"
        sticky="header"
        empty="No hay tickets para este filtro."
      />
    </UCard>
  </div>
</template>
