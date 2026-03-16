# Importacion automatica del padron TSE

Este proyecto ahora incluye un endpoint server para:

- descubrir el ZIP oficial del TSE,
- descargarlo,
- descomprimir `PADRON_COMPLETO.TXT` y `DISTELEC.TXT`,
- cargar datos en Supabase con `upsert`,
- actualizar registros existentes y evitar duplicados por `cedula`.

Este importador esta restringido al recurso oficial de `Padrón completo, incluye a todos los electores inscritos en la República`.

## Archivos agregados

- `server/api/admin/padron/import.post.ts`
- `server/api/admin/padron/import/[id].get.ts`
- `server/api/admin/padron/import/[id]/cancel.post.ts`
- `server/utils/padron-import.ts`
- `scripts/padron-import-cli.mjs`
- `docs/padron-import.sql`
- `docs/padron-import-commands.md`

## Guia rapida de operacion

Para comandos de uso diario, cancelacion, limpieza manual y consultas utiles, revisa [`padron-import-commands.md`](/home/gabriel/abogato-server/abogato-webapp/docs/padron-import-commands.md).

## Variables de entorno necesarias

```bash
NUXT_PUBLIC_SUPABASE_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
# Compatibilidad con este proyecto actual:
SUPABASE_KEY=...
PADRON_IMPORT_SECRET=...
PADRON_TSE_PAGE_URL=https://www.tse.go.cr/descarga_padron.html
# Opcional, para fijar un ZIP concreto:
PADRON_TSE_ZIP_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` sigue siendo el nombre recomendado, pero el importador tambien acepta `SUPABASE_KEY` como fallback para no romper configuraciones existentes.

## SQL en Supabase

Ejecuta primero el contenido de [`docs/padron-import.sql`](/home/gabriel/abogato-server/abogato-webapp/docs/padron-import.sql) en el SQL Editor de Supabase.

Si ya habias montado una version anterior del importador, vuelve a ejecutar ese SQL para agregar:

- `status = merging`
- `phase`
- `phase_progress`
- funciones RPC del merge por etapas

## Ejecutar manualmente

```bash
curl -X POST http://localhost:3000/api/admin/padron/import \
  -H "Content-Type: application/json" \
  -H "x-padron-import-secret: TU_SECRETO" \
  -d '{"force":false}'
```

La respuesta ahora devuelve un `importId` y el trabajo sigue en segundo plano.

## Ver estado

```bash
curl http://localhost:3000/api/admin/padron/import/TU_IMPORT_ID \
  -H "x-padron-import-secret: TU_SECRETO"
```

## Cancelacion segura

La cancelacion se hace sobre staging, asi que mientras no haya pasado la fase final de merge a tablas definitivas no se toca `padron_electores`.

```bash
curl -X POST http://localhost:3000/api/admin/padron/import/TU_IMPORT_ID/cancel \
  -H "x-padron-import-secret: TU_SECRETO"
```

## CLI con barra de progreso

```bash
PADRON_IMPORT_SECRET=TU_SECRETO npm run padron:import
```

Para forzar una nueva corrida:

```bash
PADRON_IMPORT_SECRET=TU_SECRETO npm run padron:import -- --force
```

Si presionas `Ctrl+C`, el CLI solicita cancelacion al servidor.

## Fase de merge visible

Cuando termina staging, la corrida pasa a `status = merging`. En ese punto el CLI muestra progreso por fases en vez de contar electores:

- `merging_districts`
- `merging_electors`
- `deactivating_removed`
- `cleaning_staging`
- `finalizing`

## Automatizacion

La forma mas simple es usar un cron externo que llame ese endpoint una vez al mes:

- GitHub Actions
- cron del servidor
- scheduler del proveedor donde desplegues Nuxt

## Como evita duplicados

- `padron_electores.cedula` es la llave primaria.
- Cada carga inserta primero en tablas staging.
- En la fase final se hace `upsert` sobre `cedula`.
- Si el registro ya existe, se actualiza.
- Si no existe, se inserta.
- Al cerrar la importacion, se guarda `total_rows` exacto en `padron_import_runs`.
- Los registros anteriores que ya no vengan en el padrón nuevo se marcan como `is_active = false`.

## Limitaciones importantes

- Este endpoint requiere despliegue con servidor Nitro. Si publicas con `nuxt generate` totalmente estatico, este endpoint no existira.
- La pagina actual del TSE reporta un padron completo grande. Esta version sigue haciendo la descompresion y parseo en memoria, asi que para volumenes mayores puede convenir moverlo a un worker o job dedicado.
- El parser asume el formato CSV documentado para `PADRON_COMPLETO.TXT` y `DISTELEC.TXT`. Si el TSE cambia el formato, habra que ajustar el parser.
