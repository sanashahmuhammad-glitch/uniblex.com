create table if not exists public.seo_settings (
  id uuid primary key default gen_random_uuid(),
  route text not null unique,
  title text,
  description text,
  canonical_url text,
  og_image_url text,
  noindex boolean not null default false,
  structured_data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seo_settings_active_route_idx
on public.seo_settings (is_active, route);

create trigger set_seo_settings_updated_at
before update on public.seo_settings
for each row execute function public.set_updated_at();

alter table public.seo_settings enable row level security;

create policy "Public can read active seo settings"
on public.seo_settings
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can read all seo settings"
on public.seo_settings
for select
to authenticated
using (public.is_admin());

create policy "Admins can create seo settings"
on public.seo_settings
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update seo settings"
on public.seo_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete seo settings"
on public.seo_settings
for delete
to authenticated
using (public.is_admin());
