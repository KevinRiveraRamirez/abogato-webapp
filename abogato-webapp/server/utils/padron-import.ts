import { createHash } from "node:crypto";
import { unzipSync } from "fflate";

type RuntimeConfigLike = {
  padronTsePageUrl?: string;
  padronTseZipUrl?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
};

type QueuePadronImportOptions = {
  config: RuntimeConfigLike;
  force?: boolean;
};

type ImportRunRow = {
  id: string;
  status: string;
  phase: string | null;
  phase_progress: number | null;
  source_hash: string | null;
  total_rows: number;
  rows_processed: number;
  district_rows_processed: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  cancel_requested: boolean;
  source_url: string | null;
  snapshot_date: string | null;
};

type QueuePadronImportResult = {
  importId: string;
  status: "started";
  sourceUrl: string;
  snapshotDate: string;
  force: boolean;
};

type DistrictRow = {
  import_id: string;
  codigo_electoral: string;
  provincia_num: number;
  canton_num: number;
  distrito_num: number;
  provincia: string;
  canton: string;
  distrito: string;
  snapshot_date: string;
  source_hash: string;
};

type VoterRow = {
  import_id: string;
  cedula: string;
  codigo_electoral: string;
  sexo: number | null;
  fecha_vencimiento: string | null;
  junta_receptora: string | null;
  nombre: string;
  apellido_1: string;
  apellido_2: string | null;
  nombre_completo: string;
  provincia: string | null;
  canton: string | null;
  distrito: string | null;
  snapshot_date: string;
  source_hash: string;
  is_active: true;
};

type SourceInfo = {
  zipUrl: string;
  snapshotDate: string;
};

const PADRON_PAGE_URL = "https://www.tse.go.cr/descarga_padron.html";
const PADRON_ZIP_FALLBACK_URL = "https://www.tse.go.cr/zip/padron/padron_completo.zip";
const IMPORTS_TABLE = "padron_import_runs";
const DISTRICTS_TABLE = "padron_distritos";
const DISTRICTS_STAGING_TABLE = "padron_distritos_staging";
const VOTERS_TABLE = "padron_electores";
const VOTERS_STAGING_TABLE = "padron_electores_staging";
const MERGE_DISTRICTS_RPC = "padron_merge_distritos";
const MERGE_VOTERS_RPC = "padron_merge_electores";
const DEACTIVATE_REMOVED_RPC = "padron_deactivate_missing_electores";
const COUNT_DEACTIVATE_RPC = "padron_count_missing_electores";
const CLEAR_DISTRICTS_STAGING_RPC = "padron_clear_distritos_staging";
const CLEAR_VOTERS_STAGING_RPC = "padron_clear_electores_staging_batch";
const COMPLETE_IMPORT_RPC = "padron_complete_import";
const UPSERT_CHUNK_SIZE = 500;
const MERGE_ELECTORES_BATCH_SIZE = 5000;
const DEACTIVATE_BATCH_SIZE = 5000;
const MIN_RPC_BATCH_SIZE = 250;

const SPANISH_MONTHS: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  setiembre: "09",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

const runningJobs = getRunningJobsStore();

export async function queuePadronImport(options: QueuePadronImportOptions): Promise<QueuePadronImportResult> {
  const admin = createSupabaseAdmin(options.config);
  const activeRun = await admin.findActiveImport();

  if (activeRun) {
    throw new Error(`Ya existe una importación en curso (${activeRun.id}).`);
  }

  const source = await resolvePadronSource(options.config);
  const run = await admin.createImportRun({
    status: "preparing",
    phase: "preparing",
    phase_progress: 0,
    source_url: source.zipUrl,
    source_hash: "",
    snapshot_date: source.snapshotDate,
    total_rows: 0,
    rows_processed: 0,
    district_rows_processed: 0,
    cancel_requested: false,
  });

  const job = executePadronImport({
    config: options.config,
    force: Boolean(options.force),
    runId: run.id,
    source,
  }).finally(() => {
    runningJobs.delete(run.id);
  });

  runningJobs.set(run.id, job);

  return {
    importId: run.id,
    status: "started",
    sourceUrl: source.zipUrl,
    snapshotDate: source.snapshotDate,
    force: Boolean(options.force),
  };
}

export async function getPadronImportStatus(config: RuntimeConfigLike, importId: string) {
  const admin = createSupabaseAdmin(config);
  const row = await admin.getImport(importId);

  if (!row) {
    throw new Error(`No existe una importación con id ${importId}.`);
  }

  return row;
}

