<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { TicketDocumentFlowSubmission } from '~/components/tickets/TicketDocumentFlow.vue'

definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const supabase = useSupabaseClient<Database>()
const { createNextDocumentVersion, recordDocumentGenerationMetric } = useDocumentWorkflow()

async function crearTicket(payload: TicketDocumentFlowSubmission) {
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser?.id) {
    throw new Error('Sesión no válida.')
  }

  const startedAt = new Date()

  const { data: ticketCreado, error: ticketError } = await supabase
    .from('tickets')
    .insert([{
      created_by: authUser.id,
      assigned_to: null,
      title: payload.template.title,
      description: payload.description || null,
      priority: payload.priority,
    }])
    .select()
    .single()

  if (ticketError || !ticketCreado) {
    throw new Error(ticketError?.message || 'No se pudo crear el ticket.')
  }

  const { data: documentoCreado, error: documentoError } = await supabase
    .from('documents')
    .insert([{
      ticket_id: ticketCreado.id,
      template_id: payload.template.id,
      field_values: payload.fieldValues,
      status: 'submitted',
      created_by: authUser.id,
    }])
    .select()
    .single()

  if (documentoError || !documentoCreado) {
    throw new Error(documentoError?.message || 'No se pudo guardar el documento del ticket.')
  }

  const version = await createNextDocumentVersion({
    document: {
      id: documentoCreado.id,
      ticket_id: documentoCreado.ticket_id,
      template_id: documentoCreado.template_id,
      status: documentoCreado.status,
      field_values: documentoCreado.field_values,
      created_at: documentoCreado.created_at,
      created_by: documentoCreado.created_by,
      reviewed_by: documentoCreado.reviewed_by,
      rejection_reason: documentoCreado.rejection_reason,
    },
    fieldValues: payload.fieldValues,
    renderedContent: payload.renderedContent,
    createdBy: authUser.id,
    source: 'initial',
  })

  if (payload.attachments.length) {
    for (const file of payload.attachments) {
      const nombreSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${ticketCreado.id}/${Date.now()}_${nombreSeguro}`

      const { error: uploadError } = await supabase.storage
        .from('ticket-adjuntos')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`)
      }

      const { error: ticketFileError } = await supabase
        .from('ticket_files')
        .insert([{
          ticket_id: ticketCreado.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type || null,
          uploaded_by: authUser.id,
        }])

      if (ticketFileError) {
        throw new Error(`Error registrando archivo: ${ticketFileError.message}`)
      }
    }
  }

  await recordDocumentGenerationMetric({
    ticketId: ticketCreado.id,
    documentId: documentoCreado.id,
    documentVersionId: version.id,
    actorUserId: authUser.id,
    operationType: 'initial_submission',
    startedAt,
  })

  await navigateTo({
    path: '/tickets',
    query: {
      status: 'created',
      ticket: ticketCreado.id,
    },
  })
}

const templateId = computed(() =>
  typeof route.query.template === 'string' ? route.query.template : null
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl">
    <TicketsTicketDocumentFlow
      eyebrow="Cliente"
      title="Nuevo ticket"
      description="Elegí el trámite, completá la información y revisá la vista previa antes de enviarla al abogado."
      back-to="/tickets"
      :initial-template-id="templateId"
      submit-label="Crear ticket"
      submit-loading-label="Creando..."
      :submit-handler="crearTicket"
    />
  </div>
</template>
