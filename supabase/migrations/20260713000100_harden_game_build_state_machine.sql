-- Forward-only hardening for the quarantined R2 game build pipeline.
-- DO NOT apply until the application and staging Worker are reviewed together.
-- Rollback notes: disable R2_GAME_UPLOADS_ENABLED first; drop the two RPC functions,
-- trigger, operation table, and new columns only after no operation is running.

alter table public.game_builds drop constraint if exists game_builds_status_check;
update public.game_builds b set status = 'published'
from public.games g where g.build_id = b.id and g.status = 'published' and b.status = 'ready';
update public.game_builds set status = 'ready_for_preview' where status = 'ready';
alter table public.game_builds
  add constraint game_builds_status_check check (status in (
    'initiated','uploading','uploaded','extracting','validating','ready_for_preview','previewed',
    'publishing','published','failed','aborted','cleanup_pending','cleanup_failed','deleting','deleted','rolled_back'
  )),
  add column if not exists upload_id text,
  add column if not exists expected_size_bytes bigint,
  add column if not exists expected_part_count integer,
  add column if not exists idempotency_key text,
  add column if not exists state_version bigint not null default 0,
  add column if not exists error_code text,
  add column if not exists source_zip_checksum text,
  add column if not exists extracted_manifest_checksum text,
  add column if not exists previous_build_id uuid references public.game_builds(id) on delete set null,
  add column if not exists extraction_started_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.games drop constraint if exists games_build_status_check;
update public.games set build_status = 'published' where build_status = 'ready' and status = 'published';
update public.games set build_status = 'ready_for_preview' where build_status = 'ready';
alter table public.games add constraint games_build_status_check check (build_status in (
  'none','initiated','uploading','uploaded','extracting','validating','ready_for_preview','previewed',
  'publishing','published','failed','aborted','cleanup_pending','cleanup_failed','deleting','deleted','rolled_back'
));
create table if not exists public.game_build_operations (
  id uuid primary key default gen_random_uuid(),
  build_id uuid references public.game_builds(id) on delete set null,
  build_id_snapshot uuid not null,
  game_id uuid references public.games(id) on delete set null,
  operation text not null check (operation in ('complete','abort','extract','publish','rollback','delete')),
  idempotency_key text not null,
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  requested_by uuid not null references public.admins(id) on delete restrict,
  from_state text not null,
  claimed_state text not null,
  final_state text,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (build_id_snapshot, operation, idempotency_key)
);

create unique index if not exists game_build_operations_one_running_idx
on public.game_build_operations (build_id_snapshot) where status = 'running';

alter table public.game_build_operations enable row level security;
create policy "Admins can read owned build operations" on public.game_build_operations
for select to authenticated using (public.is_admin() and requested_by = auth.uid());

create or replace function public.is_valid_game_build_transition(from_state text, to_state text)
returns boolean language sql immutable as $$
  select from_state = to_state or case from_state
    when 'initiated' then to_state in ('uploading','aborted','failed')
    when 'uploading' then to_state in ('uploaded','aborted','failed')
    when 'uploaded' then to_state in ('extracting','cleanup_pending','failed')
    when 'extracting' then to_state in ('validating','cleanup_pending','failed')
    when 'validating' then to_state in ('ready_for_preview','cleanup_pending','failed')
    when 'ready_for_preview' then to_state in ('previewed','publishing','deleting','failed')
    when 'previewed' then to_state in ('publishing','deleting','failed')
    when 'publishing' then to_state in ('published','ready_for_preview','failed')
    when 'published' then to_state in ('rolled_back','deleting','failed')
    when 'failed' then to_state in ('cleanup_pending','deleting')
    when 'aborted' then to_state in ('cleanup_pending','deleting')
    when 'cleanup_pending' then to_state in ('failed','aborted','deleted','cleanup_failed')
    when 'cleanup_failed' then to_state in ('cleanup_pending','deleting')
    when 'deleting' then to_state in ('deleted','cleanup_failed')
    when 'rolled_back' then to_state in ('published','publishing','deleting')
    else false end;
$$;

create or replace function public.enforce_game_build_transition()
returns trigger language plpgsql as $$
begin
  if not public.is_valid_game_build_transition(old.status, new.status) then
    raise exception 'invalid game build transition' using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status then new.state_version := old.state_version + 1; end if;
  return new;
end;
$$;

drop trigger if exists enforce_game_build_transition on public.game_builds;
create trigger enforce_game_build_transition before update of status on public.game_builds
for each row execute function public.enforce_game_build_transition();

