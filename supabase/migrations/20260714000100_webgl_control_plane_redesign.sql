-- Forward-only control-plane redesign for quarantined WebGL publishing.
-- LOCAL DESIGN ARTIFACT ONLY. Do not apply before staging review and route cutover.
--
-- Rollback notes (only while R2_GAME_UPLOADS_ENABLED is disabled): revoke the
-- RPCs, then drop webgl_operation_events and webgl_publish_operations. Columns
-- added to game_builds may be retained harmlessly. Never drop operation records
-- while a lease is active or cleanup is pending.

alter table public.game_builds
  add column if not exists operation_id uuid,
  add column if not exists source_zip_checksum_v2 text,
  add column if not exists extracted_manifest_checksum_v2 text,
  add column if not exists immutable_build_prefix text,
  add column if not exists activation_version bigint not null default 0;

create table if not exists public.webgl_publish_operations (
  id uuid primary key default gen_random_uuid(),
  operation_kind text not null check (operation_kind in
    ('upload','extract','preview','publish','rollback','unpublish','delete','cleanup')),
  state text not null check (state in
    ('initiated','uploading','source_ready','queued','leased','extracting','validating',
     'ready_for_preview','publishing','published','rollback_pending','rolled_back',
     'unpublish_pending','unpublished','delete_pending','cleanup_pending',
     'cleanup_running','failed','aborted','deleted')),
  state_version bigint not null default 0 check (state_version >= 0),
  owner_admin_id uuid not null references public.admins(id) on delete restrict,
  game_id uuid references public.games(id) on delete restrict,
  build_id uuid references public.game_builds(id) on delete restrict,
  idempotency_key text not null check
    (length(idempotency_key) between 16 and 128 and idempotency_key !~ '[[:space:]]'),

  -- Immutable authority binding. Clients receive only the operation id; routes
  -- obtain all other identifiers from this row while holding a row lock.
  source_bucket text not null,
  source_object_key text not null,
  staging_prefix text not null,
  destination_prefix text,
  multipart_upload_id text,
  expected_size_bytes bigint not null check (expected_size_bytes > 0),
  expected_part_count integer not null check (expected_part_count between 1 and 10000),
  completed_part_count integer not null default 0 check (completed_part_count >= 0),
  source_etag text,
  source_checksum text,
  manifest_checksum text,
  manifest jsonb,

  -- Durable work ownership. A crashed consumer loses its lease and can be
  -- reclaimed; the state_version compare-and-set prevents stale completion.
  lease_token_hash text,
  lease_owner text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  cleanup_attempt_count integer not null default 0 check (cleanup_attempt_count >= 0),

  publish_receipt jsonb,
  cleanup_receipt jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_ready_at timestamptz,
  extraction_completed_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,

  unique (owner_admin_id, operation_kind, idempotency_key),
  unique (source_bucket, source_object_key),
  unique (source_bucket, staging_prefix),
  check (source_object_key like 'staging-webgl-uploads/%'),
  check (staging_prefix like 'staging-webgl-uploads/%'),
  check (destination_prefix is null or destination_prefix like 'games/%/builds/%/'),
  check (right(staging_prefix, 1) = '/'),
  check (destination_prefix is null or right(destination_prefix, 1) = '/'),
  check (source_object_key not like '%..%' and staging_prefix not like '%..%'),
  check (error_message is null or length(error_message) <= 1000)
);

create unique index if not exists webgl_publish_operations_build_active_idx
  on public.webgl_publish_operations (build_id)
  where build_id is not null and state not in ('failed','aborted','deleted','rolled_back','unpublished');
create index if not exists webgl_publish_operations_queue_idx
  on public.webgl_publish_operations (state, lease_expires_at, created_at);
create index if not exists webgl_publish_operations_owner_idx
  on public.webgl_publish_operations (owner_admin_id, created_at desc);

