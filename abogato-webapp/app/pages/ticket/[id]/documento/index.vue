<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { TicketDocumentFlowSubmission } from '~/components/tickets/TicketDocumentFlow.vue'
import { renderDocumentTemplate } from '~~/shared/utils/render-document-template'

definePageMeta({ layout: 'app', middleware: 'auth' })

type TicketRow = Database['public']['Tables']['tickets']['Row']
type DocumentRow = Database['public']['Tables']['documents']['Row']

type Ticket = Pick<TicketRow, 'id' | 'title' | 'description' | 'status' | 'priority' | 'created_by' | 'assigned_to' | 'created_at'>
type Documento = Pick<
  DocumentRow,
  'id' | 'ticket_id' | 'template_id' | 'status' | 'field_values' | 'created_at' | 'updated_at' | 'created_by' | 'reviewed_by' | 'rejection_reason'
> & {
  document_templates?: { title: string | null; content: string | null } | { title: string | null; content: string | null }[] | null
}

const supabase = useSupabaseClient<Database>()
const route = useRoute()
const { profile, cargarPerfil } = useUsuario()
const {
  ensureBaselineDocumentVersion,
  createNextDocumentVersion,
  recordDocumentGenerationMetric,
} = useDocumentWorkflow()

const pageLoading = ref(true)
const errorMsg = ref('')
const ticket = ref<Ticket | null>(null)
const documento = ref<Documento | null>(null)
const abogadoAsignado = ref<{ display_name: string | null; office_address: string | null } | null>(null)

function obtenerPlantillaDocumento(value: Documento['document_templates']) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const templateId = computed(() => documento.value?.template_id ?? null)
const initialFieldValues = computed(() => {
  const raw = documento.value?.field_values
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  return raw as Record<string, string | number | boolean | null | undefined>
})

const currentSystemValues = computed(() => ({
  nombre_notario: abogadoAsignado.value?.display_name ?? '',
  direccion_notario: abogadoAsignado.value?.office_address ?? '',
}))

const documentIdFromQuery = computed(() =>
  typeof route.query.document === 'string' && route.query.document.trim()
    ? route.query.document
    : null
)

const isClientEditor = computed(() => profile.value?.role === 'cliente')
const isLawyerEditor = computed(() => profile.value?.role === 'abogado')

const correctionFlowCopy = computed(() => {
  if (isLawyerEditor.value) {
    return {
      eyebrow: 'Abogado',
      title: 'Ajustar documento',
      description: 'Revisá el documento actual, aplicá los ajustes necesarios y dejalo listo para continuar con la revisión.',
      submitLabel: 'Guardar ajustes',
      submitLoadingLabel: 'Guardando...',
      successStatus: 'document-updated',
      historyNote: 'Documento ajustado por el abogado para continuar la revisión',
    }
  }

  return {
    eyebrow: 'Cliente',
    title: 'Corregir documento',
    description: 'Ajustá los datos observados por el abogado, revisá la nueva vista previa y enviá una versión corregida.',
    submitLabel: 'Enviar corrección',
    submitLoadingLabel: 'Enviando...',
    successStatus: 'document-corrected',
    historyNote: 'Documento corregido por el cliente y reenviado a revisión',
  }
})

const blockingReason = computed(() => {
  if (!documento.value) return ''
  if (isClientEditor.value && ticket.value && ['resolved', 'closed', 'cancelled'].includes(ticket.value.status)) {
    return 'Este ticket ya no admite correcciones porque el trámite está cerrado.'
  }
  if (isLawyerEditor.value) {
    if (ticket.value && ['resolved', 'closed', 'cancelled'].includes(ticket.value.status)) {
      return 'El ticket ya está cerrado y no admite ajustes desde esta pantalla.'
    }
    if (documento.value.status === 'approved') return 'El documento ya fue aprobado y no admite ajustes desde esta pantalla.'
    return ''
  }
  if (documento.value.status === 'submitted') return 'El documento ya fue enviado y está en revisión. No se puede editar hasta que el abogado termine.'
  if (documento.value.status === 'approved') return 'El documento ya fue aprobado y no admite edición.'
  if (documento.value.status !== 'rejected') return 'Este documento no está disponible para corrección desde esta pantalla.'
  return ''
})

