drop policy if exists "Cliente edita sus documentos en draft" on public.documents;

create policy "Cliente corrige documentos rechazados propios"
on public.documents
for update
to authenticated
using (
  created_by = auth.uid()
  and status in ('draft', 'rejected')
  and exists (
    select 1
    from public.tickets t
    where t.id = documents.ticket_id
      and t.created_by = auth.uid()
      and t.status not in ('resolved', 'closed', 'cancelled')
  )
)
with check (
  created_by = auth.uid()
  and status in ('draft', 'submitted')
  and exists (
    select 1
    from public.tickets t
    where t.id = documents.ticket_id
      and t.created_by = auth.uid()
      and t.status not in ('resolved', 'closed', 'cancelled')
  )
);
