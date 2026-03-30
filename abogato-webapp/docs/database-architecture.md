# Base de Datos: Estado Actual, Snapshot Real y Criterio de Mejora

## Propósito

Este documento resume cómo está armada hoy la base de datos del proyecto según:

- el código del repo
- los SQL locales del proyecto
- el snapshot real de Supabase compartido el 29 de marzo de 2026

La idea no es solo listar tablas. También deja claro:

- qué modelo existe hoy
- qué partes están bien resueltas
- qué partes son frágiles
- qué riesgos deberíamos cerrar antes de hacer cambios estructurales grandes

## Fuentes usadas

### Fuentes locales

- Tipos generados: [app/types/database.types.ts](/home/gabriel/abogato-server/abogato-webapp/app/types/database.types.ts)
- SQL y documentos del repo:
  - [docs/notifications.sql](/home/gabriel/abogato-server/abogato-webapp/docs/notifications.sql)
  - [docs/document-workflow-and-ops.sql](/home/gabriel/abogato-server/abogato-webapp/docs/document-workflow-and-ops.sql)
  - [docs/user-governance-and-auto-assignment.sql](/home/gabriel/abogato-server/abogato-webapp/docs/user-governance-and-auto-assignment.sql)
  - [docs/profile-personal-info.sql](/home/gabriel/abogato-server/abogato-webapp/docs/profile-personal-info.sql)
  - [docs/user-account-status.sql](/home/gabriel/abogato-server/abogato-webapp/docs/user-account-status.sql)
  - [docs/document-rejection-reason.sql](/home/gabriel/abogato-server/abogato-webapp/docs/document-rejection-reason.sql)
  - [docs/document-correction-policy-fix.sql](/home/gabriel/abogato-server/abogato-webapp/docs/document-correction-policy-fix.sql)

### Fuente real

- Snapshot obtenido con [docs/database-introspection.sql](/home/gabriel/abogato-server/abogato-webapp/docs/database-introspection.sql)

## Veredicto corto

La base no está mal diseñada a nivel de negocio. El núcleo principal ya tiene buena forma:

- `tickets`
- `documents`
- `document_versions`
- `notifications`
- `profile_audit_logs`
- `ticket_assignment_history`

El problema principal hoy no es el modelo. Es la capa de seguridad y consistencia:

- `RLS` inconsistente
- policies duplicadas o demasiado abiertas
- grants amplios en tablas sensibles
- lógica crítica repartida entre frontend, policies y triggers

## Estado general

- Modelo de negocio: bueno
- Versionado documental: bueno
- Auditoría y notificaciones: buenas bases
- Seguridad/RLS: débil
- Grants/permisos: demasiado abiertos
- Índices y performance: aceptables hoy, incompletos para crecer

## Modelo actual, a alto nivel

### 1. Identidad y perfiles

- `auth.users`
  - fuente de autenticación de Supabase
- `public.profiles`
  - perfil operativo real de la app
  - guarda rol, datos de contacto, estado de cuenta, disponibilidad del abogado y cédula profesional
- `public.roles`
  - catálogo complementario/legacy
  - hoy la fuente operativa real de permisos es `profiles.role`

Campos relevantes confirmados en `profiles`:

- `user_id`
- `role`
- `display_name`
- `contact_email`
- `contact_phone`
- `personal_address`
- `office_address`
- `is_active`
- `professional_license_number`
- `professional_license_expires_at`
- `availability_status`

### 2. Tickets

- `public.tickets`
  - unidad principal del negocio
  - une cliente, abogado responsable y estado del trámite

Campos relevantes confirmados:

- `created_by`
- `assigned_to`
- `title`
- `description`
- `status`
- `priority`
- `reopen_requested`

### 3. Documento legal actual

- `public.documents`
  - representa el documento vigente de un ticket
  - guarda el estado actual, no el historial completo

Campos relevantes confirmados:

- `ticket_id`
- `template_id`
- `field_values`
- `status`
- `generated_url`
- `reviewed_by`
- `review_notes`
- `rejection_reason`
- `created_by`

### 4. Historial documental

- `public.document_versions`
  - historial de versiones del documento
  - snapshot por versión

Campos relevantes confirmados:

