alter table public.profiles
add column if not exists office_address text;

insert into public.servicios (nombre, activo)
select 'Poderes notariales', true
where not exists (
  select 1
  from public.servicios
  where lower(nombre) = lower('Poderes notariales')
);

with servicio_objetivo as (
  select id
  from public.servicios
  where lower(nombre) = lower('Poderes notariales')
  limit 1
)
insert into public.document_templates (
  title,
  content,
  fields,
  servicio_id,
  activo
)
select
  'Poder generalísimo sin límite de suma',
  $$NÚMERO CIENTO SESENTA Y UNO - UNO. Ante mí, {{nombre_notario}}, Notario Público con oficina abierta en {{direccion_notario}}, comparece la señora {{nombre_cliente}}, {{edad_cliente}}, {{estado_civil_cliente}},{{direccion_cliente}}. cédula de identidad número {{cedula_cliente}} Y DICE: Que confiere poder generalísimo sin límite de suma a la señora {{nombre_apoderado}}, {{edad_apoderado}},{{estado_civil_apoderado}}, {{direccion_apoderado}}, portadora de la cédula de identidad número {{cedula_apoderado}} confiriéndole al efecto las facultades que determina el artículo mil doscientos cincuenta y tres del Código Civil, y además las de sustituir este poder en todo o en parte, revocar sustituciones y hacer otras de nuevo. El poder incluye las facultades para que pueda realizar consultas de sus operaciones bancarias a su nombre y hacer pago de préstamos a nombre de la misma. ES TODO. Extiendo un primer testimonio para el apoderado. Leído lo escrito al otorgante lo aprueba y juntos firmamos en la ciudad de San José, a las catorce horas y once minutos del día catorce de noviembre de dos mil veinticinco.. FIRMA ILEGIBLE,  {{nombre_notario}}.$$,
  '[
    {"key":"nombre_cliente","label":"Nombre cliente","type":"text"},
    {"key":"edad_cliente","label":"Edad cliente","type":"number"},
    {"key":"estado_civil_cliente","label":"Estado civil cliente","type":"text"},
    {"key":"direccion_cliente","label":"Dirección cliente","type":"text"},
    {"key":"cedula_cliente","label":"Cédula cliente","type":"text"},
    {"key":"nombre_apoderado","label":"Nombre apoderado","type":"text"},
    {"key":"edad_apoderado","label":"Edad apoderado","type":"number"},
    {"key":"estado_civil_apoderado","label":"Estado civil apoderado","type":"text"},
    {"key":"direccion_apoderado","label":"Dirección apoderado","type":"text"},
    {"key":"cedula_apoderado","label":"Cédula apoderado","type":"text"}
  ]'::jsonb,
  servicio_objetivo.id,
  true
from servicio_objetivo
where not exists (
  select 1
  from public.document_templates
  where lower(title) = lower('Poder generalísimo sin límite de suma')
);