async function cargarAbogadoAsignado(userId: string | null) {
  if (!userId) {
    abogadoAsignado.value = null
    return
  }

  const { data } = await supabase
    .from('profiles')
    .select('display_name, office_address')
    .eq('user_id', userId)
    .maybeSingle()

  abogadoAsignado.value = data ?? null
}

async function cargarDatos() {
  pageLoading.value = true
  errorMsg.value = ''

  try {
    await cargarPerfil()

    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser?.id) {
      throw new Error('Sesión no válida.')
    }

    if (!['cliente', 'abogado'].includes(profile.value?.role ?? '')) {
      throw new Error('Solo cliente y abogado pueden abrir esta pantalla.')
    }

    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('id, title, description, status, priority, created_by, assigned_to, created_at')
      .eq('id', route.params.id as string)
      .maybeSingle()

    if (ticketError || !ticketData) {
      throw new Error(ticketError?.message || 'No se encontró el ticket solicitado.')
    }

    if (isClientEditor.value && ticketData.created_by !== authUser.id) {
      throw new Error('No tenés permisos para corregir este documento.')
    }

    if (isLawyerEditor.value && ticketData.assigned_to !== authUser.id) {
      throw new Error('Solo el abogado asignado puede ajustar este documento.')
    }

    ticket.value = ticketData as Ticket
    await cargarAbogadoAsignado(ticket.value.assigned_to)

    let documentQuery = supabase
      .from('documents')
      .select('id, ticket_id, template_id, status, field_values, created_at, updated_at, created_by, reviewed_by, rejection_reason, document_templates(title, content)')

    if (documentIdFromQuery.value) {
      documentQuery = documentQuery.eq('id', documentIdFromQuery.value)
    } else {
      documentQuery = documentQuery
        .eq('ticket_id', ticket.value.id)
        .order('updated_at', { ascending: false })
        .limit(1)
    }

    const { data: documentData, error: documentError } = await documentQuery.maybeSingle()

    if (documentError || !documentData) {
      throw new Error(documentError?.message || 'No se encontró el documento que querés corregir.')
    }

    if (documentData.ticket_id !== ticket.value.id) {
      throw new Error('El documento solicitado no pertenece a este ticket.')
    }

    if (!documentData.template_id) {
      throw new Error('El documento no tiene una plantilla asociada para poder corregirse.')
    }

    documento.value = documentData as Documento
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'No se pudo abrir la corrección del documento.'
  } finally {
    pageLoading.value = false
  }
}

