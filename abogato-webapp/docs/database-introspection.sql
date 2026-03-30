-- Ejecutar por bloques en el SQL Editor de Supabase.
-- Objetivo: capturar el estado real de la base antes de rediseñar schema, policies o flujos.

-- =========================================================
-- 1) Version, extensiones y contexto general
-- =========================================================

select version();

select extname, extversion
from pg_extension
order by extname;

-- =========================================================
-- 2) Tablas reales del schema public
-- =========================================================

select
  table_schema,
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

-- =========================================================
-- 3) Columnas, tipos, nullability y defaults
-- =========================================================

select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- =========================================================
-- 4) Primary keys, foreign keys y constraints
-- =========================================================

select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
 and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- =========================================================
-- 5) Check constraints y definición completa
-- =========================================================

select
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
from information_schema.table_constraints tc
join information_schema.check_constraints cc
  on tc.constraint_name = cc.constraint_name
where tc.table_schema = 'public'
  and tc.constraint_type = 'CHECK'
order by tc.table_name, tc.constraint_name;

-- =========================================================
-- 6) Índices
-- =========================================================

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- =========================================================
-- 7) RLS habilitado por tabla
-- =========================================================

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- =========================================================
-- 8) Policies
-- =========================================================

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- =========================================================
-- 9) Triggers
-- =========================================================

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;

-- =========================================================
-- 10) Funciones del schema public
-- =========================================================

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as returns,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- =========================================================
-- 11) Grants sobre tablas
-- =========================================================

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
order by table_name, grantee, privilege_type;

-- =========================================================
-- 12) Grants sobre funciones
-- =========================================================

select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
order by routine_name, grantee, privilege_type;

-- =========================================================
-- 13) Tablas publicadas en Supabase Realtime
-- =========================================================

select *
from pg_publication_tables
where schemaname in ('public', 'storage')
order by schemaname, tablename;

-- =========================================================
-- 14) Buckets y policies de storage
-- =========================================================

select *
from storage.buckets
order by id;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- =========================================================
-- 15) Tamaño aproximado y volumen por tabla
-- =========================================================

select
  c.relname as table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  c.reltuples::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc;

-- =========================================================
-- 16) Foco negocio: tablas críticas
-- =========================================================

select *
from pg_policies
where schemaname = 'public'
  and tablename in (
    'tickets',
    'documents',
    'document_versions',
    'notifications',
    'ticket_comments',
    'ticket_files',
    'profiles'
  )
order by tablename, policyname;

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'tickets',
    'documents',
    'document_versions',
    'profiles',
    'ticket_comments',
    'ticket_files',
    'notifications'
  )
order by event_object_table, trigger_name;