export async function requestPadronImportCancellation(config: RuntimeConfigLike, importId: string) {
  const admin = createSupabaseAdmin(config);
  const row = await admin.getImport(importId);

  if (!row) {
    throw new Error(`No existe una importación con id ${importId}.`);
  }

  if (!["preparing", "running", "merging"].includes(row.status)) {
    return {
      importId,
      status: row.status,
      message: "La importación ya no está en un estado cancelable.",
    };
  }

  await admin.requestCancel(importId);

  return {
    importId,
    status: "cancelling",
    message: "Se solicitó la cancelación. El importador se detendrá al cerrar el lote actual.",
  };
}

async function executePadronImport(options: {
  config: RuntimeConfigLike;
  force: boolean;
  runId: string;
  source: SourceInfo;
}) {
  const admin = createSupabaseAdmin(options.config);

  try {
    await admin.updateImportRun(options.runId, {
      status: "running",
      phase: "downloading_zip",
      phase_progress: 0,
    });

    const archiveBytes = await downloadBinary(options.source.zipUrl);
    const sourceHash = sha256Hex(archiveBytes);

    if (!options.force) {
      const existing = await admin.findCompletedImport(sourceHash);
      if (existing) {
        await admin.updateImportRun(options.runId, {
          status: "skipped",
          phase: "skipped",
          phase_progress: 100,
          source_hash: sourceHash,
          total_rows: existing.total_rows,
          rows_processed: existing.total_rows,
          district_rows_processed: existing.district_rows_processed,
          finished_at: new Date().toISOString(),
          error_message: "El archivo ya había sido importado previamente.",
        });
        return;
      }
    }

    const files = unzipSync(archiveBytes);
    const districtsFile = getRequiredEntry(files, "DISTELEC.TXT");
    const votersFile = getRequiredEntry(files, "PADRON_COMPLETO.TXT");

    if (!districtsFile || !votersFile) {
      throw new Error("El ZIP del TSE no corresponde al padrón completo esperado: debe incluir DISTELEC.TXT y PADRON_COMPLETO.TXT.");
    }

    const districtRows = parseDistricts(
      decodeText(districtsFile),
      options.runId,
      options.source.snapshotDate,
      sourceHash,
    );
    const districtMap = new Map(districtRows.map((row) => [row.codigo_electoral, row]));
    const voterRows = parseVoters(
      decodeText(votersFile),
      options.runId,
      districtMap,
      options.source.snapshotDate,
      sourceHash,
    );

    await admin.updateImportRun(options.runId, {
      source_hash: sourceHash,
      total_rows: voterRows.length,
      rows_processed: 0,
      district_rows_processed: 0,
      status: "running",
      phase: "loading_staging",
      phase_progress: 0,
    });

    for (let index = 0; index < districtRows.length; index += UPSERT_CHUNK_SIZE) {
      await assertNotCancelled(admin, options.runId);
      const chunk = districtRows.slice(index, index + UPSERT_CHUNK_SIZE);
      await admin.upsertRows(DISTRICTS_STAGING_TABLE, chunk, "import_id,codigo_electoral");
      await admin.updateImportRun(options.runId, {
        district_rows_processed: index + chunk.length,
      });
    }

    for (let index = 0; index < voterRows.length; index += UPSERT_CHUNK_SIZE) {
      await assertNotCancelled(admin, options.runId);
      const chunk = voterRows.slice(index, index + UPSERT_CHUNK_SIZE);
      await admin.upsertRows(VOTERS_STAGING_TABLE, chunk, "import_id,cedula");
      await admin.updateImportRun(options.runId, {
        rows_processed: index + chunk.length,
        phase_progress: Math.min(100, Math.round(((index + chunk.length) / voterRows.length) * 100)),
      });
    }

    await assertNotCancelled(admin, options.runId);

    await admin.updateImportRun(options.runId, {
      status: "merging",
      phase: "merging_districts",
      phase_progress: 20,
    });

    await admin.callRpc(MERGE_DISTRICTS_RPC, { p_import_id: options.runId });

    await admin.updateImportRun(options.runId, {
      status: "merging",
      phase: "merging_electors",
      phase_progress: 25,
    });

    let mergeCursor: string | null = null;
    let mergedElectores = 0;
    let mergeBatchSize = MERGE_ELECTORES_BATCH_SIZE;

    while (true) {
      await assertNotCancelled(admin, options.runId);
      const mergeCall = await callRpcBatchWithAdaptiveSize<Array<BatchResult>>({
        admin,
        rpcName: MERGE_VOTERS_RPC,
        batchSize: mergeBatchSize,
        minBatchSize: MIN_RPC_BATCH_SIZE,
        payloadFactory: (batchSize) => ({
          p_import_id: options.runId,
          p_after_cedula: mergeCursor,
          p_batch_size: batchSize,
        }),
        operationLabel: "merge de electores",
      });
      const mergeBatch = mergeCall.rows;
      mergeBatchSize = mergeCall.batchSize;

      const result = mergeBatch[0] ?? { processed_count: 0, last_cedula: null, done: true };
      mergedElectores += result.processed_count;
      mergeCursor = result.last_cedula;

      const mergeProgress = voterRows.length > 0
        ? 25 + Math.round((mergedElectores / voterRows.length) * 55)
        : 80;

      await admin.updateImportRun(options.runId, {
        status: "merging",
        phase: "merging_electors",
        phase_progress: Math.min(80, mergeProgress),
      });

      if (result.done) {
        break;
      }
    }

    await admin.updateImportRun(options.runId, {
      status: "merging",
      phase: "deactivating_removed",
      phase_progress: 82,
    });

    const deactivateCountRows = await admin.callRpc<Array<{ total_missing: number }>>(COUNT_DEACTIVATE_RPC, {
      p_source_hash: sourceHash,
    }).catch((error) => {
      if (isStatementTimeoutError(error)) {
        console.warn(
          `[padron-import] Supabase agotó el statement_timeout al contar electores faltantes para ${options.runId}. Se continuará sin porcentaje detallado de esta fase.`,
        );
        return [] as Array<{ total_missing: number }>;
      }

      throw error;
    });
    const totalMissing = deactivateCountRows[0]?.total_missing ?? 0;

    let deactivateCursor: string | null = null;
    let deactivatedCount = 0;
    let deactivateBatchSize = DEACTIVATE_BATCH_SIZE;

    while (true) {
      await assertNotCancelled(admin, options.runId);
      const deactivateCall = await callRpcBatchWithAdaptiveSize<Array<BatchResult>>({
        admin,
        rpcName: DEACTIVATE_REMOVED_RPC,
        batchSize: deactivateBatchSize,
        minBatchSize: MIN_RPC_BATCH_SIZE,
        payloadFactory: (batchSize) => ({
          p_source_hash: sourceHash,
          p_after_cedula: deactivateCursor,
          p_batch_size: batchSize,
        }),
        operationLabel: "desactivación de electores faltantes",
      });
      const deactivateBatch = deactivateCall.rows;
      deactivateBatchSize = deactivateCall.batchSize;

      const result = deactivateBatch[0] ?? { processed_count: 0, last_cedula: null, done: true };
      deactivatedCount += result.processed_count;
      deactivateCursor = result.last_cedula;

      const deactivateProgress = totalMissing > 0
        ? 82 + Math.round((deactivatedCount / totalMissing) * 13)
        : 95;

      await admin.updateImportRun(options.runId, {
        status: "merging",
        phase: "deactivating_removed",
        phase_progress: Math.min(95, deactivateProgress),
      });

      if (result.done) {
        break;
      }
    }

    await admin.updateImportRun(options.runId, {
      status: "merging",
      phase: "cleaning_staging",
      phase_progress: 92,
    });

    await clearStagingBatches(admin, options.runId, voterRows.length, async (phaseProgress) => {
      await admin.updateImportRun(options.runId, {
        status: "merging",
        phase: "cleaning_staging",
        phase_progress: phaseProgress,
      });
    });

    await admin.updateImportRun(options.runId, {
      status: "merging",
      phase: "finalizing",
      phase_progress: 97,
    });

    await admin.completeImport({
      importId: options.runId,
      sourceHash,
      snapshotDate: options.source.snapshotDate,
      votersProcessed: voterRows.length,
      districtsProcessed: districtRows.length,
      totalRows: voterRows.length,
      phase: "completed",
      phaseProgress: 100,
    });
  } catch (error) {
    if (error instanceof ImportCancelledError) {
      await safeCleanup(admin, options.runId);
      await admin.updateImportRun(options.runId, {
        status: "cancelled",
        phase: "cancelled",
        phase_progress: 100,
        finished_at: new Date().toISOString(),
        error_message: "Importación cancelada por el usuario.",
      });
      return;
    }

    await safeCleanup(admin, options.runId);
    await admin.updateImportRun(options.runId, {
      status: "failed",
      phase: "failed",
      phase_progress: 100,
      finished_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

async function assertNotCancelled(admin: ReturnType<typeof createSupabaseAdmin>, importId: string) {
  const row = await admin.getImport(importId);
  if (row?.cancel_requested) {
    throw new ImportCancelledError();
  }
}

async function safeCleanup(admin: ReturnType<typeof createSupabaseAdmin>, importId: string) {
  try {
    const row = await admin.getImport(importId);
    await clearStagingBatches(admin, importId, row?.total_rows ?? 0);
  } catch (cleanupError) {
    console.error("No se pudo limpiar staging para la corrida", importId, cleanupError);
  }
}

async function clearStagingBatches(
  admin: ReturnType<typeof createSupabaseAdmin>,
  importId: string,
  totalRows: number,
  onProgress?: (phaseProgress: number) => Promise<void>,
) {
  let clearCursor: string | null = null;
  let clearedRows = 0;
  let clearBatchSize = DEACTIVATE_BATCH_SIZE;

  while (true) {
    const clearCall = await callRpcBatchWithAdaptiveSize<Array<BatchResult>>({
      admin,
      rpcName: CLEAR_VOTERS_STAGING_RPC,
      batchSize: clearBatchSize,
      minBatchSize: MIN_RPC_BATCH_SIZE,
      payloadFactory: (batchSize) => ({
        p_import_id: importId,
        p_after_cedula: clearCursor,
        p_batch_size: batchSize,
      }),
      operationLabel: "limpieza de staging",
    });
    const batch = clearCall.rows;
    clearBatchSize = clearCall.batchSize;

    const result = batch[0] ?? { processed_count: 0, last_cedula: null, done: true };
    clearedRows += result.processed_count;
    clearCursor = result.last_cedula;

    if (onProgress && totalRows > 0) {
      const progress = 92 + Math.round((clearedRows / totalRows) * 5);
      await onProgress(Math.min(97, progress));
    }

    if (result.done) {
      break;
    }
  }

  await admin.callRpc(CLEAR_DISTRICTS_STAGING_RPC, { p_import_id: importId });
}

async function resolvePadronSource(config: RuntimeConfigLike): Promise<SourceInfo> {
  const explicitZipUrl = config.padronTseZipUrl?.trim();
  const pageUrl = config.padronTsePageUrl?.trim() || PADRON_PAGE_URL;

  if (explicitZipUrl) {
    return {
      zipUrl: explicitZipUrl,
      snapshotDate: new Date().toISOString().slice(0, 10),
    };
  }

  const response = await fetch(pageUrl);
  if (!response.ok) {
    throw new Error(`No se pudo consultar la página del TSE (${response.status}).`);
  }

  const html = await response.text();
  const zipUrl = extractZipUrl(html, pageUrl) || PADRON_ZIP_FALLBACK_URL;
  const snapshotDate = extractSnapshotDate(html) || new Date().toISOString().slice(0, 10);

  return { zipUrl, snapshotDate };
}

function extractZipUrl(html: string, pageUrl: string) {
  const match = html.match(/href=["']([^"']*padron[^"']*\.zip)["']/i);
  if (!match?.[1]) return null;
  return new URL(match[1], pageUrl).toString();
}

function extractSnapshotDate(html: string) {
  const match = html.match(/actualizado al\s+(\d{1,2}\s+de\s+[a-záéíóúü]+(?:iembre)?\s+\d{4})/i);
  if (!match?.[1]) return null;

  const normalized = match[1]
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const parts = normalized.split(/\s+de\s+/);
  if (parts.length !== 3) return null;

  const [day, monthName, year] = parts;
  const month = SPANISH_MONTHS[monthName];
  if (!month) return null;

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

async function downloadBinary(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el ZIP del padrón (${response.status}).`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function getArchiveEntry(files: Record<string, Uint8Array>, fileName: string) {
  const target = fileName.toUpperCase();
  const entryName = Object.keys(files).find((key) => key.toUpperCase().endsWith(target));
  return entryName ? files[entryName] : null;
}

function getRequiredEntry(files: Record<string, Uint8Array>, fileName: string) {
  return getArchiveEntry(files, fileName);
}

function decodeText(bytes: Uint8Array) {
  for (const encoding of ["iso-8859-15", "latin1", "windows-1252"]) {
    try {
      return new TextDecoder(encoding).decode(bytes);
    } catch {
      continue;
    }
  }

  return new TextDecoder().decode(bytes);
}

function parseDistricts(text: string, importId: string, snapshotDate: string, sourceHash: string) {
  const rows: DistrictRow[] = [];
  const lines = splitLines(text);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [codigo, provincia, canton, distrito] = splitCsvColumns(trimmed);
    if (!codigo) continue;

    const codigoLimpio = codigo.trim();
    const provinciaNum = Number(codigoLimpio.slice(0, 1));
    const cantonNum = Number(codigoLimpio.slice(1, 3));
    const distritoNum = Number(codigoLimpio.slice(3, 6));

    rows.push({
      import_id: importId,
      codigo_electoral: codigoLimpio,
      provincia_num: toNumberOrZero(String(provinciaNum)),
      canton_num: toNumberOrZero(String(cantonNum)),
      distrito_num: toNumberOrZero(String(distritoNum)),
      provincia: provincia?.trim() ?? "",
      canton: canton?.trim() ?? "",
      distrito: distrito?.trim() ?? "",
      snapshot_date: snapshotDate,
      source_hash: sourceHash,
    });
  }

  return dedupeBy(rows, (row) => row.codigo_electoral);
}

function parseVoters(
  text: string,
  importId: string,
  districtMap: Map<string, DistrictRow>,
  snapshotDate: string,
  sourceHash: string,
) {
  const rows: VoterRow[] = [];
  const lines = splitLines(text);

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed) continue;

    const [cedula, codigoElectoral, sexo, fechaVencimiento, junta, nombre, apellido1, apellido2] =
      splitCsvColumns(trimmed);

    if (!cedula) continue;

    const codigoElectoralLimpio = codigoElectoral?.trim() ?? "";
    const district = districtMap.get(codigoElectoralLimpio);
    const cleanNombre = normalizeRequiredPadronText(nombre);
    const cleanApellido1 = normalizeRequiredPadronText(apellido1);
    const cleanApellido2 = normalizePadronText(apellido2);

    rows.push({
      import_id: importId,
      cedula: cedula.trim(),
      codigo_electoral: codigoElectoralLimpio,
      sexo: sexo?.trim() ? Number(sexo) : null,
      fecha_vencimiento: parsePadronDate(fechaVencimiento),
      junta_receptora: junta?.trim() || null,
      nombre: cleanNombre,
      apellido_1: cleanApellido1,
      apellido_2: cleanApellido2,
      nombre_completo: [cleanNombre, cleanApellido1, cleanApellido2].filter(Boolean).join(" ").trim(),
      provincia: district?.provincia ?? null,
      canton: district?.canton ?? null,
      distrito: district?.distrito ?? null,
      snapshot_date: snapshotDate,
      source_hash: sourceHash,
      is_active: true,
    });
  }

  return dedupeBy(rows, (row) => row.cedula);
}

function splitLines(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function splitCsvColumns(line: string) {
  return line.split(",").map((value) => value.trim());
}

function normalizePadronText(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredPadronText(value?: string | null) {
  return normalizePadronText(value) ?? "";
}

function parsePadronDate(value?: string | null) {
  const text = value?.trim();
  if (!text) return null;

  const compactMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    return `${year}-${month}-${day}`;
  }

  const slashMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!slashMatch) return null;

  const [, day, month, year] = slashMatch;
  return `${year}-${month}-${day}`;
}

function toNumberOrZero(value?: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dedupeBy<T>(rows: T[], getKey: (row: T) => string) {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(getKey(row), row);
  }
  return [...map.values()];
}

function createSupabaseAdmin(config: RuntimeConfigLike) {
  const supabaseUrl = config.supabaseUrl?.trim();
  const serviceRoleKey = config.supabaseServiceRoleKey?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para ejecutar la importación del padrón.");
  }

  const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  async function request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase respondió ${response.status}: ${text}`);
    }

    const body = await response.text();
    return (body ? JSON.parse(body) : null) as T;
  }

  async function requestRpc<T>(fnName: string, payload: Record<string, unknown>) {
    const response = await fetch(`${baseUrl}/rpc/${fnName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase respondió ${response.status}: ${text}`);
    }

    const body = await response.text();
    return (body ? JSON.parse(body) : null) as T;
  }

  return {
    async findActiveImport() {
      const params = new URLSearchParams({
        select: "id,status",
        status: "in.(preparing,running,merging)",
        order: "started_at.desc",
        limit: "1",
      });

      const rows = await request<Array<{ id: string; status: string }>>(`/${IMPORTS_TABLE}?${params.toString()}`);
      return rows[0] ?? null;
    },

    async findCompletedImport(sourceHash: string) {
      const params = new URLSearchParams({
        select: "id,total_rows,district_rows_processed",
        source_hash: `eq.${sourceHash}`,
        status: "eq.completed",
        limit: "1",
      });

      const rows = await request<Array<{ id: string; total_rows: number; district_rows_processed: number }>>(
        `/${IMPORTS_TABLE}?${params.toString()}`,
      );
      return rows[0] ?? null;
    },

    async createImportRun(payload: Record<string, unknown>) {
      const rows = await request<ImportRunRow[]>(`/${IMPORTS_TABLE}`, {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (!rows[0]?.id) {
        throw new Error("No se pudo crear el registro de importación.");
      }

      return rows[0];
    },

    async getImport(importId: string) {
      const params = new URLSearchParams({
        select: "id,status,phase,phase_progress,source_hash,total_rows,rows_processed,district_rows_processed,started_at,finished_at,error_message,cancel_requested,source_url,snapshot_date",
        id: `eq.${importId}`,
        limit: "1",
      });

      const rows = await request<ImportRunRow[]>(`/${IMPORTS_TABLE}?${params.toString()}`);
      return rows[0] ?? null;
    },

    async updateImportRun(importId: string, payload: Record<string, unknown>) {
      const params = new URLSearchParams({
        id: `eq.${importId}`,
      });

      await request(`/${IMPORTS_TABLE}?${params.toString()}`, {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
    },

    async requestCancel(importId: string) {
      await this.updateImportRun(importId, {
        cancel_requested: true,
        cancel_requested_at: new Date().toISOString(),
      });
    },

    async upsertRows(table: string, rows: unknown[], conflictColumn: string) {
      if (rows.length === 0) return;

      await request(`/${table}?on_conflict=${encodeURIComponent(conflictColumn)}`, {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(rows),
      });
    },

    async callRpc<T>(name: string, payload: Record<string, unknown>) {
      return await requestRpc<T>(name, payload);
    },

    async completeImport(payload: {
      importId: string;
      sourceHash: string;
      snapshotDate: string;
      votersProcessed: number;
      districtsProcessed: number;
      totalRows: number;
      phase: string;
      phaseProgress: number;
    }) {
      await requestRpc(COMPLETE_IMPORT_RPC, {
        p_import_id: payload.importId,
        p_source_hash: payload.sourceHash,
        p_snapshot_date: payload.snapshotDate,
        p_rows_processed: payload.votersProcessed,
        p_district_rows_processed: payload.districtsProcessed,
        p_total_rows: payload.totalRows,
        p_phase: payload.phase,
        p_phase_progress: payload.phaseProgress,
      });
    },
  };
}

function getRunningJobsStore() {
  const globalKey = "__padronImportJobs";
  const globalScope = globalThis as typeof globalThis & {
    [globalKey]?: Map<string, Promise<void>>;
  };

  if (!globalScope[globalKey]) {
    globalScope[globalKey] = new Map<string, Promise<void>>();
  }

  return globalScope[globalKey];
}

class ImportCancelledError extends Error {
  constructor() {
    super("Importación cancelada");
  }
}

async function callRpcBatchWithAdaptiveSize<T>(
  options: {
    admin: ReturnType<typeof createSupabaseAdmin>;
    rpcName: string;
    batchSize: number;
    minBatchSize: number;
    payloadFactory: (batchSize: number) => Record<string, unknown>;
    operationLabel: string;
  },
) {
  let batchSize = options.batchSize;

  while (true) {
    try {
      const rows = await options.admin.callRpc<T>(options.rpcName, options.payloadFactory(batchSize));
      return { rows, batchSize };
    } catch (error) {
      if (!isStatementTimeoutError(error) || batchSize <= options.minBatchSize) {
        throw error;
      }

      const nextBatchSize = Math.max(options.minBatchSize, Math.floor(batchSize / 2));
      console.warn(
        `[padron-import] Supabase agotó el statement_timeout durante ${options.operationLabel}. Reintentando con lote ${nextBatchSize} (antes ${batchSize}).`,
      );
      batchSize = nextBatchSize;
    }
  }
}

function isStatementTimeoutError(error: unknown) {
  return error instanceof Error
    && error.message.includes("\"code\":\"57014\"")
    && /statement timeout/i.test(error.message);
}

type BatchResult = {
  processed_count: number;
  last_cedula: string | null;
  done: boolean;
};
