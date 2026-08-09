-- Complete the Developer Portal review-to-publication boundary atomically.
-- Existing public games and upload objects are preserved.

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
  v_controls text;
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
    where submission_id = p_submission_id and verification_status = 'verified'
    order by verified_at desc nulls last, created_at desc
    limit 1;

    if not found or nullif(v_build.preview_url, '') is null then
      raise exception 'A verified preview build is required for publication' using errcode = '23514';
    end if;

    select public_url into v_cover
    from public.game_media
    where submission_id = p_submission_id and role = 'cover';

    select public_url into v_thumbnail
    from public.game_media
    where submission_id = p_submission_id and role = 'thumbnail';

    select coalesce(array_agg(public_url order by role), '{}') into v_screenshots
    from public.game_media
    where submission_id = p_submission_id and role like 'screenshot-%';

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
        v_submission.category_id,
        v_submission.title,
        v_submission.slug,
        coalesce(v_submission.engine, 'WebGL Game'),
        'published',
        v_submission.full_description,
        v_cover,
        v_build.preview_url,
        v_submission.tags,
        v_now,
        v_build.id,
        'ready',
        v_build.preview_url,
        v_thumbnail,
        v_screenshots,
        case when coalesce((v_submission.options->>'keyboard')::boolean, false)
          then to_jsonb(array[coalesce(nullif(v_submission.options->>'controls',''), 'Use the in-game keyboard controls.')])
          else '[]'::jsonb end,
        case when coalesce((v_submission.options->>'touch')::boolean, false)
          then to_jsonb(array[coalesce(nullif(v_submission.options->>'controls',''), 'Use the on-screen touch controls.')])
          else '[]'::jsonb end,
        coalesce(nullif(v_submission.options->>'aspect_ratio',''), '16/9'),
        jsonb_build_object(
          'source', 'developer_portal',
          'submission_id', v_submission.id,
          'build_type', v_build.build_type,
          'compression_mode', v_build.compression_mode,
          'file_count', v_build.file_count,
          'total_bytes', v_build.total_bytes
        )
      ) returning id into v_game_id;
    else
      v_game_id := v_submission.game_id;
      update public.games set
        category_id = v_submission.category_id,
        title = v_submission.title,
        genre = coalesce(v_submission.engine, genre, 'WebGL Game'),
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
        aspect_ratio = coalesce(nullif(v_submission.options->>'aspect_ratio',''), '16/9'),
        build_metadata = jsonb_build_object(
          'source', 'developer_portal',
          'submission_id', v_submission.id,
          'build_type', v_build.build_type,
          'compression_mode', v_build.compression_mode,
          'file_count', v_build.file_count,
          'total_bytes', v_build.total_bytes
        )
      where id = v_game_id;

      if not found then
        raise exception 'Linked public game was not found' using errcode = 'P0002';
      end if;
    end if;
  elsif p_decision = 'unpublished' and v_submission.game_id is not null then
    update public.games
    set status = 'archived'
    where id = v_submission.game_id;
  end if;

  insert into public.submission_reviews (
    submission_id, reviewer_id, decision, developer_feedback, internal_notes, checklist
  ) values (
    p_submission_id,
    v_actor,
    p_decision,
    nullif(trim(coalesce(p_developer_feedback,'')), ''),
    nullif(trim(coalesce(p_internal_notes,'')), ''),
    coalesce(p_checklist, '{}'::jsonb)
  );

  update public.game_submissions
  set status = p_decision,
      game_id = case when p_decision = 'published' then v_game_id else game_id end
  where id = p_submission_id;

  insert into public.notifications (user_id, kind, title, body)
  values (
    v_submission.owner_id,
    'submission_' || p_decision,
    'Submission ' || replace(p_decision, '_', ' '),
    coalesce(nullif(trim(coalesce(p_developer_feedback,'')), ''), 'Your submission status changed to ' || replace(p_decision, '_', ' ') || '.')
  );

  insert into public.audit_events (actor_id, entity_type, entity_id, action, metadata)
  values (
    v_actor,
    'game_submission',
    p_submission_id,
    p_decision,
    jsonb_build_object('previous_status', v_submission.status, 'game_id', v_game_id)
  );

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'status', p_decision,
    'game_id', case when p_decision = 'published' then v_game_id else v_submission.game_id end,
    'slug', v_submission.slug
  );
end;
$$;

revoke all on function public.review_developer_submission(uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.review_developer_submission(uuid,text,text,text,jsonb) to authenticated;
