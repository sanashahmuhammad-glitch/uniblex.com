begin;
-- Safe defaults: legacy games remain non-monetized; existing publication is untouched.
alter table public.game_submissions add column monetization jsonb not null default '{"mode":"none","provider":"","formats":[],"externalDestinations":false,"notes":"","policyVersion":null}'::jsonb;
alter table public.games add column monetization_mode text not null default 'none' check (monetization_mode in ('none','developer_ads','uniblex_ads','hybrid'));
alter table public.game_submissions add constraint monetization_shape check (
  jsonb_typeof(monetization) = 'object' and monetization->>'mode' in ('none','developer_ads','uniblex_ads','hybrid')
  and octet_length(monetization::text) <= 12000
);
create table public.build_security_scans (
  build_id uuid primary key references public.developer_game_builds(id) on delete cascade,
  status text not null check (status in ('pending','flagged','approved','rejected')),
  findings jsonb not null default '[]',
  scanner_version text not null,
  scanned_at timestamptz not null default now(),
  reviewed_by uuid references public.admins(id),
  reviewed_at timestamptz,
  check (jsonb_typeof(findings) = 'array')
);
create index build_security_scans_reviewed_by_idx on public.build_security_scans(reviewed_by);
alter table public.build_security_scans enable row level security;
revoke all on public.build_security_scans from public, anon, authenticated;
grant select on public.build_security_scans to authenticated;
grant all on public.build_security_scans to service_role;
create policy "Reviewers read security scans" on public.build_security_scans for select to authenticated using (public.is_portal_reviewer());

-- Server endpoints verify identity and ownership. Clients may not fabricate verification,
-- publication state, asset URLs, or release-parent links through PostgREST.
revoke insert, update, delete on public.game_submissions, public.game_media, public.developer_game_builds from anon, authenticated;
grant select on public.game_submissions, public.game_media, public.developer_game_builds to authenticated;
grant all on public.game_submissions, public.game_media, public.developer_game_builds to service_role;

create or replace function public.guard_release_asset_mutation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare v_status text; v_owner uuid;
begin
  select status, owner_id into v_status, v_owner from public.game_submissions where id = new.submission_id for update;
  if v_status is null or v_status not in ('draft','uploading','upload_failed','verification_pending','verification_failed','ready_for_review','changes_requested','rejected') or v_owner <> new.owner_id then
    raise exception 'Reviewed release assets are immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_release_asset_mutation() from public, anon, authenticated;
create trigger guard_release_build before insert or update on public.developer_game_builds for each row execute function public.guard_release_asset_mutation();
create trigger guard_release_media before insert or update on public.game_media for each row execute function public.guard_release_asset_mutation();

create or replace function public.sync_game_monetization() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'published' and new.game_id is not null then
    update public.games set monetization_mode = new.monetization->>'mode' where id = new.game_id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_game_monetization() from public, anon, authenticated;
create trigger sync_game_monetization after insert or update on public.game_submissions for each row execute function public.sync_game_monetization();

-- Preserve the current publication implementation, adding gates inside its row lock.
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.review_developer_submission(uuid,text,text,text,jsonb)'::regprocedure);
  if position('if v_role not in' in definition) = 0 or position('if p_decision = ''published'' then' in definition) = 0 then
    raise exception 'Review function changed; re-audit migration before applying';
  end if;
  definition := replace(definition, 'if v_role not in', 'if v_role is null or v_role not in');
  definition := replace(definition, 'if p_decision = ''published'' then', $gate$
  if p_decision in ('approved','published') then
    if coalesce((p_checklist->>'monetization')::boolean, false) is not true then
      raise exception 'Advertising disclosure and scan review are required';
    end if;
    if v_submission.monetization->>'mode' <> 'none' and (
      v_submission.monetization->>'policyVersion' is distinct from '2026-09-06'
      or jsonb_array_length(coalesce(v_submission.monetization->'formats','[]')) = 0
      or (v_submission.monetization->>'mode' in ('developer_ads','hybrid') and nullif(trim(v_submission.monetization->>'provider'),'') is null)
    ) then raise exception 'Current advertising policy acceptance and disclosure are required'; end if;
    select * into v_build from public.developer_game_builds
      where submission_id = any(v_submission_ids) and verification_status = 'verified'
      order by array_position(v_submission_ids,submission_id),verified_at desc nulls last,created_at desc limit 1;
    if not found or not exists(select 1 from public.build_security_scans where build_id=v_build.id and status in ('pending','flagged','approved')) then
      raise exception 'A server security scan is required before approval';
    end if;
    if exists(select 1 from public.build_security_scans where build_id=v_build.id and status='flagged') and nullif(trim(coalesce(p_internal_notes,'')),'') is null then
      raise exception 'Explain the manual resolution of flagged scan findings';
    end if;
    update public.build_security_scans set status='approved',reviewed_by=v_actor,reviewed_at=now() where build_id=v_build.id;
  end if;
  if p_decision = 'published' then
  $gate$);
  execute definition;
