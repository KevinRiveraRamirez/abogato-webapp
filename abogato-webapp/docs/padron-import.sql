create extension if not exists pgcrypto;

create table if not exists public.padron_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_url text,
  source_hash text,
  snapshot_date date,
  status text not null check (status in ('preparing', 'running', 'merging', 'completed', 'failed', 'cancelled', 'skipped')),
  phase text,
  phase_progress integer not null default 0,
  total_rows integer not null default 0,
  rows_processed integer not null default 0,
  district_rows_processed integer not null default 0,
  cancel_requested boolean not null default false,
  cancel_requested_at timestamptz,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.padron_import_runs
  add column if not exists source_url text,
  add column if not exists source_hash text,
  add column if not exists snapshot_date date,
  add column if not exists phase text,
  add column if not exists phase_progress integer not null default 0,
  add column if not exists total_rows integer not null default 0,
  add column if not exists rows_processed integer not null default 0,
  add column if not exists district_rows_processed integer not null default 0,
  add column if not exists cancel_requested boolean not null default false,
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists error_message text,
  add column if not exists finished_at timestamptz;

alter table public.padron_import_runs
  drop constraint if exists padron_import_runs_status_check;

alter table public.padron_import_runs
  add constraint padron_import_runs_status_check
  check (status in ('preparing', 'running', 'merging', 'completed', 'failed', 'cancelled', 'skipped'));

create unique index if not exists padron_import_runs_source_hash_completed_idx
  on public.padron_import_runs (source_hash)
  where status = 'completed';

