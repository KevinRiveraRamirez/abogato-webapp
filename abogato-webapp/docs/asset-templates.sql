-- docs/asset-templates.sql
--
-- Plantillas para bienes muebles/inmuebles (administrables desde /admin/plantillas/bienes).
-- Ejecutar en Supabase SQL editor.

-- 1) Tabla de plantillas de bienes
create table if not exists public.asset_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,

  -- Tipo lógico del bien al que aplica la plantilla
  asset_type text not null check (asset_type in ('mueble', 'inmueble')),

  -- Categoría opcional: vehiculo, propiedad, mobiliario, equipo, otro...
  category text,

  -- Definición de campos extra (UI builder): [{ key, label, type, required, help, placeholder }]
  fields jsonb not null default '[]'::jsonb,

  -- Estado lógico en UI
  activo boolean not null default true,

  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_templates_type_category_active_idx
  on public.asset_templates (asset_type, category, activo);

-- 2) RLS
alter table public.asset_templates enable row level security;

-- Lectura: permitir a usuarios autenticados (clientes pueden necesitarlas al crear un bien).
drop policy if exists "asset_templates_select_authenticated" on public.asset_templates;
create policy "asset_templates_select_authenticated"
on public.asset_templates
for select
using (auth.role() = 'authenticated');

-- Escritura: solo admin/superadmin
drop policy if exists "asset_templates_modify_admin" on public.asset_templates;
create policy "asset_templates_modify_admin"
on public.asset_templates
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'superadmin')
  )
);

-- 3) Trigger updated_at
create or replace function public.asset_templates_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists asset_templates_set_updated_at on public.asset_templates;
create trigger asset_templates_set_updated_at
before update on public.asset_templates
for each row
execute function public.asset_templates_set_updated_at();

