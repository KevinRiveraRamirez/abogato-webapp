import { requestPadronImportCancellation } from "~~/server/utils/padron-import";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const secret = getHeader(event, "x-padron-import-secret");
  const importId = getRouterParam(event, "id");

  if (!config.padronImportSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Config error",
      message: "Falta configurar PADRON_IMPORT_SECRET.",
    });
  }

  if (secret !== config.padronImportSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "No autorizado para cancelar la importación del padrón.",
    });
  }

  if (!importId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad request",
      message: "Falta el identificador de importación.",
    });
  }

  try {
    return await requestPadronImportCancellation(config, importId);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Padron cancel failed",
      message: error instanceof Error ? error.message : "No se pudo cancelar la importación.",
    });
  }
});
