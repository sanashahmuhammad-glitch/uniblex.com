-- Authority and immutable-binding enforcement for the WebGL control plane.
-- LOCAL ONLY. Apply after 20260714000100 only in an approved isolated staging DB.

drop policy if exists "Admins can create game builds" on public.game_builds;
drop policy if exists "Admins can update game builds" on public.game_builds;
drop policy if exists "Admins can delete game builds" on public.game_builds;
revoke execute on function public.claim_game_build_operation(uuid,text,text,text) from authenticated;
revoke execute on function public.finish_game_build_operation(uuid,text,text,text) from authenticated;

create unique index if not exists game_builds_operation_id_idx
  on public.game_builds (operation_id) where operation_id is not null;
alter table public.game_builds drop constraint if exists game_builds_operation_id_fkey;
alter table public.game_builds add constraint game_builds_operation_id_fkey
  foreign key (operation_id) references public.webgl_publish_operations(id) on delete restrict
  deferrable initially deferred;

create or replace function public.webgl_enforce_immutable_operation_binding()
returns trigger language plpgsql as $$
begin
  if new.owner_admin_id is distinct from old.owner_admin_id or
     new.game_id is distinct from old.game_id or
     (old.build_id is not null and new.build_id is distinct from old.build_id) or
     new.source_bucket is distinct from old.source_bucket or
     new.source_object_key is distinct from old.source_object_key or
     new.staging_prefix is distinct from old.staging_prefix or
     new.destination_prefix is distinct from old.destination_prefix or
     new.expected_size_bytes is distinct from old.expected_size_bytes or
     new.expected_part_count is distinct from old.expected_part_count or
     new.idempotency_key is distinct from old.idempotency_key then
    raise exception 'immutable operation binding cannot change' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists webgl_enforce_immutable_operation_binding on public.webgl_publish_operations;
create trigger webgl_enforce_immutable_operation_binding
  before update on public.webgl_publish_operations for each row
  execute function public.webgl_enforce_immutable_operation_binding();

create or replace function public.webgl_create_upload_operation(
  p_owner_admin_id uuid,
  p_game_id uuid,
  p_slug text,
  p_version integer,
  p_source_bucket text,
  p_expected_size_bytes bigint,
  p_expected_part_count integer,
  p_idempotency_key text
) returns public.webgl_publish_operations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_operation_id uuid := gen_random_uuid();
declare v_build_id uuid := gen_random_uuid();
declare v_op public.webgl_publish_operations%rowtype;
declare v_source_key text;
declare v_staging_prefix text;
declare v_destination_prefix text;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode = '42501'; end if;
  if not exists (select 1 from public.admins where id = p_owner_admin_id) then raise exception 'admin not found' using errcode = 'P0002'; end if;
  if p_game_id is not null and not exists (select 1 from public.games where id = p_game_id) then raise exception 'game not found' using errcode = 'P0002'; end if;
  if p_slug !~ '^test-webgl-[a-z0-9]+(-[a-z0-9]+)*$' or p_version < 1 or
     p_expected_size_bytes not between 1 and 2147483648 or
     p_expected_part_count not between 1 and 10000 or
     p_source_bucket is null or length(p_source_bucket) not between 3 and 255 or
     p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$' then
    raise exception 'invalid upload operation input' using errcode = '22023';
  end if;
  v_source_key := 'staging-webgl-uploads/' || v_operation_id || '/source.zip';
  v_staging_prefix := 'staging-webgl-uploads/' || v_operation_id || '/extracted/';
  v_destination_prefix := 'games/' || p_slug || '/builds/' || v_build_id || '/';
  insert into public.webgl_publish_operations(
    id,operation_kind,state,owner_admin_id,game_id,idempotency_key,source_bucket,
    source_object_key,staging_prefix,destination_prefix,expected_size_bytes,expected_part_count
  ) values (
    v_operation_id,'upload','initiated',p_owner_admin_id,p_game_id,p_idempotency_key,p_source_bucket,
    v_source_key,v_staging_prefix,v_destination_prefix,p_expected_size_bytes,p_expected_part_count
  ) returning * into v_op;
  insert into public.game_builds(
    id,game_id,slug,version,status,r2_zip_key,r2_extract_prefix,size_bytes,created_by,operation_id,
    expected_size_bytes,expected_part_count,idempotency_key,immutable_build_prefix
  ) values (
    v_build_id,p_game_id,p_slug,p_version,'initiated',v_source_key,v_staging_prefix,0,p_owner_admin_id,v_operation_id,
    p_expected_size_bytes,p_expected_part_count,p_idempotency_key,v_destination_prefix
  );
  update public.webgl_publish_operations set build_id = v_build_id
    where id = v_operation_id returning * into v_op;
  insert into public.webgl_operation_events(operation_id,actor_admin_id,actor_type,event_type,to_state,state_version)
  values(v_op.id,p_owner_admin_id,'route','upload.created','initiated',v_op.state_version);
  return v_op;
