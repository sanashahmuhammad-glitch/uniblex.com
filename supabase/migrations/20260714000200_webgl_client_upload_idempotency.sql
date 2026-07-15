-- Idempotent create wrapper for the browser-extracted WebGL MVP.
-- LOCAL ONLY. Apply only with the preceding migration in isolated staging.

alter table public.webgl_mvp_upload_operations
  add column idempotency_key text,
  add column request_hash text;

create unique index webgl_mvp_operations_owner_idempotency_idx
  on public.webgl_mvp_upload_operations(owner_admin_id,idempotency_key)
  where idempotency_key is not null;

create or replace function public.create_webgl_mvp_upload_idempotent(
  p_idempotency_key text,
  p_request_hash text,
  p_slug text,
  p_title text,
  p_description text,
  p_category_id uuid,
  p_genre text,
  p_cover_url text,
  p_thumbnail_url text,
  p_screenshot_urls text[],
  p_tags text[],
  p_desktop_controls jsonb,
  p_mobile_controls jsonb,
  p_manifest_hash text,
  p_build_type text,
  p_compression_mode text,
  p_file_count integer,
  p_total_bytes bigint,
  p_manifest jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_existing public.webgl_mvp_upload_operations%rowtype;
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() or
     p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$' or
     p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid upload request identity' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_idempotency_key,0));
  select * into v_existing from public.webgl_mvp_upload_operations
    where owner_admin_id=auth.uid() and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.request_hash <> p_request_hash then
      raise exception 'idempotency key request mismatch' using errcode='23514';
    end if;
    return jsonb_build_object(
      'operationId',v_existing.id,'buildId',v_existing.build_id,
      'gameId',v_existing.game_id,'state',v_existing.state,
      'expiresAt',v_existing.expires_at,'replayed',true
    );
  end if;
  v_result := public.create_webgl_mvp_upload(
    p_slug,p_title,p_description,p_category_id,p_genre,p_cover_url,p_thumbnail_url,
    p_screenshot_urls,p_tags,p_desktop_controls,p_mobile_controls,p_manifest_hash,
    p_build_type,p_compression_mode,p_file_count,p_total_bytes,p_manifest
  );
  update public.webgl_mvp_upload_operations set
    idempotency_key=p_idempotency_key,request_hash=p_request_hash
  where id=(v_result->>'operationId')::uuid;
  return v_result || jsonb_build_object('replayed',false);
end;
$$;

revoke execute on function public.create_webgl_mvp_upload(text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,text,text,text,integer,bigint,jsonb) from authenticated;
revoke all on function public.create_webgl_mvp_upload_idempotent(text,text,text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,text,text,text,integer,bigint,jsonb) from public;
grant execute on function public.create_webgl_mvp_upload_idempotent(text,text,text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,text,text,text,integer,bigint,jsonb) to authenticated;
