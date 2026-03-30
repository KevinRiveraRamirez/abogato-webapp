-- docs/client-assets.sql
--
-- Definición de tabla para bienes registrados manualmente por clientes.
-- Ejecutar estos comandos en el editor SQL de Supabase apuntando al proyecto de Abogato.

-- 1) Tabla principal de bienes del cliente
create table if not exists public.client_assets (
  id uuid primary key default gen_random_uuid(),

  -- Usuario dueño del bien (cliente)
  owner_user_id uuid not null,

  -- Tipo lógico de bien: mueble vs inmueble
  asset_type text not null check (asset_type in ('mueble', 'inmueble')),

  -- Plantilla (opcional) usada para capturar campos extra
  template_id uuid null,

  -- Valores capturados según la plantilla (json flexible)
  field_values jsonb not null default '{}'::jsonb,

  -- Nombre corto del bien (ej. "Vehículo Toyota Corolla 2018")
  name text not null,

  -- Categoría opcional para agrupar en UI (ej. "vehiculo", "propiedad", "mobiliario", "equipo", "otro")
  category text,

  -- Identificador principal (ej. placa, número de finca, serie, etc.)
  main_identifier text,

  -- Ubicación o descripción de localización
  location text,

  -- Valor estimado en moneda local (solo referencia)
  estimated_value numeric,

  -- Notas libres del cliente
  notes text,

  -- Marca lógica por si en el futuro se quiere archivar sin borrar
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- 2) Llave foránea a profiles / auth.users
--    Asumimos que profiles.user_id referencia a auth.users.id
alter table public.client_assets
  add constraint client_assets_owner_user_fk
  foreign key (owner_user_id)
  references auth.users(id)
  on delete cascade
  deferrable initially deferred;

-- FK template_id -> asset_templates.id
alter table public.client_assets
  add constraint client_assets_template_id_fkey
  foreign key (template_id)
  references public.asset_templates(id)
  on delete set null;


-- 3) Índices recomendados
create index if not exists client_assets_owner_created_at_idx
  on public.client_assets (owner_user_id, created_at desc);


-- 4) RLS: solo el cliente dueño puede ver/modificar sus bienes
alter table public.client_assets enable row level security;

-- Helper: check para asegurar que sólo clientes puedan operar sobre esta tabla
-- (perfil con role = 'cliente' en public.profiles)

drop policy if exists "client_assets_select_own" on public.client_assets;
create policy "client_assets_select_own"
on public.client_assets
for select
using (
  auth.uid() = owner_user_id
);

drop policy if exists "client_assets_modify_own_as_client" on public.client_assets;
create policy "client_assets_modify_own_as_client"
on public.client_assets
for all
using (
  auth.uid() = owner_user_id
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'cliente'
  )
)
with check (
  auth.uid() = owner_user_id
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'cliente'
  )
);


-- 5) Trigger para mantener updated_at

create or replace function public.client_assets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_assets_set_updated_at on public.client_assets;
create trigger client_assets_set_updated_at
before update on public.client_assets
for each row
execute function public.client_assets_set_updated_at();

