-- Correct the MVP game guard so ordinary metadata/abort updates that leave the
-- protected pointer fields unchanged remain possible. LOCAL ONLY; do not apply.

create or replace function public.webgl_mvp_protect_game_state()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_op public.webgl_mvp_upload_operations%rowtype;
begin
  select * into v_op from public.webgl_mvp_upload_operations where game_id=new.id;
  if not found then return new; end if;
  if new.build_id is distinct from v_op.build_id or
     (new.r2_build_prefix is distinct from old.r2_build_prefix and new.r2_build_prefix is distinct from v_op.staging_prefix) or
     (new.status='published' and v_op.state<>'published') or
     (new.iframe_url is distinct from old.iframe_url and new.iframe_url is distinct from '/webgl-loader/'||v_op.build_id) then
    raise exception 'MVP game state is controlled by the upload operation' using errcode='42501';
  end if;
  return new;
end;
$$;

revoke all on function public.webgl_mvp_protect_game_state() from public;
revoke all on function public.webgl_mvp_protect_game_state() from anon;
revoke all on function public.webgl_mvp_protect_game_state() from authenticated;
