alter table public.documents
add column if not exists rejection_reason text;
