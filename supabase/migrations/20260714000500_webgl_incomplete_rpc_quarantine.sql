-- Fail-closed gate for the local redesign migration set.
-- These early draft RPCs are not command-bound and must not survive into a
-- staging schema. Final fixed-purpose replacements require separate review.

drop function if exists public.webgl_claim_extraction(uuid,bigint,text,text,integer);
drop function if exists public.webgl_record_extraction_success(uuid,bigint,text,text,jsonb);
drop function if exists public.webgl_activate_build(uuid,bigint,jsonb);

create unique index if not exists game_builds_immutable_build_prefix_idx
  on public.game_builds(immutable_build_prefix)
  where immutable_build_prefix is not null;

comment on table public.webgl_control_commands is
  'Design-only command ledger. Keep R2_GAME_UPLOADS_ENABLED disabled until every fixed command finalizer is implemented and reviewed.';

