-- Production-safe MVP for browser-extracted WebGL builds.
-- FORWARD-ONLY, LOCAL ONLY: do not apply without isolated staging review.
-- Rollback: keep R2_GAME_UPLOADS_ENABLED disabled, revoke the RPCs, drop the
-- protection trigger, then drop webgl_mvp_upload_files and
-- webgl_mvp_upload_operations only after every operation is terminal.

create table public.webgl_mvp_upload_operations (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null unique default gen_random_uuid(),
  game_id uuid not null unique references public.games(id) on delete restrict,
  owner_admin_id uuid not null references public.admins(id) on delete restrict,
  state text not null default 'uploading' check (state in (
    'uploading','verifying','ready_for_preview','previewed','published',
    'aborting','aborted','failed'
  )),
  state_version bigint not null default 0 check (state_version >= 0),
  slug text not null,
  staging_prefix text not null unique,
  entry_path text not null,
  build_type text not null check (build_type in (
    'unity-uncompressed','unity-brotli','unity-gzip','unity-unityweb','html5'
  )),
  compression_mode text not null check (compression_mode in
    ('none','brotli','gzip','unityweb','mixed-generic')),
  manifest_hash text not null check (manifest_hash ~ '^[a-f0-9]{64}$'),
  file_count integer not null check (file_count between 1 and 5000),
  total_bytes bigint not null check (total_bytes between 1 and 4294967296),
  verified_file_count integer not null default 0 check (verified_file_count >= 0),
  public_entry_url text,
  loader_config jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  signing_expires_at timestamptz,
  last_error_code text,
  last_error_message text check (last_error_message is null or length(last_error_message) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  published_at timestamptz,
  aborted_at timestamptz,
  check (staging_prefix = 'staging-webgl-uploads/' || id || '/'),
  check (entry_path = 'index.html'),
  check (verified_file_count <= file_count)
);

create table public.webgl_mvp_upload_files (
  operation_id uuid not null references public.webgl_mvp_upload_operations(id) on delete restrict,
  path text not null,
  object_key text not null unique,
  size_bytes bigint not null check (size_bytes between 0 and 536870912),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  crc32 text not null check (crc32 ~ '^[a-f0-9]{8}$'),
  content_type text not null,
  content_encoding text check (content_encoding is null or content_encoding in ('br','gzip')),
  cache_control text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (operation_id,path),
  check (length(path) between 1 and 512),
  check (path !~ '^[\\/]' and path !~ '^[A-Za-z]:' and path !~ '\\'),
  check (('/' || path || '/') not like '%/../%'),
  check (object_key = 'staging-webgl-uploads/' || operation_id || '/' || path)
);

create index webgl_mvp_operations_owner_idx
  on public.webgl_mvp_upload_operations(owner_admin_id,created_at desc);
create index webgl_mvp_operations_expiry_idx
  on public.webgl_mvp_upload_operations(state,expires_at);
create index webgl_mvp_files_verify_idx
  on public.webgl_mvp_upload_files(operation_id,verified_at,path);

create trigger set_webgl_mvp_operations_updated_at
before update on public.webgl_mvp_upload_operations
for each row execute function public.set_updated_at();

alter table public.webgl_mvp_upload_operations enable row level security;
alter table public.webgl_mvp_upload_files enable row level security;
revoke all on public.webgl_mvp_upload_operations from anon, authenticated;
revoke all on public.webgl_mvp_upload_files from anon, authenticated;

create policy "Owners read MVP upload operations"
on public.webgl_mvp_upload_operations for select to authenticated
using (public.is_admin() and owner_admin_id = auth.uid());

create policy "Owners read MVP upload files"
on public.webgl_mvp_upload_files for select to authenticated
using (public.is_admin() and exists (
  select 1 from public.webgl_mvp_upload_operations operation
  where operation.id = operation_id and operation.owner_admin_id = auth.uid()
));

grant select on public.webgl_mvp_upload_operations to authenticated;
grant select on public.webgl_mvp_upload_files to authenticated;

create or replace function public.create_webgl_mvp_upload(
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
declare
  v_operation_id uuid := gen_random_uuid();
  v_build_id uuid := gen_random_uuid();
  v_game_id uuid;
  v_prefix text;
  v_entry jsonb;
  v_path text;
  v_count integer := 0;
  v_total bigint := 0;
  v_has_index boolean := false;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) > 100 or
     length(trim(p_title)) not between 1 and 160 or
     length(trim(p_description)) not between 1 and 5000 or
     p_cover_url !~ '^https://' or coalesce(p_thumbnail_url,'') !~ '^https://' or
     p_manifest_hash !~ '^[a-f0-9]{64}$' or
     p_file_count not between 1 and 5000 or p_total_bytes not between 1 and 4294967296 or
     jsonb_typeof(p_manifest) <> 'array' or jsonb_array_length(p_manifest) <> p_file_count or
     p_build_type not in ('unity-uncompressed','unity-brotli','unity-gzip','unity-unityweb','html5') or
     p_compression_mode not in ('none','brotli','gzip','unityweb','mixed-generic') then
    raise exception 'invalid upload metadata' using errcode = '22023';
  end if;
  if exists (select 1 from public.games where slug = p_slug) then
    raise exception 'game slug already exists' using errcode = '23505';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories where id = p_category_id
  ) then raise exception 'category not found' using errcode = '23503'; end if;

  insert into public.games(
    id,category_id,title,slug,genre,status,description,cover_url,thumbnail_url,
    screenshot_urls,tags,desktop_controls,mobile_controls,aspect_ratio,
    build_id,build_status,build_version,sort_order
  ) values (
    gen_random_uuid(),p_category_id,trim(p_title),p_slug,nullif(trim(p_genre),''),'draft',
    trim(p_description),p_cover_url,p_thumbnail_url,coalesce(p_screenshot_urls,'{}'),
    coalesce(p_tags,'{}'),coalesce(p_desktop_controls,'[]'),coalesce(p_mobile_controls,'[]'),
    '16/9',v_build_id,'uploading',1,0
  ) returning id into v_game_id;

  v_prefix := 'staging-webgl-uploads/' || v_operation_id || '/';
  insert into public.webgl_mvp_upload_operations(
    id,build_id,game_id,owner_admin_id,slug,staging_prefix,entry_path,
    build_type,compression_mode,manifest_hash,file_count,total_bytes
  ) values (
    v_operation_id,v_build_id,v_game_id,auth.uid(),p_slug,v_prefix,'index.html',
    p_build_type,p_compression_mode,p_manifest_hash,p_file_count,p_total_bytes
  );

  for v_entry in select value from jsonb_array_elements(p_manifest) loop
    v_path := v_entry->>'path';
    if v_path is null or length(v_path) not between 1 and 512 or
       v_path ~ '^[\\/]' or v_path ~ '^[A-Za-z]:' or v_path ~ '\\' or
       ('/' || v_path || '/') like '%/../%' or
       lower(v_path) ~ '\.(zip|7z|rar|tar|tgz|bz2|xz)$' or
       (v_entry->>'sha256') !~ '^[a-f0-9]{64}$' or
       (v_entry->>'crc32') !~ '^[a-f0-9]{8}$' or
       (v_entry->>'size')::bigint not between 0 and 536870912 or
       length(v_entry->>'contentType') not between 1 and 150 or
       coalesce(v_entry->>'contentEncoding','') not in ('','br','gzip') or
       length(v_entry->>'cacheControl') not between 1 and 150 then
      raise exception 'invalid manifest entry' using errcode = '22023';
    end if;
    insert into public.webgl_mvp_upload_files(
      operation_id,path,object_key,size_bytes,sha256,crc32,content_type,
      content_encoding,cache_control
    ) values (
      v_operation_id,v_path,v_prefix || v_path,(v_entry->>'size')::bigint,
      v_entry->>'sha256',v_entry->>'crc32',v_entry->>'contentType',
      nullif(v_entry->>'contentEncoding',''),v_entry->>'cacheControl'
    );
    v_count := v_count + 1;
    v_total := v_total + (v_entry->>'size')::bigint;
    if v_path = 'index.html' then v_has_index := true; end if;
  end loop;
  if v_count <> p_file_count or v_total <> p_total_bytes or not v_has_index then
    raise exception 'manifest totals or entry point do not match' using errcode = '23514';
  end if;
  return jsonb_build_object(
    'operationId',v_operation_id,'buildId',v_build_id,'gameId',v_game_id,
    'state','uploading','expiresAt',now() + interval '24 hours'
  );