create table if not exists public.webgl_operation_events (
  id bigint generated always as identity primary key,
  operation_id uuid not null references public.webgl_publish_operations(id) on delete restrict,
  actor_admin_id uuid references public.admins(id) on delete restrict,
  actor_type text not null check (actor_type in ('admin','route','workflow','container','database')),
  event_type text not null,
  from_state text,
  to_state text,
  state_version bigint not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists webgl_operation_events_operation_idx
  on public.webgl_operation_events (operation_id, id);

alter table public.webgl_publish_operations enable row level security;
alter table public.webgl_operation_events enable row level security;

revoke all on public.webgl_publish_operations from anon, authenticated;
revoke all on public.webgl_operation_events from anon, authenticated;

drop policy if exists "Owners can read WebGL operations" on public.webgl_publish_operations;
create policy "Owners can read WebGL operations"
  on public.webgl_publish_operations for select to authenticated
  using (public.is_admin() and owner_admin_id = auth.uid());

drop policy if exists "Owners can read WebGL operation events" on public.webgl_operation_events;
create policy "Owners can read WebGL operation events"
  on public.webgl_operation_events for select to authenticated
  using (
    public.is_admin() and exists (
      select 1 from public.webgl_publish_operations o
      where o.id = operation_id and o.owner_admin_id = auth.uid()
    )
  );

grant select on public.webgl_publish_operations to authenticated;
grant select on public.webgl_operation_events to authenticated;

create or replace function public.webgl_valid_transition(p_from text, p_to text)
returns boolean language sql immutable strict as $$
  select case p_from
    when 'initiated' then p_to in ('uploading','aborted','failed')
    when 'uploading' then p_to in ('source_ready','aborted','failed')
    when 'source_ready' then p_to in ('queued','cleanup_pending','failed')
    when 'queued' then p_to in ('leased','cleanup_pending','failed')
    when 'leased' then p_to in ('extracting','queued','cleanup_pending','failed')
    when 'extracting' then p_to in ('validating','queued','cleanup_pending','failed')
    when 'validating' then p_to in ('ready_for_preview','cleanup_pending','failed')
    when 'ready_for_preview' then p_to in ('publishing','delete_pending','cleanup_pending')
    when 'publishing' then p_to in ('published','ready_for_preview','cleanup_pending','failed')
    when 'published' then p_to in ('rollback_pending','unpublish_pending','delete_pending')
    when 'rollback_pending' then p_to in ('rolled_back','published','failed')
    when 'rolled_back' then p_to in ('publishing','delete_pending','cleanup_pending')
    when 'unpublish_pending' then p_to in ('unpublished','published','failed')
    when 'unpublished' then p_to in ('publishing','delete_pending','cleanup_pending')
    when 'delete_pending' then p_to in ('cleanup_pending','deleted','failed')
    when 'cleanup_pending' then p_to in ('cleanup_running','failed')
    when 'cleanup_running' then p_to in ('deleted','cleanup_pending','failed')
    when 'failed' then p_to in ('queued','cleanup_pending','delete_pending')
    when 'aborted' then p_to in ('cleanup_pending','deleted')
    else false end;
$$;

create or replace function public.webgl_transition_operation(
  p_operation_id uuid,
  p_expected_version bigint,
  p_to_state text,
  p_actor_type text,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
) returns public.webgl_publish_operations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before public.webgl_publish_operations%rowtype;
declare v_after public.webgl_publish_operations%rowtype;
begin
  if current_user not in ('service_role','postgres') then
    raise exception 'service authority required' using errcode = '42501';
  end if;
  if p_actor_type not in ('route','workflow','container','database') then
    raise exception 'invalid actor type' using errcode = '22023';
  end if;
  select * into v_before from public.webgl_publish_operations
    where id = p_operation_id for update;
  if not found then raise exception 'operation not found' using errcode = 'P0002'; end if;
  if v_before.state_version <> p_expected_version then
    raise exception 'stale operation version' using errcode = '40001';
  end if;
  if not public.webgl_valid_transition(v_before.state, p_to_state) then
    raise exception 'invalid operation transition' using errcode = '23514';
  end if;
  update public.webgl_publish_operations set
    state = p_to_state,
    state_version = state_version + 1,
    updated_at = now()
  where id = p_operation_id returning * into v_after;
  insert into public.webgl_operation_events
    (operation_id, actor_type, event_type, from_state, to_state, state_version, details)
  values (v_after.id, p_actor_type, p_event_type, v_before.state, v_after.state,
          v_after.state_version, coalesce(p_details, '{}'::jsonb));
  return v_after;
end;
$$;

create or replace function public.webgl_claim_extraction(
  p_operation_id uuid,
  p_expected_version bigint,
  p_lease_owner text,
  p_lease_token_hash text,
  p_lease_seconds integer default 120
) returns public.webgl_publish_operations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.webgl_publish_operations%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode = '42501'; end if;
  if p_lease_seconds not between 30 and 900 or length(p_lease_token_hash) < 32 then raise exception 'invalid lease' using errcode = '22023'; end if;
  select * into v_row from public.webgl_publish_operations where id = p_operation_id for update;
  if not found then raise exception 'operation not found' using errcode = 'P0002'; end if;
  if v_row.state_version <> p_expected_version then raise exception 'stale operation version' using errcode = '40001'; end if;
  if not (v_row.state = 'queued' or (v_row.state in ('leased','extracting') and v_row.lease_expires_at < now())) then
    raise exception 'operation is not claimable' using errcode = '55000';
  end if;
  if v_row.attempt_count >= v_row.max_attempts then raise exception 'attempt limit reached' using errcode = '54000'; end if;
  update public.webgl_publish_operations set
    state = 'leased', state_version = state_version + 1,
    lease_owner = p_lease_owner, lease_token_hash = p_lease_token_hash,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    heartbeat_at = now(), attempt_count = attempt_count + 1, updated_at = now()
  where id = p_operation_id returning * into v_row;
  insert into public.webgl_operation_events(operation_id,actor_type,event_type,from_state,to_state,state_version,details)
  values(v_row.id,'workflow','extraction.claimed','queued','leased',v_row.state_version,
         jsonb_build_object('attempt',v_row.attempt_count));
  return v_row;
end;
$$;

create or replace function public.webgl_record_extraction_success(
  p_operation_id uuid,
  p_expected_version bigint,
  p_lease_token_hash text,
  p_manifest_checksum text,
  p_manifest jsonb
) returns public.webgl_publish_operations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.webgl_publish_operations%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode = '42501'; end if;
  select * into v_row from public.webgl_publish_operations where id = p_operation_id for update;
  if not found then raise exception 'operation not found' using errcode = 'P0002'; end if;
  if v_row.state_version <> p_expected_version or v_row.state not in ('leased','extracting','validating') then raise exception 'stale extraction result' using errcode = '40001'; end if;
  if v_row.lease_token_hash is distinct from p_lease_token_hash or v_row.lease_expires_at < now() then raise exception 'invalid extraction lease' using errcode = '42501'; end if;
  if p_manifest_checksum is null or length(p_manifest_checksum) < 32 or p_manifest is null then raise exception 'missing extraction evidence' using errcode = '23514'; end if;
  update public.webgl_publish_operations set
    state = 'ready_for_preview', state_version = state_version + 1,
    manifest_checksum = p_manifest_checksum, manifest = p_manifest,
    extraction_completed_at = now(), lease_token_hash = null, lease_owner = null,
    lease_expires_at = null, heartbeat_at = null, updated_at = now()
  where id = p_operation_id returning * into v_row;
  update public.game_builds set extracted_manifest_checksum_v2 = p_manifest_checksum
    where id = v_row.build_id and operation_id = v_row.id;
  insert into public.webgl_operation_events(operation_id,actor_type,event_type,from_state,to_state,state_version,details)
  values(v_row.id,'container','extraction.succeeded','validating','ready_for_preview',v_row.state_version,
         jsonb_build_object('manifest_checksum',p_manifest_checksum));
  return v_row;
end;
$$;

-- Activation is intentionally a separate transaction after object-copy
-- verification. It changes only database pointers; R2 work cannot occur inside
-- PostgreSQL and must be represented by a validated, immutable receipt.
create or replace function public.webgl_activate_build(
  p_operation_id uuid,
  p_expected_version bigint,
  p_publish_receipt jsonb
) returns public.webgl_publish_operations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_publish_operations%rowtype;
declare v_game public.games%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode = '42501'; end if;
  select * into v_op from public.webgl_publish_operations where id = p_operation_id for update;
  if not found then raise exception 'operation not found' using errcode = 'P0002'; end if;
  if v_op.state <> 'publishing' or v_op.state_version <> p_expected_version then raise exception 'stale publish operation' using errcode = '40001'; end if;
  if v_op.build_id is null or v_op.game_id is null or v_op.destination_prefix is null or
     v_op.manifest_checksum is null or p_publish_receipt is null or
     p_publish_receipt->>'destination_prefix' is distinct from v_op.destination_prefix or
     p_publish_receipt->>'manifest_checksum' is distinct from v_op.manifest_checksum or
     p_publish_receipt->>'verified' <> 'true' then
    raise exception 'publish evidence does not match operation authority' using errcode = '23514';
  end if;
  select * into v_game from public.games where id = v_op.game_id for update;
  if not found then raise exception 'game not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.game_builds where immutable_build_prefix = v_op.destination_prefix and id <> v_op.build_id) then
    raise exception 'destination prefix is already owned' using errcode = '23505';
  end if;
  update public.game_builds set immutable_build_prefix = v_op.destination_prefix,
    activation_version = activation_version + 1 where id = v_op.build_id and operation_id = v_op.id;
  if not found then raise exception 'build binding mismatch' using errcode = '23514'; end if;
  update public.games set build_id = v_op.build_id, r2_build_prefix = v_op.destination_prefix,
    build_status = 'published', status = 'published' where id = v_op.game_id;
  update public.webgl_publish_operations set state = 'published', state_version = state_version + 1,
    publish_receipt = p_publish_receipt, activated_at = now(), completed_at = now(), updated_at = now()
    where id = v_op.id returning * into v_op;
  insert into public.webgl_operation_events(operation_id,actor_type,event_type,from_state,to_state,state_version,details)
  values(v_op.id,'database','build.activated','publishing','published',v_op.state_version,
         jsonb_build_object('game_id',v_op.game_id,'build_id',v_op.build_id));
  return v_op;
end;
$$;

revoke all on function public.webgl_valid_transition(text,text) from public;
revoke all on function public.webgl_transition_operation(uuid,bigint,text,text,text,jsonb) from public;
revoke all on function public.webgl_claim_extraction(uuid,bigint,text,text,integer) from public;
revoke all on function public.webgl_record_extraction_success(uuid,bigint,text,text,jsonb) from public;
revoke all on function public.webgl_activate_build(uuid,bigint,jsonb) from public;
grant execute on function public.webgl_valid_transition(text,text) to service_role;
grant execute on function public.webgl_transition_operation(uuid,bigint,text,text,text,jsonb) to service_role;
grant execute on function public.webgl_claim_extraction(uuid,bigint,text,text,integer) to service_role;
grant execute on function public.webgl_record_extraction_success(uuid,bigint,text,text,jsonb) to service_role;
grant execute on function public.webgl_activate_build(uuid,bigint,jsonb) to service_role;

comment on table public.webgl_publish_operations is
  'Authoritative, service-written WebGL operation ledger. Never expose multipart ids, lease hashes, or receipts through public APIs.';