create or replace function public.claim_game_build_operation(
  p_build_id uuid, p_operation text, p_idempotency_key text, p_target_state text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  build_row public.game_builds%rowtype;
  existing public.game_build_operations%rowtype;
  operation_id uuid;
  allowed boolean;
begin
  if not public.is_admin() or length(p_idempotency_key) < 16 then raise exception 'unauthorized or invalid operation'; end if;
  select * into existing from public.game_build_operations
    where build_id_snapshot = p_build_id and operation = p_operation and idempotency_key = p_idempotency_key and requested_by = auth.uid();  if found then
    return jsonb_build_object('operation_id', existing.id, 'replayed', true, 'state', coalesce(existing.final_state, existing.claimed_state), 'status', existing.status);
  end if;
  select * into build_row from public.game_builds where id = p_build_id and created_by = auth.uid() for update;
  if not found then raise exception 'build not found'; end if;
  select * into existing from public.game_build_operations
    where build_id_snapshot = p_build_id and operation = p_operation and idempotency_key = p_idempotency_key and requested_by = auth.uid();
  if found then
    return jsonb_build_object('operation_id', existing.id, 'replayed', true, 'state', coalesce(existing.final_state, existing.claimed_state), 'status', existing.status);
  end if;


  allowed := case p_operation
    when 'complete' then build_row.status = 'uploading' and p_target_state = 'uploaded'
    when 'abort' then build_row.status in ('initiated','uploading') and p_target_state = 'aborted'
    when 'extract' then build_row.status = 'uploaded' and p_target_state = 'extracting'
    when 'publish' then build_row.status in ('ready_for_preview','previewed','rolled_back') and p_target_state = 'publishing'
    when 'rollback' then build_row.status = 'published' and p_target_state = 'rolled_back'
    when 'delete' then build_row.status in ('ready_for_preview','previewed','published','rolled_back','failed','aborted','cleanup_failed') and p_target_state = 'deleting'
    else false end;
  if not allowed or not public.is_valid_game_build_transition(build_row.status, p_target_state) then raise exception 'operation is not allowed from current state'; end if;
  insert into public.game_build_operations(build_id,build_id_snapshot,game_id,operation,idempotency_key,requested_by,from_state,claimed_state)
  values(build_row.id,build_row.id,build_row.game_id,p_operation,p_idempotency_key,auth.uid(),build_row.status,p_target_state)
  returning id into operation_id;
  update public.game_builds set status = p_target_state where id = p_build_id;
  return jsonb_build_object('operation_id', operation_id, 'replayed', false, 'state', p_target_state, 'status', 'running');
exception when unique_violation then
  raise exception 'another build operation is already running';
end;
$$;

create or replace function public.finish_game_build_operation(
  p_operation_id uuid, p_status text, p_final_state text, p_error_code text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare op public.game_build_operations%rowtype; current_state text;
begin
  if not public.is_admin() or p_status not in ('succeeded','failed') then raise exception 'unauthorized or invalid operation'; end if;
  select * into op from public.game_build_operations where id = p_operation_id and requested_by = auth.uid() for update;
  if not found then raise exception 'operation not found'; end if;
  if op.status <> 'running' then return jsonb_build_object('operation_id', op.id, 'replayed', true, 'state', op.final_state, 'status', op.status); end if;
  select status into current_state from public.game_builds where id = op.build_id for update;
  if op.operation = 'delete' and op.build_id is null and p_status = 'succeeded' and p_final_state = 'deleted' then
    update public.game_build_operations set status = 'succeeded', final_state = 'deleted', completed_at = now() where id = op.id;
    return jsonb_build_object('operation_id', op.id, 'replayed', false, 'state', 'deleted', 'status', 'succeeded');
  end if;
  if p_final_state = 'cleanup_failed' and current_state in ('uploaded','extracting','validating') then
    update public.game_builds set status = 'cleanup_pending' where id = op.build_id;
    current_state := 'cleanup_pending';
  end if;
  if op.operation = 'extract' and p_status = 'succeeded' then
    update public.game_builds set status = 'validating' where id = op.build_id;
    current_state := 'validating';
  end if;
  if not public.is_valid_game_build_transition(current_state, p_final_state) then raise exception 'invalid operation final state'; end if;
  update public.game_builds set status = p_final_state, error_code = p_error_code where id = op.build_id;
  update public.game_build_operations set status = p_status, final_state = p_final_state, error_code = p_error_code, completed_at = now() where id = op.id;
  return jsonb_build_object('operation_id', op.id, 'replayed', false, 'state', p_final_state, 'status', p_status);
end;
$$;

revoke all on function public.claim_game_build_operation(uuid,text,text,text) from public;
revoke all on function public.finish_game_build_operation(uuid,text,text,text) from public;
grant execute on function public.claim_game_build_operation(uuid,text,text,text) to authenticated;
grant execute on function public.finish_game_build_operation(uuid,text,text,text) to authenticated;
