alter table public.profiles
  add column if not exists professional_license_number text,
  add column if not exists professional_license_expires_at timestamptz,
  add column if not exists availability_status text;

comment on column public.profiles.professional_license_number is 'Cedula profesional unica para cuentas abogado.';
comment on column public.profiles.professional_license_expires_at is 'Fecha de vencimiento operativa de la cedula profesional.';
comment on column public.profiles.availability_status is 'Disponibilidad manual para autoasignacion de abogados: available, busy u offline.';

alter table public.profiles
  drop constraint if exists profiles_availability_status_check;

alter table public.profiles
  add constraint profiles_availability_status_check
  check (
    availability_status is null
    or availability_status in ('available', 'busy', 'offline')
  );

update public.profiles
set availability_status = 'available'
where role = 'abogado'
  and availability_status is null;

create unique index if not exists profiles_professional_license_number_uidx
  on public.profiles ((upper(btrim(professional_license_number))))
  where professional_license_number is not null;

create index if not exists profiles_role_is_active_availability_idx
  on public.profiles (role, is_active, availability_status);

create table if not exists public.profile_audit_logs (
  id uuid primary key default gen_random_uuid(),
  profile_user_id uuid not null references public.profiles(user_id) on delete cascade,
  actor_user_id uuid null references public.profiles(user_id) on delete set null,
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.profile_audit_logs is 'Auditoria de cambios sensibles en datos personales del perfil.';

alter table public.profile_audit_logs enable row level security;

drop policy if exists "profile_audit_logs_select_admin" on public.profile_audit_logs;
create policy "profile_audit_logs_select_admin"
on public.profile_audit_logs
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

grant select on public.profile_audit_logs to authenticated;

create or replace function public.profile_audit_logs_handle_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_changes jsonb := '{}'::jsonb;
begin
  if new.contact_email is distinct from old.contact_email then
    v_changes := v_changes || jsonb_build_object(
      'contact_email',
      jsonb_build_object('old', old.contact_email, 'new', new.contact_email)
    );
  end if;

  if new.contact_phone is distinct from old.contact_phone then
    v_changes := v_changes || jsonb_build_object(
      'contact_phone',
      jsonb_build_object('old', old.contact_phone, 'new', new.contact_phone)
    );
  end if;

  if new.personal_address is distinct from old.personal_address then
    v_changes := v_changes || jsonb_build_object(
      'personal_address',
      jsonb_build_object('old', old.personal_address, 'new', new.personal_address)
    );
  end if;

  if new.office_address is distinct from old.office_address then
    v_changes := v_changes || jsonb_build_object(
      'office_address',
      jsonb_build_object('old', old.office_address, 'new', new.office_address)
    );
  end if;

  if new.role is distinct from old.role then
    v_changes := v_changes || jsonb_build_object(
      'role',
      jsonb_build_object('old', old.role, 'new', new.role)
    );
  end if;

  if new.is_active is distinct from old.is_active then
    v_changes := v_changes || jsonb_build_object(
      'is_active',
      jsonb_build_object('old', old.is_active, 'new', new.is_active)
    );
  end if;

  if new.professional_license_number is distinct from old.professional_license_number then
    v_changes := v_changes || jsonb_build_object(
      'professional_license_number',
      jsonb_build_object('old', old.professional_license_number, 'new', new.professional_license_number)
    );
  end if;

  if new.professional_license_expires_at is distinct from old.professional_license_expires_at then
    v_changes := v_changes || jsonb_build_object(
      'professional_license_expires_at',
      jsonb_build_object('old', old.professional_license_expires_at, 'new', new.professional_license_expires_at)
    );
  end if;

  if new.availability_status is distinct from old.availability_status then
    v_changes := v_changes || jsonb_build_object(
      'availability_status',
      jsonb_build_object('old', old.availability_status, 'new', new.availability_status)
    );
  end if;

  if v_changes <> '{}'::jsonb then
    insert into public.profile_audit_logs (
      profile_user_id,
      actor_user_id,
      changed_fields
    ) values (
      new.user_id,
      coalesce(auth.uid(), new.user_id),
      v_changes
    );
  end if;

  return new;
end;
$$;

drop trigger if exists profile_audit_logs_after_profile_update on public.profiles;
create trigger profile_audit_logs_after_profile_update
after update on public.profiles
for each row
when (
  old.contact_email is distinct from new.contact_email
  or old.contact_phone is distinct from new.contact_phone
  or old.personal_address is distinct from new.personal_address
  or old.office_address is distinct from new.office_address
  or old.role is distinct from new.role
  or old.is_active is distinct from new.is_active
  or old.professional_license_number is distinct from new.professional_license_number
  or old.professional_license_expires_at is distinct from new.professional_license_expires_at
  or old.availability_status is distinct from new.availability_status
)
execute function public.profile_audit_logs_handle_profile_update();

create table if not exists public.ticket_assignment_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  previous_assigned_to uuid null references public.profiles(user_id) on delete set null,
  assigned_to uuid null references public.profiles(user_id) on delete set null,
  assigned_by uuid null references public.profiles(user_id) on delete set null,
  assignment_source text not null,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ticket_assignment_history_source_check
    check (assignment_source in ('auto', 'manual', 'self', 'unassigned'))
);

