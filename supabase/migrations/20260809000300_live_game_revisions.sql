-- Allow a published game to receive a reviewed update without mutating the live release.

alter table public.game_submissions
  add column if not exists parent_submission_id uuid references public.game_submissions(id) on delete restrict,
  add column if not exists revision_number integer not null default 1;

alter table public.game_submissions
  drop constraint if exists game_submissions_owner_id_slug_key;

alter table public.game_submissions
  drop constraint if exists game_submissions_revision_number_check,
  drop constraint if exists game_submissions_parent_not_self_check;

alter table public.game_submissions
  add constraint game_submissions_revision_number_check check (revision_number > 0),
  add constraint game_submissions_parent_not_self_check check (parent_submission_id is null or parent_submission_id <> id);

create unique index if not exists game_submissions_owner_slug_revision_idx
  on public.game_submissions(owner_id, slug, revision_number);

create unique index if not exists game_submissions_one_active_update_idx
  on public.game_submissions(game_id)
  where parent_submission_id is not null
    and status in ('draft','uploading','upload_failed','verification_pending','verification_failed','ready_for_review','submitted','under_review','changes_requested','approved');

create index if not exists game_submissions_parent_idx
  on public.game_submissions(parent_submission_id, revision_number desc);

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
  -- Draft revisions must never change the public listing before publication.
  if new.game_id is null or new.status <> 'published' then
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
after insert or update of game_id, gameplay_video_url, category_id, engine, options, status
on public.game_submissions
for each row
when (new.game_id is not null)
execute function public.sync_public_game_creator_media();

