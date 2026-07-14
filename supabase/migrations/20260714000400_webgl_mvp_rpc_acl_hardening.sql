-- Forward-only ACL hardening for the WebGL MVP SECURITY DEFINER functions.
-- Apply to isolated staging first. This migration does not change RLS, state
-- transitions, ownership checks, or production feature-flag behavior.

-- Internal creator: called only by the authenticated idempotent wrapper or
-- trusted service code, never directly by anon/authenticated clients.
alter function public.create_webgl_mvp_upload(
  text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) security definer set search_path = public, pg_temp;
revoke all on function public.create_webgl_mvp_upload(
  text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) from public;
revoke execute on function public.create_webgl_mvp_upload(
  text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) from anon, authenticated;
grant execute on function public.create_webgl_mvp_upload(
  text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) to service_role;

-- Authenticated entrypoint: it retains authenticated execution because it
-- enforces auth.uid(), active-admin status, owner binding, and idempotency.
alter function public.create_webgl_mvp_upload_idempotent(
  text,text,text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) security definer set search_path = public, pg_temp;
revoke all on function public.create_webgl_mvp_upload_idempotent(
  text,text,text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) from public;
revoke execute on function public.create_webgl_mvp_upload_idempotent(
  text,text,text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) from anon, authenticated;
grant execute on function public.create_webgl_mvp_upload_idempotent(
  text,text,text,text,text,uuid,text,text,text,text[],text[],jsonb,jsonb,
  text,text,text,integer,bigint,jsonb
) to authenticated, service_role;

alter function public.webgl_mvp_begin_verification(uuid,uuid)
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_begin_verification(uuid,uuid) from public;
revoke execute on function public.webgl_mvp_begin_verification(uuid,uuid) from anon, authenticated;
grant execute on function public.webgl_mvp_begin_verification(uuid,uuid) to service_role;

alter function public.webgl_mvp_mark_verified_files(uuid,uuid,text[])
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_mark_verified_files(uuid,uuid,text[]) from public;
revoke execute on function public.webgl_mvp_mark_verified_files(uuid,uuid,text[]) from anon, authenticated;
grant execute on function public.webgl_mvp_mark_verified_files(uuid,uuid,text[]) to service_role;

alter function public.webgl_mvp_finish_verification(uuid,uuid,text,jsonb)
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_finish_verification(uuid,uuid,text,jsonb) from public;
revoke execute on function public.webgl_mvp_finish_verification(uuid,uuid,text,jsonb) from anon, authenticated;
grant execute on function public.webgl_mvp_finish_verification(uuid,uuid,text,jsonb) to service_role;

alter function public.webgl_mvp_preview(uuid,uuid)
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_preview(uuid,uuid) from public;
revoke execute on function public.webgl_mvp_preview(uuid,uuid) from anon, authenticated;
grant execute on function public.webgl_mvp_preview(uuid,uuid) to service_role;

alter function public.webgl_mvp_publish(uuid,uuid)
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_publish(uuid,uuid) from public;
revoke execute on function public.webgl_mvp_publish(uuid,uuid) from anon, authenticated;
grant execute on function public.webgl_mvp_publish(uuid,uuid) to service_role;

alter function public.webgl_mvp_record_signing_lease(uuid,uuid,timestamptz)
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_record_signing_lease(uuid,uuid,timestamptz) from public;
revoke execute on function public.webgl_mvp_record_signing_lease(uuid,uuid,timestamptz) from anon, authenticated;
grant execute on function public.webgl_mvp_record_signing_lease(uuid,uuid,timestamptz) to service_role;

alter function public.webgl_mvp_begin_abort(uuid,uuid)
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_begin_abort(uuid,uuid) from public;
revoke execute on function public.webgl_mvp_begin_abort(uuid,uuid) from anon, authenticated;
grant execute on function public.webgl_mvp_begin_abort(uuid,uuid) to service_role;

alter function public.webgl_mvp_finish_abort(uuid,uuid)
  security definer set search_path = public, pg_temp;
revoke all on function public.webgl_mvp_finish_abort(uuid,uuid) from public;
revoke execute on function public.webgl_mvp_finish_abort(uuid,uuid) from anon, authenticated;
grant execute on function public.webgl_mvp_finish_abort(uuid,uuid) to service_role;
