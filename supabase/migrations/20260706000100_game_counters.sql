alter table public.games
add column if not exists view_count integer not null default 0,
add column if not exists play_count integer not null default 0;

create index if not exists games_view_count_idx
on public.games (view_count desc);

create index if not exists games_play_count_idx
on public.games (play_count desc);