exception when unique_violation then
  select * into v_op from public.webgl_publish_operations
    where owner_admin_id = p_owner_admin_id and operation_kind = 'upload'
      and idempotency_key = p_idempotency_key;
  if found then return v_op; end if;
  raise;
end;
$$;

create or replace function public.webgl_record_multipart_created(
  p_operation_id uuid,
  p_expected_version bigint,
  p_multipart_upload_id text
) returns public.webgl_publish_operations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_publish_operations%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode = '42501'; end if;
  if p_multipart_upload_id is null or length(p_multipart_upload_id) > 1000 then raise exception 'invalid multipart identity' using errcode = '22023'; end if;
  select * into v_op from public.webgl_publish_operations where id=p_operation_id for update;
  if not found then raise exception 'operation not found' using errcode='P0002'; end if;
  if v_op.state='uploading' and v_op.multipart_upload_id=p_multipart_upload_id then return v_op; end if;
  if v_op.state<>'initiated' or v_op.state_version<>p_expected_version or v_op.multipart_upload_id is not null then raise exception 'stale multipart creation' using errcode='40001'; end if;
  update public.webgl_publish_operations set state='uploading',state_version=state_version+1,
    multipart_upload_id=p_multipart_upload_id,updated_at=now() where id=p_operation_id returning * into v_op;
  insert into public.webgl_operation_events(operation_id,actor_type,event_type,from_state,to_state,state_version)
  values(v_op.id,'route','multipart.created','initiated','uploading',v_op.state_version);
  return v_op;
end;
$$;

create or replace function public.webgl_record_source_ready(
  p_operation_id uuid,
  p_expected_version bigint,
  p_completed_part_count integer,
  p_source_etag text,
  p_source_checksum text
) returns public.webgl_publish_operations
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_publish_operations%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'service authority required' using errcode = '42501'; end if;
  select * into v_op from public.webgl_publish_operations where id=p_operation_id for update;
  if not found then raise exception 'operation not found' using errcode='P0002'; end if;
  if v_op.state in ('source_ready','queued','leased','extracting','validating','ready_for_preview')
     and v_op.source_checksum=p_source_checksum then return v_op; end if;
  if v_op.state<>'uploading' or v_op.state_version<>p_expected_version or
     p_completed_part_count<>v_op.expected_part_count or p_source_etag is null or
     p_source_checksum is null or length(p_source_checksum)<32 then
    raise exception 'multipart completion evidence mismatch' using errcode='23514';
  end if;
  update public.webgl_publish_operations set state='source_ready',state_version=state_version+1,
    completed_part_count=p_completed_part_count,source_etag=p_source_etag,source_checksum=p_source_checksum,
    source_ready_at=now(),updated_at=now() where id=p_operation_id returning * into v_op;
  update public.game_builds set source_zip_checksum_v2=p_source_checksum,size_bytes=v_op.expected_size_bytes
    where id=v_op.build_id and operation_id=v_op.id;
  if not found then raise exception 'build binding mismatch' using errcode='23514'; end if;
  insert into public.webgl_operation_events(operation_id,actor_type,event_type,from_state,to_state,state_version)
  values(v_op.id,'route','multipart.completed','uploading','source_ready',v_op.state_version);
  return v_op;
end;
$$;

revoke all on function public.webgl_enforce_immutable_operation_binding() from public;
revoke all on function public.webgl_create_upload_operation(uuid,uuid,text,integer,text,bigint,integer,text) from public;
revoke all on function public.webgl_record_multipart_created(uuid,bigint,text) from public;
revoke all on function public.webgl_record_source_ready(uuid,bigint,integer,text,text) from public;
grant execute on function public.webgl_create_upload_operation(uuid,uuid,text,integer,text,bigint,integer,text) to service_role;
grant execute on function public.webgl_record_multipart_created(uuid,bigint,text) to service_role;
grant execute on function public.webgl_record_source_ready(uuid,bigint,integer,text,text) to service_role;
