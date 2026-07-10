alter table public.games
drop constraint if exists games_status_check;

alter table public.games
add constraint games_status_check
check (status in ('draft', 'preview', 'published', 'archived'));

alter table public.games
add column if not exists build_id uuid,
add column if not exists build_status text not null default 'none'
  check (build_status in ('none', 'uploading', 'uploaded', 'extracting', 'ready', 'failed', 'deleted')),
add column if not exists build_version integer not null default 0,
add column if not exists r2_build_prefix text,
add column if not exists preview_url text,
add column if not exists thumbnail_url text,
add column if not exists screenshot_urls text[] not null default '{}',
add column if not exists desktop_controls jsonb not null default '[]'::jsonb,
add column if not exists mobile_controls jsonb not null default '[]'::jsonb,
add column if not exists aspect_ratio text not null default '16/9',
add column if not exists build_metadata jsonb not null default '{}'::jsonb,
add column if not exists last_build_error text;

create table if not exists public.game_builds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  slug text not null,
  version integer not null,
  status text not null default 'uploading'
    check (status in ('uploading', 'uploaded', 'extracting', 'ready', 'failed', 'deleted')),
  r2_zip_key text not null,
  r2_extract_prefix text not null,
  index_url text,
  size_bytes bigint not null default 0,
  file_count integer not null default 0,
  required_assets jsonb not null default '{}'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  error text,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists game_builds_slug_version_idx
on public.game_builds (slug, version);

create index if not exists game_builds_game_id_status_idx
on public.game_builds (game_id, status, created_at desc);

drop trigger if exists set_game_builds_updated_at on public.game_builds;
create trigger set_game_builds_updated_at
before update on public.game_builds
for each row execute function public.set_updated_at();

alter table public.game_builds enable row level security;

create policy "Admins can read game builds"
on public.game_builds
for select
to authenticated
using (public.is_admin());

create policy "Admins can create game builds"
on public.game_builds
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update game builds"
on public.game_builds
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete game builds"
on public.game_builds
for delete
to authenticated
using (public.is_admin());
