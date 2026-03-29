alter table public.tickets
  add column if not exists reopen_requested boolean not null default false;

comment on column public.tickets.reopen_requested is 'Indica si el cliente solicito reabrir el ticket.';

alter table public.documents
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

comment on column public.documents.reviewed_by is 'Usuario que reviso o resolvio el documento.';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  type text not null,
  title text not null,
  body text not null default '',
  link_path text not null,
  ticket_id uuid references public.tickets (id) on delete cascade,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_not_blank check (length(btrim(type)) > 0),
  constraint notifications_title_not_blank check (length(btrim(title)) > 0),
  constraint notifications_link_path_not_blank check (length(btrim(link_path)) > 0)
);

comment on table public.notifications is 'Bandeja de notificaciones internas por usuario.';
comment on column public.notifications.recipient_user_id is 'Usuario destinatario de la notificacion.';
comment on column public.notifications.actor_user_id is 'Usuario que origino el evento, si aplica.';
comment on column public.notifications.type is 'Tipo logico de la notificacion para UI y filtros.';
comment on column public.notifications.link_path is 'Ruta interna de la app a la que debe navegar la campana.';
comment on column public.notifications.payload is 'Datos auxiliares para render futuro o depuracion.';

create table if not exists public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_type text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, notification_type),
  constraint notification_preferences_type_not_blank check (length(btrim(notification_type)) > 0)
);

comment on table public.notification_preferences is 'Preferencias de recepcion por tipo de notificacion para cada usuario.';
comment on column public.notification_preferences.enabled is 'Cuando es false, el usuario deja de recibir ese tipo de notificacion.';

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own"
on public.notification_preferences
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.notification_preferences to authenticated;

create table if not exists public.ticket_notification_mutes (
  user_id uuid not null references auth.users (id) on delete cascade,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ticket_id)
);

comment on table public.ticket_notification_mutes is 'Silencios de notificaciones por ticket y por usuario.';

alter table public.ticket_notification_mutes enable row level security;

