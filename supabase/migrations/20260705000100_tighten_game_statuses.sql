update public.games
set status = 'draft'
where status = 'coming_soon';

alter table public.games
alter column status set default 'draft';

alter table public.games
drop constraint if exists games_status_check;

alter table public.games
add constraint games_status_check
check (status in ('draft', 'published', 'archived'));
