# `document_templates`

Schema actual de la tabla `public.document_templates` en Supabase.

## Columnas

| Columna | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| `id` | `uuid` | No | Identificador primario de la plantilla |
| `servicio_id` | `integer` | Si | Opcional; puede quedar `null` |
| `title` | `text` | No | Nombre visible de la plantilla o tramite |
| `content` | `text` | No | Texto base del documento con placeholders `{{campo}}` |
| `fields` | `jsonb` | No | Configuracion del formulario builder |
| `created_by` | `uuid` | Si | Usuario que creo la plantilla |
| `created_at` | `timestamp with time zone` | Si | Fecha de creacion |
| `updated_at` | `timestamp with time zone` | Si | Fecha de ultima actualizacion |
| `activo` | `boolean` | Si | Estado logico de la plantilla |

## Notas para la app

- El builder de admin usa `title` como nombre manual de la plantilla.
- Las plantillas nuevas pueden guardarse con `servicio_id = null`.
- `fields` se guarda como `jsonb` con la definicion del formulario, incluyendo tipos, placeholders, ayudas y secciones.
- Dentro de `fields`, un campo puede marcarse como `padron_source: true` para indicar que recibe una cédula y consulta el padrón.
- Los campos que se autocompletan desde esa cédula guardan `padron_source_key` con la clave del campo cédula y `padron_value` con el dato a copiar (`nombre_completo`, `nombre`, `apellido_1`, `apellido_2`).
- `activo` controla si la plantilla aparece disponible en el selector de tramites.
- El modulo de admin permite crear, editar, activar y desactivar registros existentes en `document_templates`.
- Las plantillas que ya fueron usadas por al menos un documento se marcan como `usadas` en la UI y no se eliminan físicamente.
- Solo las plantillas sin uso pueden borrarse desde el catálogo de admin.
- En tickets, el selector de tramites usa `title` como etiqueta visible y solo carga plantillas activas.