end;
$migration$;
create table public.sdk_event_buckets (
  game_id uuid not null references public.games(id) on delete cascade,
  minute timestamptz not null,
  event_count integer not null default 0,
  primary key (game_id, minute)
);
create table public.sdk_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  session_id uuid not null,
  event text not null check (event in ('sdk_init','game_loading_start','game_loading_stop','game_ready','gameplay_start','gameplay_stop','ad_request','ad_available','ad_started','ad_completed','ad_skipped','ad_failed','ad_blocked','ad_closed')),
  placement text check (placement is null or placement ~ '^[a-zA-Z0-9_-]{1,80}$'),
  ad_type text check (ad_type is null or ad_type in ('interstitial','rewarded')),
  sdk_version text not null default '2.0.0',
  trust_level text not null default 'unverified_browser' check (trust_level='unverified_browser'),
  created_at timestamptz not null default now()
);
create index sdk_events_game_created_idx on public.sdk_events(game_id,created_at);
create index sdk_events_game_session_created_idx on public.sdk_events(game_id,session_id,created_at);
alter table public.sdk_events enable row level security;
alter table public.sdk_event_buckets enable row level security;
revoke all on public.sdk_events, public.sdk_event_buckets from public, anon, authenticated;
grant all on public.sdk_events, public.sdk_event_buckets to service_role;
grant usage on sequence public.sdk_events_id_seq to service_role;
create or replace function public.record_sdk_events(p_slug text, p_session uuid, p_events jsonb) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_game uuid; v_count integer; v_used integer;
begin
  if jsonb_typeof(p_events) <> 'array' then raise exception 'Invalid events'; end if;
  v_count := jsonb_array_length(p_events);
  if v_count < 1 or v_count > 20 then raise exception 'Invalid event count'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_events) item
    where item->>'event' not in ('sdk_init','game_loading_start','game_loading_stop','game_ready','gameplay_start','gameplay_stop','ad_request','ad_available','ad_started','ad_completed','ad_skipped','ad_failed','ad_blocked','ad_closed')
      or (item ? 'placement' and coalesce(item->>'placement','') !~ '^[a-zA-Z0-9_-]{1,80}$')
      or (item ? 'ad_type' and item->>'ad_type' not in ('interstitial','rewarded'))
  ) then raise exception 'Invalid event payload'; end if;
  select id into v_game from public.games where slug=p_slug and status='published';
  if v_game is null then raise exception 'Unknown game'; end if;
  insert into public.sdk_event_buckets(game_id,minute,event_count) values(v_game,date_trunc('minute',now()),v_count)
    on conflict(game_id,minute) do update set event_count=sdk_event_buckets.event_count+excluded.event_count returning event_count into v_used;
  if v_used > 1200 then raise exception 'Event budget exceeded'; end if;
  if (select count(*) from public.sdk_events where game_id=v_game and session_id=p_session and created_at>now()-interval '1 minute')+v_count>120 then raise exception 'Session budget exceeded'; end if;
  insert into public.sdk_events(game_id,session_id,event,placement,ad_type)
  select v_game,p_session,item->>'event',item->>'placement',item->>'ad_type' from jsonb_array_elements(p_events) item;
end;
$$;
revoke all on function public.record_sdk_events(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_sdk_events(text,uuid,jsonb) to service_role;
commit;
