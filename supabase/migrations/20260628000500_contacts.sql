create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_status_created_at_idx
on public.contacts (status, created_at desc);

create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

create policy "Public can create contacts"
on public.contacts
for insert
to anon, authenticated
with check (true);

create policy "Admins can read contacts"
on public.contacts
for select
to authenticated
using (public.is_admin());

create policy "Admins can update contacts"
on public.contacts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete contacts"
on public.contacts
for delete
to authenticated
using (public.is_admin());