- `document_id`
- `ticket_id`
- `template_id`
- `version_number`
- `status`
- `source`
- `field_values`
- `rendered_content`
- `rejection_reason`
- `created_by`
- `reviewed_by`

Valores confirmados por constraint:

- `status`: `draft`, `submitted`, `approved`, `rejected`
- `source`: `initial`, `correction`, `manual`

### 5. Plantillas legales

- `public.document_templates`
  - catálogo de plantillas
  - vinculado con `servicios`

Campos relevantes:

- `servicio_id`
- `title`
- `content`
- `fields`
- `created_by`
- `activo`

### 6. Comentarios y archivos del ticket

- `public.ticket_comments`
  - comentarios del caso
- `public.ticket_files`
  - adjuntos del ticket con metadatos
- `public.vehicle_transfer_documents`
  - tabla especializada del flujo de traspaso vehicular

### 7. Historial operativo

- `public.ticket_historial`
  - bitácora de cambios de estado
- `public.ticket_assignment_history`
  - historial de asignaciones/reasignaciones
- `public.profile_audit_logs`
  - auditoría de cambios de perfil

### 8. Notificaciones

- `public.notifications`
- `public.notification_preferences`
- `public.ticket_notification_mutes`

### 9. Métricas y alertas operativas

- `public.document_generation_metrics`
- `public.system_lookup_failures`

### 10. Padrones y catálogos

- `public.padron_electores`
- `public.padron_distritos`
- `public.padron_electores_staging`
- `public.padron_distritos_staging`
- `public.padron_import_runs`
- `public.servicios`
- `public.instruments`

## Snapshot real confirmado en Supabase

### Extensiones activas

- `pg_graphql`
- `pg_stat_statements`
- `pgcrypto`
- `plpgsql`
- `supabase_vault`
- `uuid-ossp`

### Tablas reales confirmadas en `public`

- `document_generation_metrics`
- `document_templates`
- `document_versions`
- `documents`
- `instruments`
- `notification_preferences`
- `notifications`
- `padron_distritos`
- `padron_distritos_staging`
- `padron_electores`
- `padron_electores_staging`
- `padron_import_runs`
- `profile_audit_logs`
- `profiles`
- `roles`
- `servicios`
- `system_lookup_failures`
- `ticket_assignment_history`
- `ticket_comments`
- `ticket_files`
- `ticket_historial`
- `ticket_notification_mutes`
- `tickets`
- `vehicle_transfer_documents`

### Volumen actual observado

- `padron_electores_staging`: ~`1707 MB`, ~`4.9M` filas estimadas
- `padron_electores`: ~`939 MB`, ~`2.3M` filas estimadas
- `tickets`: ~`96 kB`, ~`9` filas estimadas
- `notifications`: ~`176 kB`, ~`25` filas estimadas
- `documents`: ~`32 kB`, ~`7` filas estimadas

Conclusión: el padrón ya es un subsistema pesado. El dominio principal todavía está chico.

## Cómo funciona hoy el flujo documental

### Crear ticket

1. Se crea `tickets`
2. Se crea `documents`
3. Se crea `document_versions` con `source = 'initial'`
4. Se registra `document_generation_metrics`
5. Si aplica, se crean `ticket_files`
6. Antes del insert del ticket corre autoasignación
7. Después del insert corren notificaciones y historial de asignación

Código:

- [app/pages/tickets/nuevo.vue](/home/gabriel/abogato-server/abogato-webapp/app/pages/tickets/nuevo.vue)
- [app/composables/useDocumentWorkflow.ts](/home/gabriel/abogato-server/abogato-webapp/app/composables/useDocumentWorkflow.ts)

### Rechazar documento

1. El abogado actualiza `documents.status = 'rejected'`
2. Se guarda `rejection_reason`
3. Se guarda `reviewed_by`
4. El trigger sincroniza esos campos en la última `document_version`
5. El trigger de notificaciones genera aviso al cliente

Importante: el trigger no cambia `field_values`.

### Corregir documento

1. El cliente debe actualizar `documents.field_values`
2. El cliente cambia `documents.status` a `submitted`
3. Se limpia `rejection_reason`
4. Se crea una nueva fila en `document_versions` con `source = 'correction'`
5. Si el ticket ya tenía abogado asignado, el ticket vuelve a `in_progress`

