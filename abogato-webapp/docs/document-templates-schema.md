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
- `activo` controla si la plantilla aparece disponible en el selector de tramites.
- El modulo de admin permite crear, editar, activar y desactivar registros existentes en `document_templates`.
- En tickets, el selector de tramites usa `title` como etiqueta visible y solo carga plantillas activas.