create or replace function public.review_developer_submission(
  p_submission_id uuid,
  p_decision text,
  p_developer_feedback text default null,
  p_internal_notes text default null,
  p_checklist jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
  v_role text;
  v_submission public.game_submissions%rowtype;
  v_build public.developer_game_builds%rowtype;
  v_game_id uuid;
  v_cover text;
  v_thumbnail text;
  v_screenshots text[];
  v_submission_ids uuid[];
  v_now timestamptz := now();
begin
  select role into v_role
  from public.admins
  where id = v_actor and is_active;

  if v_role not in ('owner', 'admin', 'reviewer') then
    raise exception 'Reviewer access is required' using errcode = '42501';
  end if;

  if p_decision not in ('under_review','changes_requested','approved','rejected','published','unpublished') then
    raise exception 'Review decision is invalid' using errcode = '22023';
  end if;

  if p_decision in ('published','unpublished') and v_role not in ('owner','admin') then
    raise exception 'Owner or admin authority is required to publish' using errcode = '42501';
  end if;

  if p_decision in ('changes_requested','rejected') and nullif(trim(coalesce(p_developer_feedback,'')), '') is null then
    raise exception 'Developer-visible feedback is required for this decision' using errcode = '22023';
  end if;

  select * into v_submission
  from public.game_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission was not found' using errcode = 'P0002';
  end if;

  with recursive release_chain as (
    select id, parent_submission_id, 0 as depth
    from public.game_submissions
    where id = p_submission_id
    union all
    select parent.id, parent.parent_submission_id, chain.depth + 1
    from public.game_submissions parent
    join release_chain chain on parent.id = chain.parent_submission_id
    where chain.depth < 50
  )
  select array_agg(id order by depth) into v_submission_ids
  from release_chain;

  if p_decision in ('approved','published') and not v_submission.build_verified then
    raise exception 'An unverified build cannot be approved or published' using errcode = '23514';
  end if;

  if p_decision in ('approved','published') and not (
    coalesce((p_checklist->>'load')::boolean, false) and
    coalesce((p_checklist->>'controls')::boolean, false) and
    coalesce((p_checklist->>'responsive')::boolean, false) and
    coalesce((p_checklist->>'content')::boolean, false)
  ) then
    raise exception 'Every QA checklist item must pass before approval or publication' using errcode = '23514';
  end if;

  if p_decision = 'published' and v_submission.status not in ('approved','published') then
    raise exception 'Approve the submission before publishing it' using errcode = '23514';
  end if;

  if p_decision = 'unpublished' and v_submission.status <> 'published' then
    raise exception 'Only a published submission can be unpublished' using errcode = '23514';
  end if;

  if p_decision = 'published' then
    select * into v_build
    from public.developer_game_builds
    where submission_id = any(v_submission_ids)
      and verification_status = 'verified'
    order by array_position(v_submission_ids, submission_id),
             verified_at desc nulls last,
             created_at desc
    limit 1;

    if not found or nullif(v_build.preview_url, '') is null then
      raise exception 'A verified preview build is required for publication' using errcode = '23514';
    end if;

    select public_url into v_cover
    from public.game_media
    where submission_id = any(v_submission_ids) and role = 'cover'
    order by array_position(v_submission_ids, submission_id)
    limit 1;

    select public_url into v_thumbnail
    from public.game_media
    where submission_id = any(v_submission_ids) and role = 'thumbnail'
    order by array_position(v_submission_ids, submission_id)
    limit 1;

    select coalesce(array_agg(public_url order by role), '{}') into v_screenshots
    from (
      select distinct on (role) role, public_url
      from public.game_media
      where submission_id = any(v_submission_ids)
        and role like 'screenshot-%'
      order by role, array_position(v_submission_ids, submission_id)
    ) selected_media;

    if nullif(v_cover, '') is null or nullif(v_thumbnail, '') is null then
      raise exception 'Verified cover and thumbnail artwork are required for publication' using errcode = '23514';
    end if;

    if v_submission.game_id is null then
      if exists(select 1 from public.games where slug = v_submission.slug) then
        raise exception 'The public game slug is already in use' using errcode = '23505';
      end if;

      insert into public.games (
        category_id, title, slug, genre, status, description, cover_url, iframe_url,
        tags, published_at, build_id, build_status, preview_url, thumbnail_url,
        screenshot_urls, desktop_controls, mobile_controls, aspect_ratio, build_metadata
      ) values (
        v_submission.category_id, v_submission.title, v_submission.slug,
        coalesce(v_submission.engine, 'WebGL Game'), 'published', v_submission.full_description,
        v_cover, v_build.preview_url, v_submission.tags, v_now, v_build.id, 'ready',
        v_build.preview_url, v_thumbnail, v_screenshots,
        case when coalesce((v_submission.options->>'keyboard')::boolean, false)
          then to_jsonb(array[coalesce(nullif(v_submission.options->>'controls',''), 'Use the in-game keyboard controls.')])
          else '[]'::jsonb end,
        case when coalesce((v_submission.options->>'touch')::boolean, false)
          then to_jsonb(array[coalesce(nullif(v_submission.options->>'controls',''), 'Use the on-screen touch controls.')])
          else '[]'::jsonb end,
        coalesce(nullif(v_submission.options->>'aspect_ratio',''), '16/9'),
        jsonb_build_object('source','developer_portal','submission_id',v_submission.id,'build_type',v_build.build_type,'compression_mode',v_build.compression_mode,'file_count',v_build.file_count,'total_bytes',v_build.total_bytes)
      ) returning id into v_game_id;
    else
      v_game_id := v_submission.game_id;
      update public.games set
        category_id = v_submission.category_id,
        title = v_submission.title,
        status = 'published',
        description = v_submission.full_description,
        cover_url = v_cover,
        iframe_url = v_build.preview_url,
        tags = v_submission.tags,
        published_at = coalesce(published_at, v_now),
        build_id = v_build.id,
        build_status = 'ready',
        preview_url = v_build.preview_url,
        thumbnail_url = v_thumbnail,
        screenshot_urls = v_screenshots,
        desktop_controls = case when coalesce((v_submission.options->>'keyboard')::boolean, false)
          then to_jsonb(array[coalesce(nullif(v_submission.options->>'controls',''), 'Use the in-game keyboard controls.')])
          else '[]'::jsonb end,
        mobile_controls = case when coalesce((v_submission.options->>'touch')::boolean, false)
          then to_jsonb(array[coalesce(nullif(v_submission.options->>'controls',''), 'Use the on-screen touch controls.')])
          else '[]'::jsonb end,
        aspect_ratio = coalesce(nullif(v_submission.options->>'aspect_ratio',''), '16/9'),
        build_metadata = jsonb_build_object('source','developer_portal','submission_id',v_submission.id,'build_type',v_build.build_type,'compression_mode',v_build.compression_mode,'file_count',v_build.file_count,'total_bytes',v_build.total_bytes)
      where id = v_game_id;

      if not found then
        raise exception 'Linked public game was not found' using errcode = 'P0002';
      end if;

      if v_submission.parent_submission_id is not null then
        update public.game_submissions
        set status = 'archived'
        where game_id = v_game_id and id <> p_submission_id and status = 'published';
      end if;
    end if;
  elsif p_decision = 'unpublished' and v_submission.game_id is not null then
    update public.games set status = 'archived' where id = v_submission.game_id;
  end if;

  insert into public.submission_reviews (submission_id, reviewer_id, decision, developer_feedback, internal_notes, checklist)
  values (p_submission_id, v_actor, p_decision, nullif(trim(coalesce(p_developer_feedback,'')), ''), nullif(trim(coalesce(p_internal_notes,'')), ''), coalesce(p_checklist, '{}'::jsonb));

  update public.game_submissions
  set status = p_decision,
      game_id = case when p_decision = 'published' then v_game_id else game_id end
  where id = p_submission_id;

  insert into public.notifications (user_id, kind, title, body)
  values (v_submission.owner_id, 'submission_' || p_decision, 'Submission ' || replace(p_decision, '_', ' '), coalesce(nullif(trim(coalesce(p_developer_feedback,'')), ''), 'Your submission status changed to ' || replace(p_decision, '_', ' ') || '.'));

  insert into public.audit_events (actor_id, entity_type, entity_id, action, metadata)
  values (v_actor, 'game_submission', p_submission_id, p_decision, jsonb_build_object('previous_status',v_submission.status,'game_id',v_game_id,'revision_number',v_submission.revision_number,'parent_submission_id',v_submission.parent_submission_id));

  return jsonb_build_object('submission_id',p_submission_id,'status',p_decision,'game_id',case when p_decision = 'published' then v_game_id else v_submission.game_id end,'slug',v_submission.slug,'revision_number',v_submission.revision_number);
end;
$$;

revoke all on function public.review_developer_submission(uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.review_developer_submission(uuid,text,text,text,jsonb) to authenticated;
