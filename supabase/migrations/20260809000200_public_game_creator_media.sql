-- Keep public game presentation metadata synchronized with the approved developer submission.
-- This is additive and does not alter builds or existing R2 objects.

alter table public.games
  add column if not exists preview_video_url text;

alter table public.games
  drop constraint if exists games_preview_video_url_check;

alter table public.games
  add constraint games_preview_video_url_check
  check (preview_video_url is null or preview_video_url ~ '^https://');

create or replace function public.sync_public_game_creator_media()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_developer_name text;
  v_category_name text;
begin
  if new.game_id is null then
    return new;
  end if;

  select coalesce(nullif(trim(studio_name), ''), nullif(trim(display_name), ''), 'Independent developer')
  into v_developer_name
  from public.developer_profiles
  where id = new.owner_id;

  select name into v_category_name
  from public.categories
  where id = new.category_id;

  update public.games
  set preview_video_url = nullif(trim(coalesce(new.gameplay_video_url, '')), ''),
      genre = coalesce(nullif(trim(v_category_name), ''), genre, 'WebGL Game'),
      build_metadata = coalesce(build_metadata, '{}'::jsonb) || jsonb_build_object(
        'developer_name', coalesce(v_developer_name, 'Independent developer'),
        'engine', coalesce(nullif(trim(new.engine), ''), 'WebGL'),
        'orientation', coalesce(nullif(trim(new.options->>'orientation'), ''), 'landscape')
      )
  where id = new.game_id;

  return new;
end;
$$;

revoke all on function public.sync_public_game_creator_media() from public, anon, authenticated;

drop trigger if exists sync_public_game_creator_media on public.game_submissions;
create trigger sync_public_game_creator_media
after insert or update of game_id, gameplay_video_url, category_id, engine, options
on public.game_submissions
for each row
when (new.game_id is not null)
execute function public.sync_public_game_creator_media();

-- Backfill already-published Developer Portal games through the same guarded path.
update public.game_submissions
set gameplay_video_url = gameplay_video_url
where game_id is not null and status = 'published';
