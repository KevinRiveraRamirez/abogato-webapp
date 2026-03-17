alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists personal_address text;

comment on column public.profiles.first_name is 'Nombre de pila del usuario';
comment on column public.profiles.last_name is 'Apellidos del usuario';
comment on column public.profiles.contact_email is 'Correo de contacto visible para la app';
comment on column public.profiles.contact_phone is 'Telefono de contacto visible para la app';
comment on column public.profiles.personal_address is 'Direccion personal del cliente o usuario';

update public.profiles p
set
  contact_email = coalesce(p.contact_email, u.email),
  contact_phone = coalesce(p.contact_phone, nullif(u.phone, ''))
from auth.users u
where u.id = p.user_id
  and (
    p.contact_email is null
    or p.contact_phone is null
  );

update public.profiles
set
  first_name = split_part(trim(display_name), ' ', 1),
  last_name = nullif(
    trim(
      substring(
        trim(display_name)
        from length(split_part(trim(display_name), ' ', 1)) + 1
      )
    ),
    ''
  )
where trim(coalesce(display_name, '')) <> ''
  and first_name is null
  and last_name is null;