end;
$$;

create or replace function public.webgl_mvp_begin_verification(
  p_operation_id uuid,p_owner_id uuid
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.webgl_mvp_upload_operations set
    state='verifying',state_version=state_version+1,last_error_code=null,last_error_message=null
  where id=p_operation_id and owner_admin_id=p_owner_id and state='uploading'
    and expires_at > now();
  if not found then raise exception 'operation is not verifiable' using errcode='55000'; end if;
end;
$$;

create or replace function public.webgl_mvp_mark_verified_files(
  p_operation_id uuid,p_owner_id uuid,p_paths text[]
) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if not exists (select 1 from public.webgl_mvp_upload_operations
    where id=p_operation_id and owner_admin_id=p_owner_id and state='verifying') then
    raise exception 'operation is not verifying' using errcode='55000';
  end if;
  update public.webgl_mvp_upload_files set verified_at=coalesce(verified_at,now())
    where operation_id=p_operation_id and path=any(p_paths);
  select count(*) into v_count from public.webgl_mvp_upload_files
    where operation_id=p_operation_id and verified_at is not null;
  update public.webgl_mvp_upload_operations set verified_file_count=v_count
    where id=p_operation_id;
  return v_count;
end;
$$;

create or replace function public.webgl_mvp_finish_verification(
  p_operation_id uuid,p_owner_id uuid,p_public_entry_url text,p_loader_config jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_mvp_upload_operations%rowtype;
begin
  select * into v_op from public.webgl_mvp_upload_operations
    where id=p_operation_id and owner_admin_id=p_owner_id for update;
  if not found or v_op.state <> 'verifying' then raise exception 'operation is not verifying' using errcode='55000'; end if;
  if p_public_entry_url !~ '^https://' or jsonb_typeof(p_loader_config) <> 'object' or
     (select count(*) from public.webgl_mvp_upload_files where operation_id=v_op.id and verified_at is not null) <> v_op.file_count then
    raise exception 'verification is incomplete' using errcode='23514';
  end if;
  update public.webgl_mvp_upload_operations set
    state='ready_for_preview',state_version=state_version+1,
    verified_file_count=file_count,public_entry_url=p_public_entry_url,
    loader_config=p_loader_config,verified_at=now()
  where id=v_op.id returning * into v_op;
  update public.games set build_status='ready',preview_url=p_public_entry_url,
    r2_build_prefix=v_op.staging_prefix,build_metadata=p_loader_config,last_build_error=null
  where id=v_op.game_id;
  return jsonb_build_object('operationId',v_op.id,'buildId',v_op.build_id,
    'gameId',v_op.game_id,'state',v_op.state,'previewUrl',v_op.public_entry_url);
end;
$$;

create or replace function public.webgl_mvp_preview(
  p_operation_id uuid,p_owner_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_mvp_upload_operations%rowtype;
begin
  select * into v_op from public.webgl_mvp_upload_operations
    where id=p_operation_id and owner_admin_id=p_owner_id for update;
  if not found or v_op.state not in ('ready_for_preview','previewed') then
    raise exception 'build is not ready for preview' using errcode='55000';
  end if;
  if v_op.state='ready_for_preview' then
    update public.webgl_mvp_upload_operations set state='previewed',state_version=state_version+1
      where id=v_op.id returning * into v_op;
    update public.games set status='preview',preview_url=v_op.public_entry_url where id=v_op.game_id;
  end if;
  return jsonb_build_object('operationId',v_op.id,'state',v_op.state,'previewUrl',v_op.public_entry_url);
end;
$$;

create or replace function public.webgl_mvp_publish(
  p_operation_id uuid,p_owner_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_mvp_upload_operations%rowtype;
declare v_iframe text;
begin
  select * into v_op from public.webgl_mvp_upload_operations
    where id=p_operation_id and owner_admin_id=p_owner_id for update;
  if not found then raise exception 'operation not found' using errcode='P0002'; end if;
  if v_op.state='published' then
    return jsonb_build_object('operationId',v_op.id,'gameId',v_op.game_id,'state','published','iframeUrl','/webgl-loader/'||v_op.build_id);
  end if;
  if v_op.state not in ('ready_for_preview','previewed') or
     v_op.verified_file_count <> v_op.file_count or v_op.public_entry_url is null then
    raise exception 'build is not publishable' using errcode='55000';
  end if;
  v_iframe := '/webgl-loader/' || v_op.build_id;
  update public.webgl_mvp_upload_operations set
    state='published',state_version=state_version+1,published_at=now()
  where id=v_op.id returning * into v_op;
  update public.games set status='published',build_status='ready',iframe_url=v_iframe,
    preview_url=v_op.public_entry_url,r2_build_prefix=v_op.staging_prefix,
    build_metadata=v_op.loader_config,published_at=now(),last_build_error=null
  where id=v_op.game_id;
  return jsonb_build_object('operationId',v_op.id,'gameId',v_op.game_id,
    'state','published','iframeUrl',v_iframe);
end;
$$;

create or replace function public.webgl_mvp_record_signing_lease(
  p_operation_id uuid,p_owner_id uuid,p_expires_at timestamptz
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_mvp_upload_operations%rowtype;
begin
  if p_expires_at <= now() or p_expires_at > now() + interval '5 minutes' then
    raise exception 'signing lease expiry is invalid' using errcode='22023';
  end if;
  select * into v_op from public.webgl_mvp_upload_operations
    where id=p_operation_id and owner_admin_id=p_owner_id for update;
  if not found or v_op.state <> 'uploading' or v_op.expires_at <= now() then
    raise exception 'operation is not accepting signed uploads' using errcode='55000';
  end if;
  update public.webgl_mvp_upload_operations set
    signing_expires_at=greatest(coalesce(signing_expires_at,p_expires_at),p_expires_at)
    where id=v_op.id;
end;
$$;

create or replace function public.webgl_mvp_begin_abort(
  p_operation_id uuid,p_owner_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_mvp_upload_operations%rowtype;
begin
  select * into v_op from public.webgl_mvp_upload_operations
    where id=p_operation_id and owner_admin_id=p_owner_id for update;
  if not found or v_op.state not in (
    'uploading','verifying','ready_for_preview','previewed','failed','aborting','aborted'
  ) then
    raise exception 'operation is not abortable' using errcode='55000';
  end if;
  if v_op.state not in ('aborting','aborted') then
    update public.webgl_mvp_upload_operations set
      state='aborting',state_version=state_version+1
      where id=v_op.id returning * into v_op;
  end if;
  return jsonb_build_object(
    'prefix',v_op.staging_prefix,
    'cleanupAfter',v_op.signing_expires_at,
    'state',v_op.state
  );
end;
$$;

create or replace function public.webgl_mvp_finish_abort(
  p_operation_id uuid,p_owner_id uuid
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_game_id uuid;
begin
  update public.webgl_mvp_upload_operations set state='aborted',state_version=state_version+1,
    aborted_at=now(),last_error_code=null,last_error_message=null
    where id=p_operation_id and owner_admin_id=p_owner_id and state='aborting'
    returning game_id into v_game_id;
  if not found then
    if exists(select 1 from public.webgl_mvp_upload_operations where id=p_operation_id and owner_admin_id=p_owner_id and state='aborted') then return; end if;
    raise exception 'operation is not aborting' using errcode='55000';
  end if;
  update public.games set build_status='failed',last_build_error='Upload was aborted.'
    where id=v_game_id and status <> 'published';
end;
$$;

create or replace function public.webgl_mvp_protect_game_state()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_mvp_upload_operations%rowtype;
begin
  select * into v_op from public.webgl_mvp_upload_operations where game_id=new.id;
  if not found then return new; end if;
  if new.build_id is distinct from v_op.build_id or
     new.r2_build_prefix is distinct from coalesce(v_op.staging_prefix,new.r2_build_prefix) or
     (new.status='published' and v_op.state<>'published') or
     (new.iframe_url is distinct from old.iframe_url and new.iframe_url is distinct from '/webgl-loader/'||v_op.build_id) then
    raise exception 'MVP game state is controlled by the upload operation' using errcode='42501';
  end if;
  return new;
end;
$$;

create trigger protect_webgl_mvp_game_state
before update on public.games for each row execute function public.webgl_mvp_protect_game_state();

revoke all on function public.webgl_mvp_protect_game_state() from public;
revoke all on function public.webgl_mvp_protect_game_state() from anon;
revoke all on function public.webgl_mvp_protect_game_state() from authenticated;

create or replace function public.get_published_webgl_mvp_loader(p_build_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'buildId',operation.build_id,'title',game.title,'coverUrl',game.cover_url,
    'thumbnailUrl',game.thumbnail_url,'entryUrl',operation.public_entry_url,
    'totalBytes',operation.total_bytes,'buildType',operation.build_type,
    'compressionMode',operation.compression_mode,'manifest',operation.loader_config->'files'
  )
  from public.webgl_mvp_upload_operations operation
  join public.games game on game.id=operation.game_id
  where operation.build_id=p_build_id and operation.state='published' and game.status='published';
$$;

revoke all on function public.create_webgl_mvp_upload(text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,text,text,text,integer,bigint,jsonb) from public;
grant execute on function public.create_webgl_mvp_upload(text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,text,text,text,integer,bigint,jsonb) to authenticated;

revoke all on function public.webgl_mvp_begin_verification(uuid,uuid) from public;
revoke all on function public.webgl_mvp_mark_verified_files(uuid,uuid,text[]) from public;
revoke all on function public.webgl_mvp_finish_verification(uuid,uuid,text,jsonb) from public;
revoke all on function public.webgl_mvp_preview(uuid,uuid) from public;
revoke all on function public.webgl_mvp_publish(uuid,uuid) from public;
revoke all on function public.webgl_mvp_record_signing_lease(uuid,uuid,timestamptz) from public;
revoke all on function public.webgl_mvp_begin_abort(uuid,uuid) from public;
revoke all on function public.webgl_mvp_finish_abort(uuid,uuid) from public;
grant execute on function public.webgl_mvp_begin_verification(uuid,uuid) to service_role;
grant execute on function public.webgl_mvp_mark_verified_files(uuid,uuid,text[]) to service_role;
grant execute on function public.webgl_mvp_finish_verification(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.webgl_mvp_preview(uuid,uuid) to service_role;
grant execute on function public.webgl_mvp_publish(uuid,uuid) to service_role;
grant execute on function public.webgl_mvp_record_signing_lease(uuid,uuid,timestamptz) to service_role;
grant execute on function public.webgl_mvp_begin_abort(uuid,uuid) to service_role;
grant execute on function public.webgl_mvp_finish_abort(uuid,uuid) to service_role;

revoke all on function public.get_published_webgl_mvp_loader(uuid) from public;
grant execute on function public.get_published_webgl_mvp_loader(uuid) to anon,authenticated;
