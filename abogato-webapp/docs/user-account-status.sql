alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz;

update public.profiles
set
  is_active = true,
  deactivated_at = null
where is_active is distinct from true and deactivated_at is null;

create index if not exists profiles_role_is_active_idx
  on public.profiles (role, is_active);
