import type { Database, Json } from '~/types/database.types'

type DocumentRow = Database['public']['Tables']['documents']['Row']
type DocumentVersionRow = Database['public']['Tables']['document_versions']['Row']

type FieldValue = string | number | boolean | null | undefined

type DocumentSnapshot = Pick<
  DocumentRow,
  'id' | 'ticket_id' | 'template_id' | 'status' | 'field_values' | 'created_at' | 'created_by' | 'reviewed_by' | 'rejection_reason'
>

type VersionSource = DocumentVersionRow['source']
type VersionStatus = DocumentVersionRow['status']

function asFieldValues(value: unknown): Record<string, FieldValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, FieldValue>
}

function normalizeVersionStatus(value: string | null | undefined): VersionStatus {
  return ['draft', 'submitted', 'approved', 'rejected'].includes(String(value))
    ? String(value) as VersionStatus
    : 'draft'
}

function toJsonRecord(value: Record<string, FieldValue>): Json {
  return value as Json
}

export function useDocumentWorkflow() {
  const supabase = useSupabaseClient<Database>()

  async function getLatestDocumentVersion(documentId: string) {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as DocumentVersionRow | null
  }

  async function insertDocumentVersion(input: {
    documentId: string
    ticketId: string
    templateId: string
    versionNumber: number
    fieldValues: Record<string, FieldValue>
    renderedContent: string
    createdBy: string
    status?: VersionStatus
    source?: VersionSource
    rejectionReason?: string | null
    reviewedBy?: string | null
    createdAt?: string
  }) {
    const { data, error } = await supabase
      .from('document_versions')
      .insert([{
        document_id: input.documentId,
        ticket_id: input.ticketId,
        template_id: input.templateId,
        version_number: input.versionNumber,
        field_values: toJsonRecord(input.fieldValues),
        rendered_content: input.renderedContent,
        created_by: input.createdBy,
        status: input.status ?? 'submitted',
        source: input.source ?? 'initial',
        rejection_reason: input.rejectionReason ?? null,
        reviewed_by: input.reviewedBy ?? null,
        created_at: input.createdAt ?? new Date().toISOString(),
      }])
      .select('*')
      .single()

    if (error) throw error
    return data as DocumentVersionRow
  }

  async function ensureBaselineDocumentVersion(input: {
    document: DocumentSnapshot
    renderedContent: string
    fallbackCreatedBy: string
  }) {
    const existingVersion = await getLatestDocumentVersion(input.document.id)

    if (existingVersion) {
      return existingVersion
    }

    return insertDocumentVersion({
      documentId: input.document.id,
      ticketId: input.document.ticket_id ?? '',
      templateId: input.document.template_id ?? '',
      versionNumber: 1,
      fieldValues: asFieldValues(input.document.field_values),
      renderedContent: input.renderedContent,
      createdBy: input.document.created_by ?? input.fallbackCreatedBy,
      status: normalizeVersionStatus(input.document.status),
      source: 'initial',
      rejectionReason: input.document.rejection_reason,
      reviewedBy: input.document.reviewed_by,
      createdAt: input.document.created_at ?? new Date().toISOString(),
    })
  }

  async function createNextDocumentVersion(input: {
    document: DocumentSnapshot
    fieldValues: Record<string, FieldValue>
    renderedContent: string
    createdBy: string
    source: VersionSource
  }) {
    const latestVersion = await getLatestDocumentVersion(input.document.id)
    const versionNumber = latestVersion?.version_number != null
      ? latestVersion.version_number + 1
      : 1

    return insertDocumentVersion({
      documentId: input.document.id,
      ticketId: input.document.ticket_id ?? '',
      templateId: input.document.template_id ?? '',
      versionNumber,
      fieldValues: input.fieldValues,
      renderedContent: input.renderedContent,
      createdBy: input.createdBy,
      status: 'submitted',
      source: input.source,
    })
  }

  async function syncLatestDocumentVersionReview(input: {
    documentId: string
    status: VersionStatus
    reviewedBy?: string | null
    rejectionReason?: string | null
  }) {
    const latestVersion = await getLatestDocumentVersion(input.documentId)

    if (!latestVersion) return null

    const { data, error } = await supabase
      .from('document_versions')
      .update({
        status: input.status,
        reviewed_by: input.reviewedBy ?? null,
        rejection_reason: input.rejectionReason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', latestVersion.id)
      .select('*')
      .single()

    if (error) throw error
    return data as DocumentVersionRow
  }

  async function recordDocumentGenerationMetric(input: {
    ticketId: string
    documentId: string
    documentVersionId?: string | null
    actorUserId: string
    operationType: 'initial_submission' | 'correction'
    startedAt: Date
    finishedAt?: Date
  }) {
    const finishedAt = input.finishedAt ?? new Date()
    const durationMs = Math.max(0, finishedAt.getTime() - input.startedAt.getTime())

    const { error } = await supabase
      .from('document_generation_metrics')
      .insert([{
        ticket_id: input.ticketId,
        document_id: input.documentId,
        document_version_id: input.documentVersionId ?? null,
        actor_user_id: input.actorUserId,
        operation_type: input.operationType,
        started_at: input.startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
        exceeded_sla: durationMs > 15 * 60 * 1000,
      }])

    if (error) throw error
  }

  return {
    getLatestDocumentVersion,
    ensureBaselineDocumentVersion,
    createNextDocumentVersion,
    syncLatestDocumentVersionReview,
    recordDocumentGenerationMetric,
  }
}
