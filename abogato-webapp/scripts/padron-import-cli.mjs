const baseUrl = process.env.PADRON_IMPORT_BASE_URL ?? "http://localhost:3000";
const secret = process.env.PADRON_IMPORT_SECRET;
const force = process.argv.includes("--force");

if (!secret) {
  console.error("Falta PADRON_IMPORT_SECRET en el entorno del CLI.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "x-padron-import-secret": secret,
};

let importId = null;
let cancelled = false;

process.on("SIGINT", async () => {
  if (!importId || cancelled) {
    process.exit(1);
  }

  cancelled = true;
  process.stdout.write("\nSolicitando cancelacion...\n");

  try {
    await fetch(`${baseUrl}/api/admin/padron/import/${importId}/cancel`, {
      method: "POST",
      headers,
    });
  } catch (error) {
    console.error("No se pudo solicitar la cancelacion:", error);
  }
});

const startResponse = await fetch(`${baseUrl}/api/admin/padron/import`, {
  method: "POST",
  headers,
  body: JSON.stringify({ force }),
});

const startPayload = await startResponse.json();

if (!startResponse.ok) {
  console.error(JSON.stringify(startPayload, null, 2));
  process.exit(1);
}

importId = startPayload.importId;
process.stdout.write(`Importacion iniciada: ${importId}\n`);

while (true) {
  const statusResponse = await fetch(`${baseUrl}/api/admin/padron/import/${importId}`, {
    headers,
  });
  const statusPayload = await statusResponse.json();

  if (!statusResponse.ok) {
    console.error(`\nNo se pudo consultar el estado:\n${JSON.stringify(statusPayload, null, 2)}`);
    process.exit(1);
  }

  renderProgress(statusPayload);

  if (["completed", "failed", "cancelled", "skipped"].includes(statusPayload.status)) {
    process.stdout.write("\n");
    console.log(JSON.stringify(statusPayload, null, 2));
    process.exit(statusPayload.status === "completed" || statusPayload.status === "skipped" ? 0 : 1);
  }

  await sleep(1000);
}

function renderProgress(statusPayload) {
  const total = Number(statusPayload.total_rows ?? 0);
  const processed = Number(statusPayload.rows_processed ?? 0);
  const districtsProcessed = Number(statusPayload.district_rows_processed ?? 0);
  const isMerging = statusPayload.status === "merging";
  const percentage = isMerging
    ? Number(statusPayload.phase_progress ?? 0)
    : total > 0
      ? Math.min(100, Math.round((processed / total) * 100))
      : 0;
  const barWidth = 28;
  const filled = total > 0 ? Math.round((percentage / 100) * barWidth) : 0;
  const bar = `${"#".repeat(filled)}${"-".repeat(barWidth - filled)}`;
  const line = [
    `\r[${bar}]`,
    `${String(percentage).padStart(3, " ")}%`,
    `estado=${statusPayload.status}`,
    statusPayload.phase ? `fase=${statusPayload.phase}` : null,
    `electores=${processed}/${total || "?"}`,
    `distritos=${districtsProcessed}`,
  ].filter(Boolean).join(" ");

  process.stdout.write(line);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
