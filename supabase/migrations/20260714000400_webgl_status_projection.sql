-- Remove direct access to internal operation/command rows. Owner status is a
-- narrow projection so multipart identities, keys, leases, and receipts cannot
-- reach the browser. LOCAL DESIGN MIGRATION ONLY; do not apply.

revoke select on public.webgl_publish_operations from authenticated;
revoke select on public.webgl_operation_events from authenticated;
revoke select on public.webgl_control_commands from authenticated;

create or replace function public.webgl_get_operation_status(p_operation_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_op public.webgl_publish_operations%rowtype;
declare v_latest public.webgl_control_commands%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not found' using errcode='P0002';
  end if;
  select * into v_op from public.webgl_publish_operations
    where id=p_operation_id and owner_admin_id=auth.uid();
  if not found then raise exception 'not found' using errcode='P0002'; end if;
  select * into v_latest from public.webgl_control_commands
    where operation_id=v_op.id and owner_admin_id=auth.uid()
    order by created_at desc limit 1;
  return jsonb_strip_nulls(jsonb_build_object(
    'operationId',v_op.id,
    'buildId',v_op.build_id,
    'gameId',v_op.game_id,
    'state',v_op.state,
    'stateVersion',v_op.state_version,
    'expectedBytes',v_op.expected_size_bytes,
    'completedParts',v_op.completed_part_count,
    'expectedParts',v_op.expected_part_count,
    'attemptCount',v_op.attempt_count,
    'errorCode',v_op.error_code,
    'errorMessage',v_op.error_message,
    'createdAt',v_op.created_at,
    'updatedAt',v_op.updated_at,
    'completedAt',v_op.completed_at,
    'latestCommand',case when v_latest.id is null then null else jsonb_build_object(
      'id',v_latest.id,
      'type',v_latest.command_type,
      'status',v_latest.status,
      'attemptCount',v_latest.attempt_count,
      'errorCode',v_latest.sanitized_error_code,
      'errorMessage',v_latest.sanitized_error_message,
      'createdAt',v_latest.created_at,
      'completedAt',v_latest.completed_at
    ) end
  ));
end;
$$;

revoke all on function public.webgl_get_operation_status(uuid) from public;
grant execute on function public.webgl_get_operation_status(uuid) to authenticated;

