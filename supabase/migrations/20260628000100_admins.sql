create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_admins_updated_at
before update on public.admins
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where id = auth.uid()
      and is_active = true
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;

create policy "Admins can read admins"
on public.admins
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert admins"
on public.admins
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update admins"
on public.admins
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete admins"
on public.admins
for delete
to authenticated
using (public.is_admin());
