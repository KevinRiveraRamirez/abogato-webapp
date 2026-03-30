-- docs/client-assets-template-fields.sql
--
-- Extiende `public.client_assets` para guardar:
-- - `template_id`: plantilla usada para este bien
-- - `field_values`: valores capturados según esa plantilla (jsonb)
--
-- Ejecutá esto después de `docs/client-assets.sql` y `docs/asset-templates.sql` (en cualquier orden),
-- idealmente en una sola corrida de SQL editor.

-- Columnas nuevas
alter table public.client_assets
  add column if not exists template_id uuid null;

alter table public.client_assets
  add column if not exists field_values jsonb not null default '{}'::jsonb;

-- FK template_id -> asset_templates.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_assets_template_id_fkey'
  ) then
    alter table public.client_assets
      add constraint client_assets_template_id_fkey
      foreign key (template_id)
      references public.asset_templates(id)
      on delete set null;
  end if;
end $$;

-- Índice para acelerar listados por usuario y tipo de plantilla
create index if not exists client_assets_owner_template_created_at_idx
  on public.client_assets (owner_user_id, template_id, created_at desc);

