create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  type text not null default 'game' check (type in ('game', 'blog')),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_published_type_idx
on public.categories (is_published, type, sort_order);

create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy "Public can read published categories"
on public.categories
for select
to anon, authenticated
using (is_published = true);

create policy "Admins can read all categories"
on public.categories
for select
to authenticated
using (public.is_admin());

create policy "Admins can create categories"
on public.categories
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update categories"
on public.categories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete categories"
on public.categories
for delete
to authenticated
using (public.is_admin());