create table if not exists public.padron_distritos (
  codigo_electoral text primary key,
  provincia_num integer not null,
  canton_num integer not null,
  distrito_num integer not null,
  provincia text not null,
  canton text not null,
  distrito text not null,
  snapshot_date date not null,
  source_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.padron_electores (
  cedula text primary key,
  codigo_electoral text not null references public.padron_distritos (codigo_electoral),
  sexo integer,
  fecha_vencimiento date,
  junta_receptora text,
  nombre text not null,
  apellido_1 text not null,
  apellido_2 text,
  nombre_completo text not null,
  provincia text,
  canton text,
  distrito text,
  snapshot_date date not null,
  source_hash text not null,
  import_id uuid references public.padron_import_runs (id),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.padron_electores
  add column if not exists import_id uuid references public.padron_import_runs (id),
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.padron_distritos_staging (
  import_id uuid not null references public.padron_import_runs (id) on delete cascade,
  codigo_electoral text not null,
  provincia_num integer not null,
  canton_num integer not null,
  distrito_num integer not null,
  provincia text not null,
  canton text not null,
  distrito text not null,
  snapshot_date date not null,
  source_hash text not null,
  primary key (import_id, codigo_electoral)
);

create table if not exists public.padron_electores_staging (
  import_id uuid not null references public.padron_import_runs (id) on delete cascade,
  cedula text not null,
  codigo_electoral text not null,
  sexo integer,
  fecha_vencimiento date,
  junta_receptora text,
  nombre text not null,
  apellido_1 text not null,
  apellido_2 text,
  nombre_completo text not null,
  provincia text,
  canton text,
  distrito text,
  snapshot_date date not null,
  source_hash text not null,
  is_active boolean not null default true,
  primary key (import_id, cedula)
);

create index if not exists padron_electores_nombre_completo_idx
  on public.padron_electores (nombre_completo);

create index if not exists padron_electores_codigo_electoral_idx
  on public.padron_electores (codigo_electoral);

create index if not exists padron_electores_source_hash_idx
  on public.padron_electores (source_hash);

create or replace function public.padron_merge_distritos(
  p_import_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.padron_distritos (
    codigo_electoral,
    provincia_num,
    canton_num,
    distrito_num,
    provincia,
    canton,
    distrito,
    snapshot_date,
    source_hash,
    updated_at
  )
  select
    codigo_electoral,
    provincia_num,
    canton_num,
    distrito_num,
    provincia,
    canton,
    distrito,
    snapshot_date,
    source_hash,
    now()
  from public.padron_distritos_staging
  where import_id = p_import_id
  on conflict (codigo_electoral) do update
  set
    provincia_num = excluded.provincia_num,
    canton_num = excluded.canton_num,
    distrito_num = excluded.distrito_num,
    provincia = excluded.provincia,
    canton = excluded.canton,
    distrito = excluded.distrito,
    snapshot_date = excluded.snapshot_date,
    source_hash = excluded.source_hash,
    updated_at = now();
end;
$$;

create or replace function public.padron_merge_electores(
  p_import_id uuid,
  p_after_cedula text default null,
  p_batch_size integer default 25000
)
returns table (
  processed_count integer,
  last_cedula text,
  done boolean
)
language plpgsql
security definer
as $$
declare
  v_processed_count integer;
  v_last_cedula text;
begin
  with batch as (
    select *
    from public.padron_electores_staging
    where import_id = p_import_id
      and (p_after_cedula is null or cedula > p_after_cedula)
    order by cedula
    limit p_batch_size
  ),
  upserted as (
    insert into public.padron_electores (
      cedula,
      codigo_electoral,
      sexo,
      fecha_vencimiento,
      junta_receptora,
      nombre,
      apellido_1,
      apellido_2,
      nombre_completo,
      provincia,
      canton,
      distrito,
      snapshot_date,
      source_hash,
      import_id,
      is_active,
      updated_at
    )
    select
      cedula,
      codigo_electoral,
      sexo,
      fecha_vencimiento,
      junta_receptora,
      nombre,
      apellido_1,
      apellido_2,
      nombre_completo,
      provincia,
      canton,
      distrito,
      snapshot_date,
      source_hash,
      import_id,
      is_active,
      now()
    from batch
    on conflict (cedula) do update
    set
      codigo_electoral = excluded.codigo_electoral,
      sexo = excluded.sexo,
      fecha_vencimiento = excluded.fecha_vencimiento,
      junta_receptora = excluded.junta_receptora,
      nombre = excluded.nombre,
      apellido_1 = excluded.apellido_1,
      apellido_2 = excluded.apellido_2,
      nombre_completo = excluded.nombre_completo,
      provincia = excluded.provincia,
      canton = excluded.canton,
      distrito = excluded.distrito,
      snapshot_date = excluded.snapshot_date,
      source_hash = excluded.source_hash,
      import_id = excluded.import_id,
      is_active = true,
      updated_at = now()
    returning 1
  )
  select
    coalesce((select count(*) from batch), 0),
    (select max(cedula) from batch)
  into v_processed_count, v_last_cedula;

  return query
  select
    v_processed_count,
    v_last_cedula,
    v_processed_count < p_batch_size;
end;
$$;

create or replace function public.padron_deactivate_missing_electores(
  p_import_id uuid,
  p_after_cedula text default null,
  p_batch_size integer default 25000
)
returns table (
  processed_count integer,
  last_cedula text,
  done boolean
)
language plpgsql
security definer
as $$
declare
  v_processed_count integer;
  v_last_cedula text;
begin
  with batch as (
    select e.cedula
    from public.padron_electores e
    where (p_after_cedula is null or e.cedula > p_after_cedula)
      and not exists (
        select 1
        from public.padron_electores_staging s
        where s.import_id = p_import_id
          and s.cedula = e.cedula
      )
    order by e.cedula
    limit p_batch_size
  ),
  updated as (
    update public.padron_electores e
    set
      is_active = false,
      updated_at = now()
    where e.cedula in (select cedula from batch)
    returning e.cedula
  )
  select
    coalesce((select count(*) from batch), 0),
    (select max(cedula) from batch)
  into v_processed_count, v_last_cedula;

  return query
  select
    v_processed_count,
    v_last_cedula,
    v_processed_count < p_batch_size;
end;
$$;

create or replace function public.padron_count_missing_electores(
  p_import_id uuid
)
returns table (
  total_missing integer
)
language sql
security definer
as $$
  select count(*)::integer as total_missing
  from public.padron_electores e
  where not exists (
    select 1
    from public.padron_electores_staging s
    where s.import_id = p_import_id
      and s.cedula = e.cedula
  );
$$;

create or replace function public.padron_clear_staging(
  p_import_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.padron_electores_staging
  where import_id = p_import_id;

  delete from public.padron_distritos_staging
  where import_id = p_import_id;
end;
$$;

create or replace function public.padron_complete_import(
  p_import_id uuid,
  p_source_hash text,
  p_snapshot_date date,
  p_rows_processed integer,
  p_district_rows_processed integer,
  p_total_rows integer,
  p_phase text,
  p_phase_progress integer
)
returns void
language plpgsql
security definer
as $$
begin
  update public.padron_import_runs
  set
    status = 'completed',
    phase = p_phase,
    phase_progress = p_phase_progress,
    source_hash = p_source_hash,
    snapshot_date = p_snapshot_date,
    total_rows = p_total_rows,
    rows_processed = p_rows_processed,
    district_rows_processed = p_district_rows_processed,
    cancel_requested = false,
    finished_at = now(),
    error_message = null
  where id = p_import_id;
end;
$$;
