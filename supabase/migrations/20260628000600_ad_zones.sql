create table if not exists public.ad_zones (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  placement text not null,
  provider text,
  code text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_zones_active_placement_idx
on public.ad_zones (is_active, placement, sort_order);

create trigger set_ad_zones_updated_at
before update on public.ad_zones
for each row execute function public.set_updated_at();

alter table public.ad_zones enable row level security;

create policy "Public can read active ad zones"
on public.ad_zones
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can read all ad zones"
on public.ad_zones
for select
to authenticated
using (public.is_admin());

create policy "Admins can create ad zones"
on public.ad_zones
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update ad zones"
on public.ad_zones
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete ad zones"
on public.ad_zones
for delete
to authenticated
using (public.is_admin());