comment on table public.ticket_assignment_history is 'Historial operativo de asignacion y reasignacion de tickets.';

alter table public.ticket_assignment_history enable row level security;

drop policy if exists "ticket_assignment_history_select_admin" on public.ticket_assignment_history;
create policy "ticket_assignment_history_select_admin"
on public.ticket_assignment_history
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

grant select on public.ticket_assignment_history to authenticated;

create index if not exists ticket_assignment_history_ticket_idx
  on public.ticket_assignment_history (ticket_id, created_at desc);

create index if not exists ticket_assignment_history_assigned_to_idx
  on public.ticket_assignment_history (assigned_to, created_at desc);

create or replace function public.tickets_auto_assign_available_lawyer()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_candidate_user_id uuid;
begin
  if new.assigned_to is not null then
    return new;
  end if;

  select candidate.user_id
  into v_candidate_user_id
  from (
    select
      p.user_id,
      count(t.id) as active_ticket_count,
      coalesce(last_assignment.created_at, to_timestamp(0)) as oldest_assignment_reference,
      p.created_at
    from public.profiles p
    left join public.tickets t
      on t.assigned_to = p.user_id
     and t.status in ('open', 'in_progress')
    left join lateral (
      select tah.created_at
      from public.ticket_assignment_history tah
      where tah.assigned_to = p.user_id
      order by tah.created_at desc
      limit 1
    ) as last_assignment on true
    where p.role = 'abogado'
      and p.is_active = true
      and coalesce(p.availability_status, 'available') = 'available'
    group by p.user_id, last_assignment.created_at, p.created_at
    order by active_ticket_count asc, oldest_assignment_reference asc, p.created_at asc
    limit 1
  ) as candidate;

  if v_candidate_user_id is not null then
    new.assigned_to := v_candidate_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_before_insert_auto_assign on public.tickets;
create trigger tickets_before_insert_auto_assign
before insert on public.tickets
for each row
execute function public.tickets_auto_assign_available_lawyer();

create or replace function public.ticket_assignment_history_handle_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid;
  v_assignment_source text;
begin
  v_actor_user_id := auth.uid();

  if tg_op = 'INSERT' then
    if new.assigned_to is null then
      return new;
    end if;

    v_assignment_source := case
      when v_actor_user_id is null or v_actor_user_id = new.created_by then 'auto'
      when v_actor_user_id = new.assigned_to then 'self'
      else 'manual'
    end;

    insert into public.ticket_assignment_history (
      ticket_id,
      previous_assigned_to,
      assigned_to,
      assigned_by,
      assignment_source,
      notes
    ) values (
      new.id,
      null,
      new.assigned_to,
      v_actor_user_id,
      v_assignment_source,
      case
        when v_assignment_source = 'auto' then 'Asignacion automatica al crear el ticket.'
        when v_assignment_source = 'self' then 'El abogado tomo el caso.'
        else 'Ticket creado con responsable predefinido.'
      end
    );

    return new;
  end if;

  if new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;

  v_assignment_source := case
    when new.assigned_to is null then 'unassigned'
    when v_actor_user_id is not null and v_actor_user_id = new.assigned_to then 'self'
    else 'manual'
  end;

  insert into public.ticket_assignment_history (
    ticket_id,
    previous_assigned_to,
    assigned_to,
    assigned_by,
    assignment_source,
    notes
  ) values (
    new.id,
    old.assigned_to,
    new.assigned_to,
    v_actor_user_id,
    v_assignment_source,
    case
      when v_assignment_source = 'unassigned' then 'El ticket quedo sin responsable asignado.'
      when v_assignment_source = 'self' then 'El abogado tomo el caso manualmente.'
      when old.assigned_to is null then 'Asignacion manual desde administracion.'
      else 'Reasignacion manual del ticket.'
    end
  );

  return new;