Importante: la corrección depende de dos operaciones distintas:

- `UPDATE` sobre `documents`
- `INSERT` sobre `document_versions`

Por eso esta ruta es sensible a inconsistencias de policy.

## Triggers y automatizaciones confirmadas

### Tickets

- `tickets_before_insert_auto_assign`
- `notifications_after_ticket_insert`
- `notifications_after_ticket_insert_unassigned`
- `notifications_after_ticket_update`
- `ticket_assignment_history_after_insert`
- `ticket_assignment_history_after_update`
- `trg_tickets_updated_at`

### Documentos

- `document_versions_after_document_update`
- `notifications_after_document_update`
- `document_versions_before_update_timestamp`

### Perfil y operación

- `profile_audit_logs_after_profile_update`
- `document_generation_metrics_after_insert_alert`
- `system_lookup_failures_after_insert_alert`
- `notifications_after_ticket_comment_insert`
- `notifications_after_ticket_file_insert`

## Hallazgos del snapshot real

### 1. El modelo de negocio está bien encaminado

Quedó confirmado que:

- el versionado documental existe de verdad
- hay constraint único `(document_id, version_number)` en `document_versions`
- las notificaciones tienen buena base de índices
- la disponibilidad del abogado ya está en la base
- existe autoasignación real en SQL
- existe historial de asignación real en SQL
- existe auditoría de perfil real en SQL
- ya hay alertas por SLA y por fallos de lookup

Esto es una buena señal: la base ya está pensando en operación real, no solo CRUD.

### 2. El mayor problema real es seguridad y exposición

Este es el hallazgo más importante de todo el snapshot.

#### Tablas con `RLS` desactivado

En producción hoy `RLS` está desactivado en:

- `ticket_comments`
- `vehicle_transfer_documents`
- `padron_distritos`
- `padron_distritos_staging`
- `padron_electores`
- `padron_electores_staging`
- `padron_import_runs`

#### Grants amplios

Muchas tablas tienen grants amplios para:

- `anon`
- `authenticated`