async function guardarCorreccion(payload: TicketDocumentFlowSubmission) {
  if (!ticket.value || !documento.value) {
    throw new Error('No se encontró el documento a corregir.')
  }

  if (blockingReason.value) {
    throw new Error(blockingReason.value)
  }

  const template = obtenerPlantillaDocumento(documento.value.document_templates)
  if (!template?.content) {
    throw new Error('No se encontró la plantilla base para regenerar el historial.')
  }

  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.id) {
    throw new Error('Sesión no válida.')
  }

  const startedAt = new Date()
  const correctedAt = new Date().toISOString()

  await ensureBaselineDocumentVersion({
    document: {
      id: documento.value.id,
      ticket_id: documento.value.ticket_id,
      template_id: documento.value.template_id,
      status: documento.value.status,
      field_values: documento.value.field_values,
      created_at: documento.value.created_at,
      updated_at: documento.value.updated_at,
      created_by: documento.value.created_by,
      reviewed_by: documento.value.reviewed_by,
      rejection_reason: documento.value.rejection_reason,
    },
    renderedContent: renderDocumentTemplate(
      template.content,
      initialFieldValues.value,
      currentSystemValues.value
    ),
    fallbackCreatedBy: authUser.id,
  })

  const { data: documentoActualizado, error: documentUpdateError } = await supabase
    .from('documents')
    .update({
      field_values: payload.fieldValues,
      status: 'submitted',
      rejection_reason: null,
      reviewed_by: null,
      updated_at: correctedAt,
    })
    .eq('id', documento.value.id)
    .select('id, ticket_id, template_id, status, field_values, created_at, updated_at, created_by, reviewed_by, rejection_reason')
    .maybeSingle()

  if (documentUpdateError) {
    if (documentUpdateError.message.includes('Cannot coerce the result to a single JSON object')) {
      throw new Error('La base de datos no permitió actualizar el documento corregido. Revisá la policy de UPDATE sobre public.documents para clientes.')
    }

    throw new Error(documentUpdateError.message)
  }

  if (!documentoActualizado) {
    throw new Error('La base de datos no devolvió el documento corregido. Revisá la policy de UPDATE sobre public.documents para clientes.')
  }

  const version = await createNextDocumentVersion({
    document: {
      id: documentoActualizado.id,
      ticket_id: documentoActualizado.ticket_id,
      template_id: documentoActualizado.template_id,
      status: documentoActualizado.status,
      field_values: documentoActualizado.field_values,
      created_at: documentoActualizado.created_at,
      updated_at: documentoActualizado.updated_at,
      created_by: documentoActualizado.created_by,
      reviewed_by: documentoActualizado.reviewed_by,
      rejection_reason: documentoActualizado.rejection_reason,
    },
    fieldValues: payload.fieldValues,
    renderedContent: payload.renderedContent,
    createdBy: authUser.id,
    source: 'correction',
  })

  documento.value = {
    ...documento.value,
    ...documentoActualizado,
    document_templates: documento.value.document_templates,
  }

  await recordDocumentGenerationMetric({
    ticketId: ticket.value.id,
    documentId: documento.value.id,
    documentVersionId: version.id,
    actorUserId: authUser.id,
    operationType: 'correction',
    startedAt,
  })

  const nextTicketStatus = ticket.value.assigned_to ? 'in_progress' : ticket.value.status

  if (nextTicketStatus !== ticket.value.status) {
    const { error: ticketUpdateError } = await supabase
      .from('tickets')
      .update({ status: nextTicketStatus })
      .eq('id', ticket.value.id)

    if (ticketUpdateError) {
      throw new Error(ticketUpdateError.message)
    }
  }

  await supabase.from('ticket_historial').insert([{
    ticket_id: ticket.value.id,
    changed_by: authUser.id,
    old_status: ticket.value.status,
    new_status: nextTicketStatus,
    notes: correctionFlowCopy.value.historyNote,
  }])

  await navigateTo({
    path: `/ticket/${ticket.value.id}`,
    query: {
      status: correctionFlowCopy.value.successStatus,
    },
  })
}

onMounted(async () => {
  await cargarDatos()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      title="No se pudo abrir la corrección"
      :description="errorMsg"
      class="mb-4"
    />

    <div
      v-if="pageLoading"
      class="rounded-[2rem] border border-default/80 bg-default/85 px-6 py-12 text-center text-sm text-muted shadow-sm"
    >
      Preparando el documento para corregir...
    </div>

    <template v-else-if="ticket && documento">
      <UAlert
        v-if="blockingReason"
        color="warning"
        variant="soft"
        title="Edición bloqueada"
        :description="blockingReason"
        class="mb-4"
      />

      <UAlert
        v-if="!blockingReason && documento.rejection_reason"
        color="error"
        variant="soft"
        title="Motivo del rechazo"
        :description="documento.rejection_reason"
        class="mb-4"
      />

      <TicketsTicketDocumentFlow
        v-if="!blockingReason"
        mode="correction"
        :eyebrow="correctionFlowCopy.eyebrow"
        :title="correctionFlowCopy.title"
        :description="correctionFlowCopy.description"
        :back-to="`/ticket/${ticket.id}`"
        back-label="Volver al ticket"
        :locked-template-id="templateId"
        :initial-field-values="initialFieldValues"
        :initial-rejection-reason="documento.rejection_reason"
        :system-values="currentSystemValues"
        :allow-attachments="false"
        :submit-label="correctionFlowCopy.submitLabel"
        :submit-loading-label="correctionFlowCopy.submitLoadingLabel"
        :submit-handler="guardarCorreccion"
      />
    </template>
  </div>
</template>