end;
$$;

drop trigger if exists ticket_assignment_history_after_insert on public.tickets;
create trigger ticket_assignment_history_after_insert
after insert on public.tickets
for each row
execute function public.ticket_assignment_history_handle_ticket_change();

drop trigger if exists ticket_assignment_history_after_update on public.tickets;
create trigger ticket_assignment_history_after_update
after update of assigned_to on public.tickets
for each row
when (old.assigned_to is distinct from new.assigned_to)
execute function public.ticket_assignment_history_handle_ticket_change();

create table if not exists public.ticket_files (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(user_id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint null,
  file_type text null,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.ticket_files is 'Registro estructurado de archivos adjuntos por ticket.';

alter table public.ticket_files enable row level security;

drop policy if exists "ticket_files_select_authorized" on public.ticket_files;
create policy "ticket_files_select_authorized"
on public.ticket_files
for select
to authenticated
using (
  exists (
    select 1
    from public.tickets t
    where t.id = ticket_files.ticket_id
      and (
        t.created_by = auth.uid()
        or t.assigned_to = auth.uid()
      )
  )
  or exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'superadmin')
  )
);

drop policy if exists "ticket_files_insert_authorized" on public.ticket_files;
create policy "ticket_files_insert_authorized"
on public.ticket_files
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and (
    exists (
      select 1
      from public.tickets t
      where t.id = ticket_files.ticket_id
        and (
          t.created_by = auth.uid()
          or t.assigned_to = auth.uid()
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'superadmin')
    )
  )
);

grant select, insert on public.ticket_files to authenticated;

create or replace function public.notifications_handle_ticket_file_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid;
  v_ticket_created_by uuid;
  v_ticket_title text;
  v_link_path text;
begin
  select t.created_by, t.title
  into v_ticket_created_by, v_ticket_title
  from public.tickets t
  where t.id = new.ticket_id;

  if v_ticket_created_by is null then
    return new;
  end if;

  if new.uploaded_by <> v_ticket_created_by then
    return new;
  end if;

  v_actor_user_id := coalesce(auth.uid(), new.uploaded_by);
  v_link_path := '/ticket/' || new.ticket_id::text;

  perform public.notification_notify_ticket_team(
    new.ticket_id,
    v_actor_user_id,
    'ticket_file_from_client',
    'Nuevo archivo del cliente',
    format('El cliente adjunto "%s" en el ticket "%s".', new.file_name, v_ticket_title),
    v_link_path,
    'ticket_file',
    new.id,
    jsonb_build_object(
      'ticket_id', new.ticket_id,
      'ticket_file_id', new.id,
      'file_name', new.file_name
    )
  );

  return new;
end;
$$;

drop trigger if exists notifications_after_ticket_file_insert on public.ticket_files;
create trigger notifications_after_ticket_file_insert
after insert on public.ticket_files
for each row
execute function public.notifications_handle_ticket_file_insert();

create or replace function public.notifications_handle_ticket_without_available_lawyer()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid;
  v_link_path text;
begin
  if new.assigned_to is not null then
    return new;
  end if;

  v_actor_user_id := coalesce(auth.uid(), new.created_by);
  v_link_path := '/ticket/' || new.id::text;

  perform public.notification_notify_admins(
    v_actor_user_id,
    'ticket_unassigned_alert',
    'Ticket sin abogado disponible',
    format('El ticket "%s" quedo sin asignar porque no habia abogados disponibles en la cola.', new.title),
    v_link_path,
    new.id,
    'ticket',
    new.id,
    jsonb_build_object(
      'ticket_id', new.id,
      'status', new.status,
      'priority', new.priority
    )
  );

  return new;
end;
$$;

drop trigger if exists notifications_after_ticket_insert_unassigned on public.tickets;
create trigger notifications_after_ticket_insert_unassigned
after insert on public.tickets
for each row
when (new.assigned_to is null)
execute function public.notifications_handle_ticket_without_available_lawyer();
