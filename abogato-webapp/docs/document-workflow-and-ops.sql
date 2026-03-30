create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  template_id uuid not null references public.document_templates(id) on delete restrict,
  version_number integer not null,
  status text not null default 'draft',
  source text not null default 'initial',
  field_values jsonb not null default '{}'::jsonb,
  rendered_content text not null default '',
  rejection_reason text null,
  created_by uuid null references auth.users(id) on delete set null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint document_versions_status_check
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  constraint document_versions_source_check
    check (source in ('initial', 'correction', 'manual')),
  constraint document_versions_document_version_unique
    unique (document_id, version_number)
);

comment on table public.document_versions is 'Historial de versiones del documento legal asociado a un ticket.';
comment on column public.document_versions.rendered_content is 'Snapshot renderizado del documento para vista previa e historial.';

create index if not exists document_versions_document_idx
  on public.document_versions (document_id, version_number desc);

create index if not exists document_versions_ticket_idx
  on public.document_versions (ticket_id, created_at desc);

alter table public.document_versions enable row level security;

drop policy if exists "document_versions_select_authorized" on public.document_versions;
create policy "document_versions_select_authorized"
on public.document_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.tickets t
    left join public.profiles actor on actor.user_id = auth.uid()
    where t.id = document_versions.ticket_id
      and (
        t.created_by = auth.uid()
        or t.assigned_to = auth.uid()
        or actor.role in ('admin', 'superadmin')
      )
  )
);

drop policy if exists "document_versions_insert_authorized" on public.document_versions;
create policy "document_versions_insert_authorized"
on public.document_versions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.tickets t
    left join public.profiles actor on actor.user_id = auth.uid()
    where t.id = document_versions.ticket_id
      and (
        t.created_by = auth.uid()
        or t.assigned_to = auth.uid()
        or actor.role in ('admin', 'superadmin')
      )
  )
);

grant select, insert on public.document_versions to authenticated;

create or replace function public.document_versions_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists document_versions_before_update_timestamp on public.document_versions;
create trigger document_versions_before_update_timestamp
before update on public.document_versions
for each row
execute function public.document_versions_touch_updated_at();

create or replace function public.document_versions_sync_document_status()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_latest_version_id uuid;
begin
  if new.status is not distinct from old.status
     and new.rejection_reason is not distinct from old.rejection_reason
     and new.reviewed_by is not distinct from old.reviewed_by then
    return new;
  end if;

  select dv.id
  into v_latest_version_id
  from public.document_versions dv
  where dv.document_id = new.id
  order by dv.version_number desc
  limit 1;

  if v_latest_version_id is null then
    return new;
  end if;

  update public.document_versions
  set
    status = coalesce(new.status, status),
    rejection_reason = new.rejection_reason,
    reviewed_by = new.reviewed_by,
    updated_at = timezone('utc', now())
  where id = v_latest_version_id;

  return new;
end;
$$;

drop trigger if exists document_versions_after_document_update on public.documents;
create trigger document_versions_after_document_update
after update on public.documents
for each row
when (
  old.status is distinct from new.status
  or old.rejection_reason is distinct from new.rejection_reason
  or old.reviewed_by is distinct from new.reviewed_by
)
execute function public.document_versions_sync_document_status();

create table if not exists public.document_generation_metrics (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  document_version_id uuid null references public.document_versions(id) on delete set null,
  actor_user_id uuid null references auth.users(id) on delete set null,
  operation_type text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms integer not null,
  exceeded_sla boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint document_generation_metrics_operation_type_check
    check (operation_type in ('initial_submission', 'correction')),
  constraint document_generation_metrics_duration_check
    check (duration_ms >= 0)
);

comment on table public.document_generation_metrics is 'Métricas operativas del tiempo de generación documental.';

create index if not exists document_generation_metrics_ticket_idx
  on public.document_generation_metrics (ticket_id, created_at desc);

create index if not exists document_generation_metrics_exceeded_idx
  on public.document_generation_metrics (exceeded_sla, created_at desc);

alter table public.document_generation_metrics enable row level security;

drop policy if exists "document_generation_metrics_select_admin" on public.document_generation_metrics;
create policy "document_generation_metrics_select_admin"
on public.document_generation_metrics
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'superadmin')
  )
);

drop policy if exists "document_generation_metrics_insert_own" on public.document_generation_metrics;
create policy "document_generation_metrics_insert_own"
on public.document_generation_metrics
for insert
to authenticated
with check (actor_user_id = auth.uid());

grant select, insert on public.document_generation_metrics to authenticated;

