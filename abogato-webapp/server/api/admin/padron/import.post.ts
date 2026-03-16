import { queuePadronImport } from "~~/server/utils/padron-import";

type ImportRequestBody = {
  force?: boolean;
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const secret = getHeader(event, "x-padron-import-secret");

  if (!config.padronImportSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Falta configurar PADRON_IMPORT_SECRET.",
    });
  }

  if (secret !== config.padronImportSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: "No autorizado para ejecutar la importación del padrón.",
    });
  }

  const body = await readBody<ImportRequestBody>(event).catch(() => ({}));

  try {
    return await queuePadronImport({
      config,
      force: Boolean(body.force),
    });
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : "No se pudo importar el padrón.",
    });
  }
});
