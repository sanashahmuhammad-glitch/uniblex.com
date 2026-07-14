-- Command/idempotency layer for the WebGL control-plane design.
-- LOCAL DESIGN MIGRATION ONLY. Do not apply until all command finalizers listed
-- below are implemented and independently reviewed.

-- A generic caller-selected transition conflicts with database-owned terminal
-- states. Remove it from the final schema; operations advance only through the
-- narrowly scoped RPCs declared by this migration series.
drop function if exists public.webgl_transition_operation(uuid,bigint,text,text,text,jsonb);

create table if not exists public.webgl_control_commands (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.webgl_publish_operations(id) on delete restrict,
  owner_admin_id uuid not null references public.admins(id) on delete restrict,
  command_type text not null check (command_type in
    ('complete','abort','enqueue_extraction','publish','rollback','unpublish','delete','cleanup')),
  idempotency_key text not null check
    (idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'),
  status text not null default 'pending' check (status in ('pending','running','succeeded','failed')),
  command_version bigint not null default 0 check (command_version >= 0),
  expected_operation_version bigint not null check (expected_operation_version >= 0),
  target_build_id uuid references public.game_builds(id) on delete restrict,
  lease_token_hash text,
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  not_before timestamptz not null default now(),
  terminal_result jsonb,
  sanitized_error_code text,
  sanitized_error_message text check
    (sanitized_error_message is null or length(sanitized_error_message) <= 1000),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (owner_admin_id, operation_id, command_type, idempotency_key)
);

create unique index if not exists webgl_control_commands_one_running_kind_idx
  on public.webgl_control_commands(operation_id,command_type)
  where status in ('pending','running');
create index if not exists webgl_control_commands_dispatch_idx
  on public.webgl_control_commands(status,not_before,lease_expires_at,created_at);

alter table public.webgl_control_commands enable row level security;
revoke all on public.webgl_control_commands from anon, authenticated;
drop policy if exists "Owners can read WebGL commands" on public.webgl_control_commands;
create policy "Owners can read WebGL commands" on public.webgl_control_commands
  for select to authenticated using (public.is_admin() and owner_admin_id=auth.uid());
grant select on public.webgl_control_commands to authenticated;

create or replace function public.webgl_request_command(
  p_owner_admin_id uuid,
  p_operation_id uuid,
  p_command_type text,
  p_idempotency_key text,
  p_target_build_id uuid default null
) returns public.webgl_control_commands
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_op public.webgl_publish_operations%rowtype;
declare v_command public.webgl_control_commands%rowtype;
declare v_allowed boolean := false;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode='42501'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$' then raise exception 'invalid idempotency key' using errcode='22023'; end if;
  select * into v_command from public.webgl_control_commands
    where owner_admin_id=p_owner_admin_id and operation_id=p_operation_id
      and command_type=p_command_type and idempotency_key=p_idempotency_key;
  if found then return v_command; end if;
  select * into v_op from public.webgl_publish_operations
    where id=p_operation_id and owner_admin_id=p_owner_admin_id for update;
  if not found then raise exception 'operation not found' using errcode='P0002'; end if;
  v_allowed := case p_command_type
    when 'complete' then v_op.state='uploading' and p_target_build_id is null
    when 'abort' then v_op.state in ('initiated','uploading') and p_target_build_id is null
    when 'enqueue_extraction' then v_op.state='source_ready' and p_target_build_id is null
    when 'publish' then v_op.state='ready_for_preview' and p_target_build_id is null
    when 'rollback' then v_op.state='published' and p_target_build_id is not null
    when 'unpublish' then v_op.state='published' and p_target_build_id is null
    when 'delete' then v_op.state in ('ready_for_preview','rolled_back','unpublished','failed','aborted') and p_target_build_id is null
    when 'cleanup' then v_op.state='cleanup_pending' and p_target_build_id is null
    else false end;
  if not v_allowed then raise exception 'command is not allowed' using errcode='55000'; end if;
  if p_command_type='rollback' and not exists (
    select 1 from public.game_builds target
      where target.id=p_target_build_id and target.game_id=v_op.game_id
        and target.immutable_build_prefix is not null and target.status in ('published','rolled_back')
  ) then raise exception 'rollback target is not valid' using errcode='23514'; end if;
  if p_command_type='delete' and exists (
    select 1 from public.games g where g.build_id=v_op.build_id
  ) then raise exception 'active build cannot be deleted' using errcode='55000'; end if;
  insert into public.webgl_control_commands(
    operation_id,owner_admin_id,command_type,idempotency_key,
    expected_operation_version,target_build_id
  ) values (
    v_op.id,p_owner_admin_id,p_command_type,p_idempotency_key,
    v_op.state_version,p_target_build_id
  ) returning * into v_command;
  insert into public.webgl_operation_events(
    operation_id,actor_admin_id,actor_type,event_type,from_state,state_version,details
  ) values (
    v_op.id,p_owner_admin_id,'route','command.requested',v_op.state,v_op.state_version,
    jsonb_build_object('command_id',v_command.id,'command_type',v_command.command_type)
  );
  return v_command;
exception when unique_violation then
  select * into v_command from public.webgl_control_commands
    where owner_admin_id=p_owner_admin_id and operation_id=p_operation_id
      and command_type=p_command_type and idempotency_key=p_idempotency_key;
  if found then return v_command; end if;
  raise exception 'another command is already active' using errcode='40001';
end;
$$;

create or replace function public.webgl_claim_command(
  p_command_id uuid,
  p_expected_command_version bigint,
  p_lease_owner text,
  p_lease_token_hash text,
  p_lease_seconds integer default 120
) returns public.webgl_control_commands
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_command public.webgl_control_commands%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode='42501'; end if;
  if p_lease_seconds not between 30 and 900 or length(p_lease_token_hash)<32 then raise exception 'invalid lease' using errcode='22023'; end if;
  select * into v_command from public.webgl_control_commands where id=p_command_id for update;
  if not found then raise exception 'command not found' using errcode='P0002'; end if;
  if v_command.command_version<>p_expected_command_version or
     not (v_command.status='pending' or (v_command.status='running' and v_command.lease_expires_at<now())) then
    raise exception 'command is not claimable' using errcode='40001';
  end if;
  if v_command.attempt_count>=v_command.max_attempts or v_command.not_before>now() then raise exception 'command is not dispatchable' using errcode='55000'; end if;
  update public.webgl_control_commands set status='running',command_version=command_version+1,
    lease_owner=p_lease_owner,lease_token_hash=p_lease_token_hash,
    lease_expires_at=now()+make_interval(secs=>p_lease_seconds),
    attempt_count=attempt_count+1,started_at=coalesce(started_at,now())
    where id=p_command_id returning * into v_command;
  return v_command;
end;
$$;

-- Required narrow finalizers deliberately remain an owner-approval blocker:
-- webgl_finalize_complete(command_id, part_receipt)
-- webgl_finalize_abort(command_id, abort_receipt)
-- webgl_finalize_extraction(command_id, lease_hash, sealed_manifest_receipt)
-- webgl_finalize_publish(command_id, verified_copy_receipt)
-- webgl_finalize_rollback(command_id)
-- webgl_finalize_unpublish(command_id)
-- webgl_finalize_delete(command_id, exact_empty_prefix_receipt)
-- webgl_finalize_cleanup(command_id, exact_source_and_staging_receipt)
-- Each must lock command+operation+game/build, validate its fixed transition and
-- lease, update terminal command result, and write the audit event atomically.

revoke all on function public.webgl_request_command(uuid,uuid,text,text,uuid) from public;
revoke all on function public.webgl_claim_command(uuid,bigint,text,text,integer) from public;
grant execute on function public.webgl_request_command(uuid,uuid,text,text,uuid) to service_role;
grant execute on function public.webgl_claim_command(uuid,bigint,text,text,integer) to service_role;