Incluyen `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

En tablas con `RLS` apagado, eso es exposición real.

Las más delicadas:

- `ticket_comments`
- `vehicle_transfer_documents`
- todo el bloque `padron_*`
- `padron_import_runs`

Mi lectura directa: hoy el riesgo principal del proyecto no es funcional, es de seguridad de datos.

### 3. Hay policies peligrosas o demasiado abiertas

#### `tickets`

Existe una policy:

- `Lectura publica de tickets propios`

Con:

- `cmd = SELECT`
- `roles = {public}`
- `qual = true`

Eso, combinado con `RLS`, equivale en la práctica a abrir lectura completa de tickets para `public`.

También hay duplicidad clara:

- `Cliente ve sus tickets`
- `read tickets`
- `ver tickets`
- `Lectura publica de tickets propios`

Y algo similar pasa con:

- `crear tickets`
- `create tickets`
- `actualizar tickets`
- `update tickets`

#### `profiles`

Existe:

- `ver profiles`

Con:

- `cmd = SELECT`
- `roles = {authenticated}`
- `qual = true`

Eso significa que cualquier autenticado puede leer todos los perfiles.

Para una app legal, esto es demasiado abierto.

#### `ticket_historial`

Hay policies duplicadas:

- `Usuarios autenticados pueden ver historial`
- `ver historial`
- `Usuarios autenticados pueden insertar historial`
- `insertar historial`

Algunas tienen `true` total en `qual` o `with_check`.

#### `ticket_comments`

Además de tener `RLS` apagado, su lectura hoy es abierta con:

- `ver comentarios`
- `qual = true`

### 4. `superadmin` todavía no está aplicado de forma consistente

Aunque parte del diseño nuevo ya contempla `superadmin`, en la base viva todavía hay huecos:

- `document_templates`
  - `Solo admin puede gestionar plantillas`
  - contempla `admin`, no `superadmin`
- `profiles`
  - `actualizar profiles`
  - contempla `admin`, no `superadmin`

En cambio, otras funciones sí usan:

- `admin`
- `superadmin`

Conclusión: el rol existe, pero no está homogenizado.

### 5. Storage también está demasiado abierto

En `storage.objects` hay policies para:

- `ticket-adjuntos`
- `archivo-ticket`

Pero están acotadas por bucket, no por ownership del ticket.

Eso implica que cualquier usuario autenticado podría llegar a:

- ver archivos del bucket
- subir archivos al bucket
- en algunos casos borrar archivos del bucket

sin validación fina de pertenencia al ticket.

### 6. Las funciones están muy expuestas

Hay muchas funciones con `EXECUTE` para `PUBLIC`, `anon` y `authenticated`.

Esto incluye:

- helpers internos
- funciones de importación del padrón
- funciones `SECURITY DEFINER`

No todas son explotables del mismo modo, pero sí aumentan superficie y complejidad. Es un punto de higiene importante.

### 7. La capa documental está bien modelada, pero no suficientemente encapsulada

El snapshot confirmó que:

- `documents` = estado actual
- `document_versions` = historial

Pero también confirmó que la base no encapsula toda la transición.

El trigger de sync solo actualiza:

- `status`
- `rejection_reason`
- `reviewed_by`

No actualiza:

- `field_values`
- `rendered_content`

Por eso la app todavía tiene que coordinar varias operaciones y es fácil que algo quede desfasado.

### 8. Índices: suficientes para hoy, no para crecimiento

Lo bueno:

- `document_versions(document_id, version_number desc)`
- `document_versions(ticket_id, created_at desc)`
- `notifications(recipient_user_id, created_at desc)`
- índice de notificaciones no leídas
- índice de disponibilidad/rol en `profiles`

Lo que todavía echo en falta:

- `documents(ticket_id)`
- `ticket_comments(ticket_id, created_at desc)`
- `ticket_files(ticket_id, created_at desc)`
- índices compuestos más operativos en `tickets`

No es urgente con 9 tickets, pero sí antes de crecer.

### 9. Hay tablas legacy o redundantes

Se confirma cierta mezcla entre modelo actual y legado:

- `roles` existe pero la fuente real de permisos es `profiles.role`
- `instruments` parece ajena al núcleo actual
- `vehicle_transfer_documents` resuelve un caso específico por fuera del modelo documental general

No es un problema inmediato, pero sí conviene reconocerlo antes de rediseñar.

## Riesgos priorizados

### Críticos

1. Exposición por `RLS` apagado en tablas sensibles
2. Policy de tickets con lectura pública total
3. Lectura amplia de perfiles para cualquier autenticado
4. Policies duplicadas o contradictorias en tickets e historial
5. Storage abierto por bucket sin ownership fino

### Medios

1. `superadmin` no homologado en toda la base
2. Lógica crítica repartida entre frontend, policy y trigger
3. Grants y `EXECUTE` demasiado abiertos
4. Índices todavía incompletos para crecimiento

### Bajos

1. Naming mixto español/inglés
2. tablas legacy no críticas
3. catálogos no del todo alineados con la fuente real de permisos

## Qué significa esto para próximos cambios

La conclusión práctica es clara:

- no hace falta rehacer la base desde cero
- sí hace falta una fase seria de endurecimiento

El orden correcto no debería ser “seguir agregando features y luego ordenar”.
Debería ser:

1. cerrar exposición de datos
2. limpiar policies duplicadas
3. normalizar permisos de `admin` y `superadmin`
4. mover transiciones críticas a funciones SQL/RPC
5. después optimizar esquema e índices

## Comandos y consultas para refrescar este snapshot

### Opción A: Supabase CLI

Si querés actualizar este snapshot desde CLI:

```bash
supabase migration list --linked
```

```bash
supabase db dump --linked --schema public --file docs/_generated/public-schema.sql
```

```bash
supabase db dump --linked --schema storage --file docs/_generated/storage-schema.sql
```

```bash
supabase gen types typescript --linked --schema public > app/types/database.types.ts
```

### Opción B: SQL Editor de Supabase

Ejecutá el archivo [docs/database-introspection.sql](/home/gabriel/abogato-server/abogato-webapp/docs/database-introspection.sql) por bloques y guardá los resultados.