drop policy if exists "ticket_notification_mutes_select_own" on public.ticket_notification_mutes;
create policy "ticket_notification_mutes_select_own"
on public.ticket_notification_mutes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "ticket_notification_mutes_insert_own" on public.ticket_notification_mutes;
create policy "ticket_notification_mutes_insert_own"
on public.ticket_notification_mutes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "ticket_notification_mutes_delete_own" on public.ticket_notification_mutes;
create policy "ticket_notification_mutes_delete_own"
on public.ticket_notification_mutes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "ticket_notification_mutes_update_own" on public.ticket_notification_mutes;
create policy "ticket_notification_mutes_update_own"
on public.ticket_notification_mutes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.ticket_notification_mutes to authenticated;

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists notifications_ticket_id_idx
  on public.notifications (ticket_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (recipient_user_id = auth.uid());

grant select on public.notifications to authenticated;

create or replace function public.notification_type_enabled(p_user_id uuid, p_type text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(
    (
      select np.enabled
      from public.notification_preferences np
      where np.user_id = p_user_id
        and np.notification_type = p_type
      limit 1
    ),
    true
  );
$$;

create or replace function public.notification_ticket_is_muted(p_user_id uuid, p_ticket_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.ticket_notification_mutes tnm
    where tnm.user_id = p_user_id
      and tnm.ticket_id = p_ticket_id
  );
$$;

create or replace function public.notification_insert(
  p_recipient_user_id uuid,
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
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_notification_id uuid;
begin
  if p_recipient_user_id is null then
    return null;
  end if;

  if p_actor_user_id is not null and p_recipient_user_id = p_actor_user_id then
    return null;
  end if;

  if not public.notification_type_enabled(p_recipient_user_id, p_type) then
    return null;
  end if;

  if p_ticket_id is not null and public.notification_ticket_is_muted(p_recipient_user_id, p_ticket_id) then
    return null;
  end if;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    type,
    title,
    body,
    link_path,
    ticket_id,
    entity_type,
    entity_id,
    payload
  )
  values (
    p_recipient_user_id,
    p_actor_user_id,
    p_type,
    p_title,
    coalesce(p_body, ''),
    p_link_path,
    p_ticket_id,
    p_entity_type,
    p_entity_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

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
    where p.role = 'admin'
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

create or replace function public.notification_notify_ticket_team(
  p_ticket_id uuid,
  p_actor_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link_path text,
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
  v_recipient_user_id uuid;
begin
  for v_recipient_user_id in
    select distinct recipients.recipient_user_id
    from (
      select p.user_id as recipient_user_id
      from public.profiles p
      where p.role = 'admin'

      union

      select t.assigned_to as recipient_user_id
      from public.tickets t
      where t.id = p_ticket_id
        and t.assigned_to is not null
    ) as recipients
  loop
    perform public.notification_insert(
      v_recipient_user_id,
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

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and recipient_user_id = auth.uid();
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.notifications
  set read_at = now()
  where recipient_user_id = auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.notification_insert(uuid, uuid, text, text, text, text, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.notification_notify_admins(uuid, text, text, text, text, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.notification_notify_ticket_team(uuid, uuid, text, text, text, text, text, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.notifications_handle_ticket_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid;
  v_link_path text;
begin
  v_actor_user_id := coalesce(auth.uid(), new.created_by);
  v_link_path := '/ticket/' || new.id::text;

  perform public.notification_notify_admins(
    v_actor_user_id,
    'ticket_created',
    'Nuevo ticket recibido',
    format('Se creo el ticket "%s".', new.title),
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

  if new.assigned_to is not null and new.assigned_to <> v_actor_user_id then
    perform public.notification_insert(
      new.assigned_to,
      v_actor_user_id,
      'ticket_assigned_lawyer',
      'Tenes un caso asignado',
      format('Se te asigno el ticket "%s".', new.title),
      v_link_path,
      new.id,
      'ticket',
      new.id,
      jsonb_build_object(
        'ticket_id', new.id,
        'status', new.status
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_after_ticket_insert on public.tickets;
create trigger notifications_after_ticket_insert
after insert on public.tickets
for each row
execute function public.notifications_handle_ticket_insert();

create or replace function public.notifications_handle_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid;
  v_link_path text;
  v_reopen_decision_handled boolean := false;
begin
  v_actor_user_id := auth.uid();
  v_link_path := '/ticket/' || new.id::text;

  if new.assigned_to is distinct from old.assigned_to
  then
    if old.assigned_to is not null
       and (v_actor_user_id is null or old.assigned_to <> v_actor_user_id) then
      perform public.notification_insert(
        old.assigned_to,
        v_actor_user_id,
        'ticket_unassigned_lawyer',
        'Caso reasignado',
        case
          when new.assigned_to is null then format('El ticket "%s" quedó sin abogado asignado.', new.title)
          else format('El ticket "%s" fue reasignado y salió de tu bandeja.', new.title)
        end,
        v_link_path,
        new.id,
        'ticket',
        new.id,
        jsonb_build_object(
          'ticket_id', new.id,
          'status', new.status,
          'old_assigned_to', old.assigned_to,
          'new_assigned_to', new.assigned_to
        )
      );
    end if;

    if new.assigned_to is not null
       and (v_actor_user_id is null or new.assigned_to <> v_actor_user_id) then
      perform public.notification_insert(
        new.assigned_to,
        v_actor_user_id,
        'ticket_assigned_lawyer',
        'Tenes un caso asignado',
        format('Se te asigno el ticket "%s".', new.title),
        v_link_path,
        new.id,
        'ticket',
        new.id,
        jsonb_build_object(
          'ticket_id', new.id,
          'status', new.status,
          'assigned_to', new.assigned_to,
          'previous_assigned_to', old.assigned_to
        )
      );
    end if;
  end if;

  if old.reopen_requested is distinct from new.reopen_requested and new.reopen_requested = true then
    perform public.notification_notify_ticket_team(
      new.id,
      v_actor_user_id,
      'ticket_reopen_requested',
      'Solicitud de reapertura',
      format('El cliente solicito reabrir el ticket "%s".', new.title),
      v_link_path,
      'ticket',
      new.id,
      jsonb_build_object(
        'ticket_id', new.id,
        'status', new.status
      )
    );
  elsif old.reopen_requested = true and new.reopen_requested = false then
    v_reopen_decision_handled := true;

    if new.status = 'open' then
      perform public.notification_insert(
        new.created_by,
        v_actor_user_id,
        'ticket_reopen_approved',
        'Reapertura aprobada',
        format('Tu solicitud de reapertura para el ticket "%s" fue aprobada.', new.title),
        v_link_path,
        new.id,
        'ticket',
        new.id,
        jsonb_build_object(
          'ticket_id', new.id,
          'status', new.status
        )
      );
    else
      perform public.notification_insert(
        new.created_by,
        v_actor_user_id,
        'ticket_reopen_rejected',
        'Reapertura rechazada',
        format('Tu solicitud de reapertura para el ticket "%s" fue rechazada.', new.title),
        v_link_path,
        new.id,
        'ticket',
        new.id,
        jsonb_build_object(
          'ticket_id', new.id,
          'status', new.status
        )
      );
    end if;
  end if;

  if new.status is distinct from old.status and not v_reopen_decision_handled then
    if old.status = 'open' and new.status = 'in_progress' and new.assigned_to is not null then
      perform public.notification_insert(
        new.created_by,
        v_actor_user_id,
        'ticket_taken',
        'Tu caso ya fue tomado',
        format('Un abogado ya esta revisando el ticket "%s".', new.title),
        v_link_path,
        new.id,
        'ticket',
        new.id,
        jsonb_build_object(
          'ticket_id', new.id,
          'old_status', old.status,
          'new_status', new.status
        )
      );
    else
      perform public.notification_insert(
        new.created_by,
        v_actor_user_id,
        'ticket_status_changed',
        'Cambio en tu caso',
        format('El ticket "%s" cambio de estado de %s a %s.', new.title, old.status, new.status),
        v_link_path,
        new.id,
        'ticket',
        new.id,
        jsonb_build_object(
          'ticket_id', new.id,
          'old_status', old.status,
          'new_status', new.status
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_after_ticket_update on public.tickets;
create trigger notifications_after_ticket_update
after update on public.tickets
for each row
when (
  old.status is distinct from new.status
  or old.assigned_to is distinct from new.assigned_to
  or old.reopen_requested is distinct from new.reopen_requested
)
execute function public.notifications_handle_ticket_update();

create or replace function public.notifications_handle_ticket_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid;
  v_ticket_created_by uuid;
  v_ticket_assigned_to uuid;
  v_ticket_title text;
  v_link_path text;
begin
  if new.is_internal then
    return new;
  end if;

  select t.created_by, t.assigned_to, t.title
  into v_ticket_created_by, v_ticket_assigned_to, v_ticket_title
  from public.tickets t
  where t.id = new.ticket_id;

  if v_ticket_created_by is null then
    return new;
  end if;

  v_actor_user_id := coalesce(auth.uid(), new.author_id);
  v_link_path := '/ticket/' || new.ticket_id::text;

  if new.author_id = v_ticket_created_by then
    perform public.notification_notify_ticket_team(
      new.ticket_id,
      v_actor_user_id,
      'ticket_comment_from_client',
      'Nuevo comentario del cliente',
      format('Hay un nuevo comentario en el ticket "%s".', v_ticket_title),
      v_link_path,
      'ticket_comment',
      new.id,
      jsonb_build_object(
        'ticket_id', new.ticket_id,
        'comment_id', new.id,
        'assigned_to', v_ticket_assigned_to
      )
    );
  else
    perform public.notification_insert(
      v_ticket_created_by,
      v_actor_user_id,
      'ticket_comment_from_staff',
      'Nuevo comentario en tu caso',
      format('Recibiste un nuevo comentario sobre el ticket "%s".', v_ticket_title),
      v_link_path,
      new.ticket_id,
      'ticket_comment',
      new.id,
      jsonb_build_object(
        'ticket_id', new.ticket_id,
        'comment_id', new.id
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_after_ticket_comment_insert on public.ticket_comments;
create trigger notifications_after_ticket_comment_insert
after insert on public.ticket_comments
for each row
execute function public.notifications_handle_ticket_comment_insert();

create or replace function public.notifications_handle_document_update()
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
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status not in ('approved', 'rejected') then
    return new;
  end if;

  select t.created_by, t.title
  into v_ticket_created_by, v_ticket_title
  from public.tickets t
  where t.id = new.ticket_id;

  if v_ticket_created_by is null then
    return new;
  end if;

  v_actor_user_id := coalesce(auth.uid(), new.reviewed_by);
  v_link_path := '/ticket/' || new.ticket_id::text;

  if new.status = 'approved' then
    perform public.notification_insert(
      v_ticket_created_by,
      v_actor_user_id,
      'document_approved',
      'Documento aprobado',
      format('El documento del ticket "%s" fue aprobado.', v_ticket_title),
      v_link_path,
      new.ticket_id,
      'document',
      new.id,
      jsonb_build_object(
        'ticket_id', new.ticket_id,
        'document_id', new.id,
        'document_status', new.status
      )
    );
  else
    perform public.notification_insert(
      v_ticket_created_by,
      v_actor_user_id,
      'document_rejected',
      'Documento rechazado',
      format('El documento del ticket "%s" fue rechazado. Revisa el detalle para ver el motivo.', v_ticket_title),
      v_link_path,
      new.ticket_id,
      'document',
      new.id,
      jsonb_build_object(
        'ticket_id', new.ticket_id,
        'document_id', new.id,
        'document_status', new.status,
        'rejection_reason', new.rejection_reason
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_after_document_update on public.documents;
create trigger notifications_after_document_update
after update on public.documents
for each row
when (old.status is distinct from new.status)
execute function public.notifications_handle_document_update();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;