create or replace function public.notification_notify_admins(
  p_actor_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link_path text,
  p_ticket_id uuid default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_user_id uuid;
begin
  for v_admin_user_id in
    select p.user_id
    from public.profiles p
    where p.role in ('admin', 'superadmin')
  loop
    perform public.notification_insert(
      v_admin_user_id,
      p_actor_user_id,
      p_type,
      p_title,
      p_body,
      p_link_path,
      p_ticket_id,
      p_entity_type,
      p_entity_id,
      p_payload
    );
  end loop;
end;
$$;

create or replace function public.document_generation_metrics_notify_admins()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_ticket_title text;
  v_duration_minutes numeric;
begin
  if not new.exceeded_sla then
    return new;
  end if;

  select t.title
  into v_ticket_title
  from public.tickets t
  where t.id = new.ticket_id;

  v_duration_minutes := round((new.duration_ms::numeric / 60000.0), 2);

  perform public.notification_notify_admins(
    new.actor_user_id,
    'document_generation_sla_alert',
    'Generación documental fuera de SLA',
    format(
      'El documento del ticket "%s" tardó %s minutos en generarse.',
      coalesce(v_ticket_title, 'sin título'),
      v_duration_minutes
    ),
    '/ticket/' || new.ticket_id::text,
    new.ticket_id,
    'document_generation_metric',
    new.id,
    jsonb_build_object(
      'ticket_id', new.ticket_id,
      'document_id', new.document_id,
      'document_version_id', new.document_version_id,
      'duration_ms', new.duration_ms,
      'operation_type', new.operation_type
    )
  );

  return new;
end;
$$;

drop trigger if exists document_generation_metrics_after_insert_alert on public.document_generation_metrics;
create trigger document_generation_metrics_after_insert_alert
after insert on public.document_generation_metrics
for each row
when (new.exceeded_sla = true)
execute function public.document_generation_metrics_notify_admins();

create table if not exists public.system_lookup_failures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticket_id uuid null references public.tickets(id) on delete set null,
  source text not null,
  query_value text not null,
  failure_kind text not null,
  error_message text null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint system_lookup_failures_source_check
    check (source in ('ticket_padron', 'vehicle_transfer_padron')),
  constraint system_lookup_failures_kind_check
    check (failure_kind in ('error', 'not_found'))
);

comment on table public.system_lookup_failures is 'Intentos fallidos de consulta usados para alertas operativas.';

create index if not exists system_lookup_failures_user_source_idx
  on public.system_lookup_failures (user_id, source, created_at desc);

alter table public.system_lookup_failures enable row level security;

drop policy if exists "system_lookup_failures_insert_own" on public.system_lookup_failures;
create policy "system_lookup_failures_insert_own"
on public.system_lookup_failures
for insert
to authenticated
with check (user_id = auth.uid());

grant insert on public.system_lookup_failures to authenticated;

create or replace function public.system_lookup_failures_notify_admins()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_failure_count integer;
  v_actor_name text;
  v_source_label text;
begin
  select count(*)
  into v_failure_count
  from public.system_lookup_failures slf
  where slf.user_id = new.user_id
    and slf.source = new.source
    and slf.created_at >= timezone('utc', now()) - interval '24 hours';

  if v_failure_count <> 10 then
    return new;
  end if;

  select coalesce(p.display_name, p.contact_email, p.user_id::text)
  into v_actor_name
  from public.profiles p
  where p.user_id = new.user_id;

  v_source_label := case new.source
    when 'ticket_padron' then 'búsquedas de padrón en creación de ticket'
    when 'vehicle_transfer_padron' then 'búsquedas de padrón en traspaso vehicular'
    else new.source
  end;

  perform public.notification_notify_admins(
    new.user_id,
    'system_lookup_failure_alert',
    'Se detectaron consultas problemáticas',
    format(
      '%s acumuló 10 consultas sin resultado en %s durante las últimas 24 horas.',
      coalesce(v_actor_name, 'Un usuario'),
      v_source_label
    ),
    coalesce('/ticket/' || new.ticket_id::text, '/admin/dashboard'),
    new.ticket_id,
    'system_lookup_failure',
    new.id,
    jsonb_build_object(
      'user_id', new.user_id,
      'ticket_id', new.ticket_id,
      'source', new.source,
      'failure_kind', new.failure_kind,
      'query_value', new.query_value
    )
  );

  return new;
end;
$$;

drop trigger if exists system_lookup_failures_after_insert_alert on public.system_lookup_failures;
create trigger system_lookup_failures_after_insert_alert
after insert on public.system_lookup_failures
for each row
execute function public.system_lookup_failures_notify_admins();
