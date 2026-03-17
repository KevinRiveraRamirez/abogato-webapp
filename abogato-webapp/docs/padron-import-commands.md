# Comandos utiles del importador de padron

Esta guia resume los comandos operativos del importador del `Padrón completo, incluye a todos los electores inscritos en la República`.

## Antes de empezar

Debes tener en tu entorno:

```bash
PADRON_IMPORT_SECRET=...
SUPABASE_URL=...
SUPABASE_KEY=...
```

Tambien debes haber ejecutado el SQL de [`padron-import.sql`](/home/gabriel/abogato-server/abogato-webapp/docs/padron-import.sql) en Supabase.

## Levantar la app

```bash
npm run dev
```

## Iniciar importacion normal desde CLI

```bash
PADRON_IMPORT_SECRET=Clave_secreta npm run padron:import
```

Esto:

- crea una corrida nueva,
- descarga el ZIP oficial del TSE,
- muestra progreso en consola,
- y termina cuando la importacion queda `completed`, `failed`, `cancelled` o `skipped`.

## Iniciar importacion forzada

```bash
PADRON_IMPORT_SECRET=TU_SECRETO npm run padron:import -- --force
```

Usa `--force` cuando quieres reprocesar el mismo ZIP aunque ya exista una importacion completada con el mismo `source_hash`.

## Iniciar importacion por API

```bash
curl -X POST http://localhost:3000/api/admin/padron/import \
  -H "Content-Type: application/json" \
  -H "x-padron-import-secret: TU_SECRETO" \
  -d '{"force":false}'
```

## Iniciar importacion forzada por API

```bash
curl -X POST http://localhost:3000/api/admin/padron/import \
  -H "Content-Type: application/json" \
  -H "x-padron-import-secret: TU_SECRETO" \
  -d '{"force":true}'
```

## Consultar estado de una importacion

```bash
curl http://localhost:3000/api/admin/padron/import/TU_IMPORT_ID \
  -H "x-padron-import-secret: TU_SECRETO"
```

Campos utiles:

- `status`
- `total_rows`
- `rows_processed`
- `district_rows_processed`
- `error_message`
- `cancel_requested`
- `started_at`
- `finished_at`

## Cancelacion normal por API

```bash
curl -X POST http://localhost:3000/api/admin/padron/import/TU_IMPORT_ID/cancel \
  -H "x-padron-import-secret: TU_SECRETO"
```

Esto no mata el proceso de golpe. Lo que hace es:

- marcar `cancel_requested = true`
- dejar que el worker termine el lote actual
- detenerse de forma segura
- limpiar staging
- marcar la corrida como `cancelled`

## Cancelacion desde CLI

Si estas corriendo:

```bash
PADRON_IMPORT_SECRET=TU_SECRETO npm run padron:import
```

puedes presionar `Ctrl+C`.

El CLI:

- no cancela solo la terminal,
- envia una solicitud de cancelacion al servidor,
- y el servidor intenta cerrar la corrida de forma segura.

## Consultar ultimas corridas desde Supabase

```sql
select
  id,
  status,
  total_rows,
  rows_processed,
  district_rows_processed,
  cancel_requested,
  started_at,
  finished_at,
  error_message
from public.padron_import_runs
order by started_at desc;
```

## Cancelar manualmente una corrida atascada

Usa esto solo si una corrida quedo pegada en `running` o `preparing` y ya no existe el proceso que la atienda.

```sql
update public.padron_import_runs
set
  status = 'cancelled',
  cancel_requested = true,
  finished_at = now(),
  error_message = 'Cancelada manualmente por corrida atascada'
where id = 'TU_IMPORT_ID'
  and status in ('preparing', 'running');
```

## Limpiar staging manualmente de una corrida atascada

```sql
delete from public.padron_electores_staging
where import_id = 'TU_IMPORT_ID';

delete from public.padron_distritos_staging
where import_id = 'TU_IMPORT_ID';
```

## Ver cuantos electores trae la corrida

Cuando una corrida termina bien, el total exacto del ZIP queda guardado en `padron_import_runs.total_rows`.

```sql
select id, status, total_rows, rows_processed, finished_at
from public.padron_import_runs
order by started_at desc
limit 10;
```

## Ver el ultimo padron cargado

```sql
select count(*) as electores_activos
from public.padron_electores
where is_active = true;
```

## Verificar si hay una importacion corriendo

```sql
select id, status, cancel_requested, started_at
from public.padron_import_runs
where status in ('preparing', 'running', 'merging')
order by started_at desc;
```

## Cosas a tener en cuenta

- No puedes iniciar una nueva corrida si ya hay una en `preparing` o `running`.
- `--force` no descarga un archivo distinto; solo obliga a reprocesar el mismo ZIP aunque ya exista una corrida completada con ese hash.
- La cancelacion segura funciona bien mientras el worker siga vivo.
- Si se cae el servidor durante una corrida, puede quedar una corrida zombie y hay que cerrarla manualmente.
- La tabla final `padron_electores` no deberia quedar parcialmente actualizada si cancelas antes del merge final, porque el proceso usa staging.
- Si cambiaste el SQL o el parser, normalmente conviene correr una importacion con `--force`.
- La fase de merge ahora se ejecuta por lotes, no en una sola consulta gigante.
- Los lotes actuales de merge y desactivacion son conservadores para reducir timeouts.
- Si actualizaste desde una version anterior del importador, debes volver a ejecutar [`padron-import.sql`](/home/gabriel/abogato-server/abogato-webapp/docs/padron-import.sql).



update public.padron_import_runs
set
  status = 'cancelled',
  phase = 'cancelled',
  phase_progress = 100,
  cancel_requested = true,
  finished_at = now(),
  error_message = 'Cancelada manualmente antes de reiniciar con merge batch'
where id = 'fac433d1-cfa0-4f03-88ba-edd5785ab5a8'
  and status in ('preparing', 'running', 'merging');


delete from public.padron_electores_staging
where import_id = 'fac433d1-cfa0-4f03-88ba-edd5785ab5a8';

delete from public.padron_distritos_staging
where import_id = 'fac433d1-cfa0-4f03-88ba-edd5785ab5a8';


select id, status, phase, cancel_requested, started_at
from public.padron_import_runs
where status in ('preparing', 'running', 'merging')
order by started_at desc;
