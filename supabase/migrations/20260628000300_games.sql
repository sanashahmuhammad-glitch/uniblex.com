create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  genre text,
  status text not null default 'draft' check (status in ('draft', 'published', 'coming_soon', 'archived')),
  description text not null,
  cover_url text,
  iframe_url text,
  tags text[] not null default '{}',
  play_count bigint not null default 0,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_status_sort_idx
on public.games (status, sort_order, published_at desc);

create index if not exists games_category_id_idx
on public.games (category_id);

create trigger set_games_updated_at
before update on public.games
for each row execute function public.set_updated_at();

alter table public.games enable row level security;

create policy "Public can read published games"
on public.games
for select
to anon, authenticated
using (status = 'published');

create policy "Admins can read all games"
on public.games
for select
to authenticated
using (public.is_admin());

create policy "Admins can create games"
on public.games
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update games"
on public.games
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete games"
on public.games
for delete
to authenticated
using (public.is_admin());
