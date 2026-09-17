begin;

-- Provider-neutral control plane. The singleton row and every provider/placement
-- default to disabled, so applying this migration cannot enable advertising.
create table public.ad_platform_settings (
  id boolean primary key default true check (id),
  ads_enabled boolean not null default false,
  interstitial_enabled boolean not null default false,
  rewarded_enabled boolean not null default false,
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  ticket_ttl_seconds integer not null default 90 check (ticket_ttl_seconds between 15 and 300),
  updated_at timestamptz not null default now()
);
insert into public.ad_platform_settings(id) values(true) on conflict(id) do nothing;

create table public.ad_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique check (provider_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  display_name text not null check (char_length(display_name) between 1 and 120),
  enabled boolean not null default false,
  interstitial_enabled boolean not null default false,
  rewarded_enabled boolean not null default false,
  supports_limited_ads boolean not null default false,
  health_status text not null default 'unknown' check (health_status in ('unknown','healthy','degraded','unavailable')),
  circuit_open_until timestamptz,
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  public_config jsonb not null default '{}'::jsonb check (jsonb_typeof(public_config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ad_frequency_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique check (policy_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  enabled boolean not null default false,
  window_seconds integer not null default 0 check (window_seconds between 0 and 604800),
  max_per_game_window integer not null default 0 check (max_per_game_window between 0 and 100000),
  max_per_audience_window integer not null default 0 check (max_per_audience_window between 0 and 10000),
  max_per_session_window integer not null default 0 check (max_per_session_window between 0 and 10000),
  max_per_format_window integer not null default 0 check (max_per_format_window between 0 and 10000),
  max_per_placement_window integer not null default 0 check (max_per_placement_window between 0 and 10000),
  concurrent_limit integer not null default 0 check (concurrent_limit between 0 and 1),
  failure_backoff_seconds integer not null default 0 check (failure_backoff_seconds between 0 and 86400),
  no_fill_backoff_seconds integer not null default 0 check (no_fill_backoff_seconds between 0 and 86400),
  max_ad_duration_seconds integer not null default 0 check (max_ad_duration_seconds between 0 and 1800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not enabled or (
    window_seconds > 0 and max_per_game_window > 0 and max_per_audience_window > 0
    and max_per_session_window > 0 and max_per_format_window > 0
    and max_per_placement_window > 0 and concurrent_limit > 0
    and max_ad_duration_seconds > 0
  ))
);

create table public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  build_id uuid not null references public.developer_game_builds(id) on delete restrict,
  developer_id uuid not null references public.developer_profiles(id) on delete restrict,
  provider_id uuid references public.ad_providers(id) on delete restrict,
  frequency_policy_id uuid references public.ad_frequency_policies(id) on delete restrict,
  review_id uuid references public.submission_reviews(id) on delete set null,
  placement_token text not null check (placement_token ~ '^[A-Za-z0-9_-]{1,80}$'),
  format text not null check (format in ('interstitial','rewarded')),
  trigger_description text not null default '' check (char_length(trigger_description) <= 500),
  reward_description text check (reward_description is null or char_length(reward_description) <= 160),
  allowed_frame_origin text not null check (allowed_frame_origin ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$'),
  approval_state text not null default 'pending' check (approval_state in ('pending','approved','rejected','disabled')),
  enabled boolean not null default false,
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  policy_config jsonb not null default '{}'::jsonb check (jsonb_typeof(policy_config) = 'object'),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(game_id,build_id,placement_token,format),
  check (format = 'rewarded' or reward_description is null),
  check (not enabled or (approval_state = 'approved' and provider_id is not null and frequency_policy_id is not null and rollout_percent > 0))
);
create index ad_placements_game_build_idx on public.ad_placements(game_id,build_id,approval_state);

create table public.ad_rollout_rules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.ad_providers(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  build_id uuid references public.developer_game_builds(id) on delete restrict,
  format text check (format is null or format in ('interstitial','rewarded')),
  enabled boolean not null default false,
  rollout_percent integer not null default 0 check (rollout_percent between 0 and 100),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.ad_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_hash text not null unique check (ticket_hash ~ '^[a-f0-9]{64}$'),
  game_id uuid not null references public.games(id) on delete restrict,
  build_id uuid not null references public.developer_game_builds(id) on delete restrict,
  developer_id uuid not null references public.developer_profiles(id) on delete restrict,
  placement_id uuid not null references public.ad_placements(id) on delete restrict,
  provider_id uuid not null references public.ad_providers(id) on delete restrict,
  format text not null check (format in ('interstitial','rewarded')),
  session_id uuid not null,
  client_request_id text not null check (client_request_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  audience_scope_hash text not null check (audience_scope_hash ~ '^[a-f0-9]{64}$'),
  frame_origin text not null check (frame_origin ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$'),
  consent_status text not null check (consent_status in ('allowed','limited')),
  consent_policy_version text check (consent_policy_version is null or char_length(consent_policy_version) <= 80),
  status text not null default 'issued' check (status in ('issued','consumed','completed','skipped','failed','unavailable','blocked','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  active_expires_at timestamptz,
  unique(game_id,session_id,client_request_id),
  check (expires_at > created_at),
  check (status <> 'consumed' or consumed_at is not null)
);
create index ad_requests_game_created_idx on public.ad_requests(game_id,created_at desc);
create index ad_requests_audience_created_idx on public.ad_requests(audience_scope_hash,created_at desc);
create index ad_requests_session_created_idx on public.ad_requests(session_id,created_at desc);
create index ad_requests_format_window_idx on public.ad_requests(game_id,audience_scope_hash,format,created_at desc);
create index ad_requests_placement_window_idx on public.ad_requests(placement_id,audience_scope_hash,created_at desc);
create unique index ad_requests_active_session_idx on public.ad_requests(session_id)
  where status in ('issued','consumed');

create table public.ad_provider_events (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.ad_providers(id) on delete restrict,
  request_id uuid not null references public.ad_requests(id) on delete restrict,
  provider_event_id text not null check (char_length(provider_event_id) between 1 and 240),
  completion_id text check (completion_id is null or char_length(completion_id) between 1 and 240),
  event_type text not null check (event_type in ('ready','started','impression','completed','skipped','failed','closed','adjustment')),
  normalized_status text check (normalized_status is null or normalized_status in ('completed','skipped','failed','unavailable','blocked')),
  verification_status text not null default 'rejected' check (verification_status in ('rejected','verified')),
  signature_verified boolean not null default false,
  verification_key_id text check (verification_key_id is null or char_length(verification_key_id) <= 160),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  unique(provider_id,provider_event_id)
);
create unique index ad_provider_completion_idx on public.ad_provider_events(provider_id,completion_id)
  where completion_id is not null;

create table public.ad_outcomes (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.ad_requests(id) on delete restrict,
  provider_event_id bigint references public.ad_provider_events(id) on delete restrict,
  status text not null check (status in ('completed','skipped','failed','unavailable','blocked')),
  trust_level text not null check (trust_level in ('provider_client','server_verified','reconciled')),
  reason text check (reason is null or char_length(reason) <= 240),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(request_id,provider_event_id,status)
);

create table public.ad_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.ad_requests(id) on delete restrict,
  provider_event_id bigint not null unique references public.ad_provider_events(id) on delete restrict,
  completion_id text not null unique check (char_length(completion_id) between 1 and 240),
  game_id uuid not null references public.games(id) on delete restrict,
  build_id uuid not null references public.developer_game_builds(id) on delete restrict,
  developer_id uuid not null references public.developer_profiles(id) on delete restrict,
  placement_id uuid not null references public.ad_placements(id) on delete restrict,
  redeemed_at timestamptz not null default now()
);

create table public.ad_impressions (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.ad_providers(id) on delete restrict,
  provider_event_id bigint unique references public.ad_provider_events(id) on delete restrict,
  request_id uuid references public.ad_requests(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  build_id uuid not null references public.developer_game_builds(id) on delete restrict,
  developer_id uuid not null references public.developer_profiles(id) on delete restrict,
  placement_id uuid not null references public.ad_placements(id) on delete restrict,
  source text not null check (source in ('verified_callback','reconciled_report')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.ad_report_imports (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ad_providers(id) on delete restrict,
  provider_report_id text not null check (char_length(provider_report_id) between 1 and 240),
  report_version text not null check (char_length(report_version) between 1 and 80),
  period_start timestamptz not null,
  period_end timestamptz not null,
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check (status in ('pending','verified','imported','rejected')),
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider_id,provider_report_id,report_version),
  check (period_end > period_start)
);

create table public.ad_report_rows (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.ad_report_imports(id) on delete restrict,
  provider_row_id text not null check (char_length(provider_row_id) between 1 and 240),
  provider_event_id text check (provider_event_id is null or char_length(provider_event_id) <= 240),
  placement_token text check (placement_token is null or placement_token ~ '^[A-Za-z0-9_-]{1,80}$'),
  occurred_on date not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  gross_minor bigint not null,
  provider_fee_minor bigint,
  finalized boolean not null default false,
  dimensions jsonb not null default '{}'::jsonb check (jsonb_typeof(dimensions) = 'object'),
  created_at timestamptz not null default now(),
  unique(import_id,provider_row_id)
);

create table public.ad_reconciliation (
  id uuid primary key default gen_random_uuid(),
  report_row_id bigint not null unique references public.ad_report_rows(id) on delete restrict,
  request_id uuid references public.ad_requests(id) on delete restrict,
  impression_id bigint references public.ad_impressions(id) on delete restrict,
  status text not null default 'unmatched' check (status in ('unmatched','matched','disputed','resolved')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.revenue_ledger (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.ad_providers(id) on delete restrict,
  report_row_id bigint not null references public.ad_report_rows(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  build_id uuid not null references public.developer_game_builds(id) on delete restrict,
  developer_id uuid not null references public.developer_profiles(id) on delete restrict,
  placement_id uuid references public.ad_placements(id) on delete restrict,
  entry_kind text not null check (entry_kind in ('gross','provider_fee','net','adjustment')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor <> 0),
  adjustment_of bigint references public.revenue_ledger(id) on delete restrict,
  source_version text not null check (char_length(source_version) between 1 and 80),
  occurred_on date not null,
  created_at timestamptz not null default now(),
  unique(report_row_id,entry_kind,source_version),
  check ((entry_kind = 'adjustment') = (adjustment_of is not null))
);

create table public.revenue_allocations (
  id bigint generated always as identity primary key,
  ledger_id bigint not null references public.revenue_ledger(id) on delete restrict,
  recipient_type text not null check (recipient_type in ('platform','developer')),
  developer_id uuid references public.developer_profiles(id) on delete restrict,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor <> 0),
  agreement_version text not null check (char_length(agreement_version) between 1 and 80),
  created_at timestamptz not null default now(),
  check ((recipient_type = 'developer') = (developer_id is not null))
);
create unique index revenue_allocations_platform_unique on public.revenue_allocations(ledger_id,agreement_version)
  where recipient_type='platform';
create unique index revenue_allocations_developer_unique on public.revenue_allocations(ledger_id,developer_id,agreement_version)
  where recipient_type='developer';

-- Minimal consent metadata only. No IP address or raw consent string is stored.
create table public.ad_consent_audit (
  id bigint generated always as identity primary key,
  request_id uuid unique references public.ad_requests(id) on delete restrict,
  status text not null check (status in ('allowed','limited','denied')),
  jurisdiction text not null default 'unknown' check (jurisdiction in ('unknown','eea_uk_ch','us','other')),
  framework text not null default 'none' check (framework in ('none','tcf','gpp','custom')),
  policy_version text check (policy_version is null or char_length(policy_version) <= 80),
  source text not null default 'host' check (source in ('host','cmp','user')),
  recorded_at timestamptz not null default now()
);

-- All tables are in Supabase's exposed public schema. RLS and explicit grants keep
-- writes service-only; reviewers can inspect only non-sensitive configuration.
alter table public.ad_platform_settings enable row level security;
alter table public.ad_providers enable row level security;
alter table public.ad_frequency_policies enable row level security;
alter table public.ad_placements enable row level security;
alter table public.ad_rollout_rules enable row level security;
alter table public.ad_requests enable row level security;
alter table public.ad_provider_events enable row level security;
alter table public.ad_outcomes enable row level security;
alter table public.ad_reward_redemptions enable row level security;
alter table public.ad_impressions enable row level security;
alter table public.ad_report_imports enable row level security;
alter table public.ad_report_rows enable row level security;
alter table public.ad_reconciliation enable row level security;
alter table public.revenue_ledger enable row level security;
alter table public.revenue_allocations enable row level security;
alter table public.ad_consent_audit enable row level security;

revoke all on public.ad_platform_settings,public.ad_providers,public.ad_frequency_policies,
  public.ad_placements,public.ad_rollout_rules,public.ad_requests,
  public.ad_provider_events,public.ad_outcomes,public.ad_reward_redemptions,public.ad_impressions,
  public.ad_report_imports,public.ad_report_rows,public.ad_reconciliation,public.revenue_ledger,
  public.revenue_allocations,public.ad_consent_audit from public,anon,authenticated;
grant all on public.ad_platform_settings,public.ad_providers,public.ad_frequency_policies,
  public.ad_placements,public.ad_rollout_rules,public.ad_requests,
  public.ad_provider_events,public.ad_outcomes,public.ad_reward_redemptions,public.ad_impressions,
  public.ad_report_imports,public.ad_report_rows,public.ad_reconciliation,public.revenue_ledger,
  public.revenue_allocations,public.ad_consent_audit to service_role;
grant select on public.ad_platform_settings,public.ad_providers,public.ad_frequency_policies,
  public.ad_placements,public.ad_rollout_rules to authenticated;

create policy "Reviewers read ad platform settings" on public.ad_platform_settings for select to authenticated using (public.is_portal_reviewer());
create policy "Reviewers read ad providers" on public.ad_providers for select to authenticated using (public.is_portal_reviewer());
create policy "Reviewers read ad frequency policies" on public.ad_frequency_policies for select to authenticated using (public.is_portal_reviewer());
create policy "Reviewers read ad placements" on public.ad_placements for select to authenticated using (public.is_portal_reviewer());
create policy "Reviewers read ad rollout rules" on public.ad_rollout_rules for select to authenticated using (public.is_portal_reviewer());

grant usage,select on sequence public.ad_provider_events_id_seq,public.ad_outcomes_id_seq,
  public.ad_consent_audit_id_seq,public.ad_impressions_id_seq,public.ad_report_rows_id_seq,
  public.revenue_ledger_id_seq,public.revenue_allocations_id_seq to service_role;

create or replace function public.prevent_trusted_ad_history_mutation()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  raise exception 'Trusted advertising history is append-only';
end;
$$;
revoke all on function public.prevent_trusted_ad_history_mutation() from public,anon,authenticated;
create trigger protect_ad_provider_events before update or delete on public.ad_provider_events for each row execute function public.prevent_trusted_ad_history_mutation();
create trigger protect_ad_outcomes before update or delete on public.ad_outcomes for each row execute function public.prevent_trusted_ad_history_mutation();
create trigger protect_ad_redemptions before update or delete on public.ad_reward_redemptions for each row execute function public.prevent_trusted_ad_history_mutation();
create trigger protect_ad_impressions before update or delete on public.ad_impressions for each row execute function public.prevent_trusted_ad_history_mutation();
create trigger protect_ad_report_rows before update or delete on public.ad_report_rows for each row execute function public.prevent_trusted_ad_history_mutation();
create trigger protect_revenue_ledger before update or delete on public.revenue_ledger for each row execute function public.prevent_trusted_ad_history_mutation();
create trigger protect_revenue_allocations before update or delete on public.revenue_allocations for each row execute function public.prevent_trusted_ad_history_mutation();
create trigger protect_ad_consent_audit before update or delete on public.ad_consent_audit for each row execute function public.prevent_trusted_ad_history_mutation();

create or replace function public.issue_ad_request_ticket(
  p_slug text,p_provider_key text,p_format text,p_placement text,p_frame_origin text,
  p_session_id uuid,p_client_request_id text,p_audience_scope_hash text,p_ticket_hash text,
  p_consent_status text,p_consent_jurisdiction text,p_consent_framework text,p_consent_source text,
  p_consent_policy_version text default null
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_settings public.ad_platform_settings%rowtype;
  v_game public.games%rowtype;
  v_developer uuid;
  v_provider public.ad_providers%rowtype;
  v_placement public.ad_placements%rowtype;
  v_policy public.ad_frequency_policies%rowtype;
  v_request_id uuid;
  v_expires timestamptz;
  v_window_start timestamptz;
  v_bucket integer;
  v_rule_rollout integer;
  v_lock_keys text[];
  v_key text;
begin
  if p_format not in ('interstitial','rewarded') or p_placement !~ '^[A-Za-z0-9_-]{1,80}$'
    or p_client_request_id !~ '^[A-Za-z0-9_-]{1,80}$'
    or p_audience_scope_hash !~ '^[a-f0-9]{64}$' or p_ticket_hash !~ '^[a-f0-9]{64}$'
    or p_frame_origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$'
    or p_consent_status not in ('allowed','limited')
    or p_consent_jurisdiction not in ('unknown','eea_uk_ch','us','other')
    or p_consent_framework not in ('none','tcf','gpp','custom')
    or p_consent_source not in ('host','cmp','user') then
    return jsonb_build_object('eligible',false,'status','blocked','reason','invalid_request');
  end if;
  select * into v_settings from public.ad_platform_settings where id=true for share;
  if not found or not v_settings.ads_enabled or v_settings.rollout_percent=0
    or (p_format='interstitial' and not v_settings.interstitial_enabled)
    or (p_format='rewarded' and not v_settings.rewarded_enabled) then
    return jsonb_build_object('eligible',false,'status','unavailable','reason','platform_disabled');
  end if;
  select * into v_game from public.games where slug=p_slug and status='published';
  if not found or v_game.build_id is null or v_game.monetization_mode not in ('uniblex_ads','hybrid') then
    return jsonb_build_object('eligible',false,'status','blocked','reason','game_ineligible');
  end if;
  select owner_id into v_developer from public.game_submissions
    where game_id=v_game.id and status='published'
    order by revision_number desc,updated_at desc limit 1;
  if v_developer is null then return jsonb_build_object('eligible',false,'status','blocked','reason','publisher_unverified'); end if;
  select * into v_provider from public.ad_providers where provider_key=p_provider_key for share;
  if not found or not v_provider.enabled or v_provider.health_status<>'healthy'
    or (v_provider.circuit_open_until is not null and v_provider.circuit_open_until>now())
    or v_provider.rollout_percent=0
    or (p_format='interstitial' and not v_provider.interstitial_enabled)
    or (p_format='rewarded' and not v_provider.rewarded_enabled)
    or (p_consent_status='limited' and not v_provider.supports_limited_ads) then
    return jsonb_build_object('eligible',false,'status','unavailable','reason','provider_unavailable');
  end if;
  select * into v_placement from public.ad_placements where game_id=v_game.id and build_id=v_game.build_id
    and developer_id=v_developer and provider_id=v_provider.id and placement_token=p_placement and format=p_format
    and approval_state='approved' and enabled for share;
  if not found or v_placement.allowed_frame_origin<>p_frame_origin or v_placement.rollout_percent=0 then
    return jsonb_build_object('eligible',false,'status','blocked','reason','placement_unapproved');
  end if;
  select * into v_policy from public.ad_frequency_policies where id=v_placement.frequency_policy_id and enabled for share;
  if not found then return jsonb_build_object('eligible',false,'status','blocked','reason','frequency_policy_disabled'); end if;
  select min(rollout_percent) into v_rule_rollout
    from public.ad_rollout_rules
    where enabled and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
      and (provider_id is null or provider_id=v_provider.id)
      and (game_id is null or game_id=v_game.id)
      and (build_id is null or build_id=v_game.build_id)
      and (format is null or format=p_format);
  if coalesce(v_rule_rollout,0)=0 then
    return jsonb_build_object('eligible',false,'status','blocked','reason','rollout_disabled');
  end if;
  v_bucket:=mod(abs(hashtext(p_audience_scope_hash)::bigint),100);
  if v_bucket>=v_settings.rollout_percent or v_bucket>=v_provider.rollout_percent
    or v_bucket>=v_placement.rollout_percent or v_bucket>=v_rule_rollout then
    return jsonb_build_object('eligible',false,'status','blocked','reason','rollout_excluded');
  end if;
  v_lock_keys:=array[
    'game:'||v_game.id::text,
    'audience:'||p_audience_scope_hash,
    'session:'||p_session_id::text,
    'format:'||v_game.id::text||':'||p_audience_scope_hash||':'||p_format,
    'placement:'||v_placement.id::text||':'||p_audience_scope_hash
  ];
  foreach v_key in array v_lock_keys loop
    perform pg_advisory_xact_lock(hashtextextended(v_key,0));
  end loop;
  update public.ad_requests set status='expired'
    where status='issued' and expires_at<=now() and (game_id=v_game.id or audience_scope_hash=p_audience_scope_hash);
  if exists(select 1 from public.ad_requests where game_id=v_game.id and session_id=p_session_id and client_request_id=p_client_request_id) then
    return jsonb_build_object('eligible',false,'status','blocked','reason','duplicate_request');
  end if;
  v_window_start:=now()-(v_policy.window_seconds*interval '1 second');
  if (select count(*) from public.ad_requests where game_id=v_game.id and created_at>=v_window_start)>=v_policy.max_per_game_window
    or (select count(*) from public.ad_requests where game_id=v_game.id and audience_scope_hash=p_audience_scope_hash and created_at>=v_window_start)>=v_policy.max_per_audience_window
    or (select count(*) from public.ad_requests where game_id=v_game.id and session_id=p_session_id and created_at>=v_window_start)>=v_policy.max_per_session_window
    or (select count(*) from public.ad_requests where game_id=v_game.id and audience_scope_hash=p_audience_scope_hash and format=p_format and created_at>=v_window_start)>=v_policy.max_per_format_window
    or (select count(*) from public.ad_requests where placement_id=v_placement.id and audience_scope_hash=p_audience_scope_hash and created_at>=v_window_start)>=v_policy.max_per_placement_window then
    return jsonb_build_object('eligible',false,'status','blocked','reason','frequency_limited');
  end if;
  if (select count(*) from public.ad_requests where audience_scope_hash=p_audience_scope_hash
      and status in ('issued','consumed') and coalesce(active_expires_at,expires_at)>now())>=v_policy.concurrent_limit then
    return jsonb_build_object('eligible',false,'status','blocked','reason','concurrent_request');
  end if;
  if exists(select 1 from public.ad_outcomes o join public.ad_requests r on r.id=o.request_id
      where r.audience_scope_hash=p_audience_scope_hash and o.status='failed'
      and o.created_at>now()-(v_policy.failure_backoff_seconds*interval '1 second'))
    or exists(select 1 from public.ad_outcomes o join public.ad_requests r on r.id=o.request_id
      where r.audience_scope_hash=p_audience_scope_hash and o.status='unavailable'
      and o.created_at>now()-(v_policy.no_fill_backoff_seconds*interval '1 second')) then
    return jsonb_build_object('eligible',false,'status','blocked','reason','provider_backoff');
  end if;
  v_expires:=now()+(v_settings.ticket_ttl_seconds*interval '1 second');
  insert into public.ad_requests(ticket_hash,game_id,build_id,developer_id,placement_id,provider_id,format,
    session_id,client_request_id,audience_scope_hash,frame_origin,consent_status,consent_policy_version,expires_at)
  values(p_ticket_hash,v_game.id,v_game.build_id,v_developer,v_placement.id,v_provider.id,p_format,
    p_session_id,p_client_request_id,p_audience_scope_hash,p_frame_origin,p_consent_status,p_consent_policy_version,v_expires)
  returning id into v_request_id;
  insert into public.ad_consent_audit(request_id,status,jurisdiction,framework,policy_version,source)
    values(v_request_id,p_consent_status,p_consent_jurisdiction,p_consent_framework,p_consent_policy_version,p_consent_source);
  return jsonb_build_object('eligible',true,'status','eligible','request_id',v_request_id,'expires_at',v_expires,'provider_key',v_provider.provider_key);
exception when unique_violation then
  return jsonb_build_object('eligible',false,'status','blocked','reason','duplicate_request');
end;
$$;

create or replace function public.consume_ad_request_ticket(
  p_slug text,p_request_id uuid,p_ticket_hash text,p_session_id uuid,p_client_request_id text,
  p_placement text,p_format text,p_frame_origin text,p_audience_scope_hash text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_request public.ad_requests%rowtype;
  v_game public.games%rowtype;
  v_settings public.ad_platform_settings%rowtype;
  v_provider public.ad_providers%rowtype;
  v_placement public.ad_placements%rowtype;
  v_policy public.ad_frequency_policies%rowtype;
  v_rule_rollout integer;
  v_bucket integer;
begin
  if p_format not in ('interstitial','rewarded') or p_placement !~ '^[A-Za-z0-9_-]{1,80}$'
    or p_client_request_id !~ '^[A-Za-z0-9_-]{1,80}$'
    or p_audience_scope_hash !~ '^[a-f0-9]{64}$' or p_ticket_hash !~ '^[a-f0-9]{64}$'
    or p_frame_origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$' then
    return jsonb_build_object('consumed',false,'reason','invalid_request');
  end if;
  select * into v_request from public.ad_requests where id=p_request_id and ticket_hash=p_ticket_hash for update;
  if not found then return jsonb_build_object('consumed',false,'reason','ticket_invalid'); end if;
  select * into v_game from public.games where slug=p_slug and status='published';
  select * into v_placement from public.ad_placements where id=v_request.placement_id;
  if v_game.id is null or v_placement.id is null
    or v_game.id<>v_request.game_id or v_game.build_id is distinct from v_request.build_id
    or v_request.session_id<>p_session_id or v_request.client_request_id<>p_client_request_id
    or v_request.format<>p_format or v_request.frame_origin<>p_frame_origin
    or v_request.audience_scope_hash<>p_audience_scope_hash
    or v_placement.placement_token<>p_placement or not v_placement.enabled or v_placement.approval_state<>'approved'
    or v_placement.rollout_percent=0 then
    return jsonb_build_object('consumed',false,'reason','ticket_binding_mismatch');
  end if;
  if v_request.status<>'issued' then return jsonb_build_object('consumed',false,'reason','ticket_replayed'); end if;
  if v_request.expires_at<=now() then
    update public.ad_requests set status='expired' where id=v_request.id;
    return jsonb_build_object('consumed',false,'reason','ticket_expired');
  end if;
  select * into v_settings from public.ad_platform_settings where id=true;
  select * into v_provider from public.ad_providers where id=v_request.provider_id;
  select min(rollout_percent) into v_rule_rollout from public.ad_rollout_rules
    where enabled and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
      and (provider_id is null or provider_id=v_request.provider_id)
      and (game_id is null or game_id=v_request.game_id)
      and (build_id is null or build_id=v_request.build_id)
      and (format is null or format=p_format);
  v_bucket:=mod(abs(hashtext(p_audience_scope_hash)::bigint),100);
  if v_settings.id is null or v_provider.id is null
    or not v_settings.ads_enabled or v_settings.rollout_percent=0
    or (p_format='interstitial' and not v_settings.interstitial_enabled)
    or (p_format='rewarded' and not v_settings.rewarded_enabled)
    or not v_provider.enabled or v_provider.health_status<>'healthy'
    or (v_provider.circuit_open_until is not null and v_provider.circuit_open_until>now())
    or v_provider.rollout_percent=0
    or (p_format='interstitial' and not v_provider.interstitial_enabled)
    or (p_format='rewarded' and not v_provider.rewarded_enabled)
    or coalesce(v_rule_rollout,0)=0
    or v_bucket>=v_settings.rollout_percent or v_bucket>=v_provider.rollout_percent
    or v_bucket>=v_placement.rollout_percent or v_bucket>=v_rule_rollout then
    return jsonb_build_object('consumed',false,'reason','ads_disabled');
  end if;
  select * into v_policy from public.ad_frequency_policies where id=v_placement.frequency_policy_id and enabled;
  if not found then return jsonb_build_object('consumed',false,'reason','frequency_policy_disabled'); end if;
  update public.ad_requests set status='consumed',consumed_at=now(),active_expires_at=now()+(v_policy.max_ad_duration_seconds*interval '1 second')
    where id=v_request.id;
  return jsonb_build_object('consumed',true,'request_id',v_request.id);
end;
$$;

create or replace function public.redeem_ad_reward(
  p_slug text,p_request_id uuid,p_session_id uuid,p_client_request_id text,p_completion_id text,p_audience_scope_hash text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_request public.ad_requests%rowtype;
  v_game public.games%rowtype;
  v_event public.ad_provider_events%rowtype;
begin
  if p_completion_id is null or char_length(p_completion_id)>240 then
    return jsonb_build_object('redeemed',false,'reason','completion_invalid');
  end if;
  select * into v_request from public.ad_requests where id=p_request_id for update;
  if not found then return jsonb_build_object('redeemed',false,'reason','request_missing'); end if;
  select * into v_game from public.games where slug=p_slug and status='published';
  if not found or v_game.id<>v_request.game_id or v_game.build_id is distinct from v_request.build_id
    or v_request.session_id<>p_session_id or v_request.client_request_id<>p_client_request_id
    or v_request.audience_scope_hash<>p_audience_scope_hash or v_request.format<>'rewarded' then
    return jsonb_build_object('redeemed',false,'reason','completion_binding_mismatch');
  end if;
  if v_request.status<>'consumed' then return jsonb_build_object('redeemed',false,'reason','request_not_consumed'); end if;
  if v_request.active_expires_at is null or v_request.active_expires_at<=now() then
    update public.ad_requests set status='expired' where id=v_request.id;
    return jsonb_build_object('redeemed',false,'reason','request_expired');
  end if;
  select * into v_event from public.ad_provider_events where provider_id=v_request.provider_id and request_id=v_request.id
    and completion_id=p_completion_id and normalized_status='completed'
    and verification_status='verified' and signature_verified order by id desc limit 1;
  if not found or not exists(select 1 from public.ad_outcomes where request_id=v_request.id and provider_event_id=v_event.id
      and status='completed' and trust_level in ('server_verified','reconciled')) then
    return jsonb_build_object('redeemed',false,'reason','completion_unverified');
  end if;
  if exists(select 1 from public.ad_reward_redemptions where request_id=v_request.id or provider_event_id=v_event.id or completion_id=p_completion_id) then
    return jsonb_build_object('redeemed',false,'reason','completion_replayed');
  end if;
  insert into public.ad_reward_redemptions(request_id,provider_event_id,completion_id,game_id,build_id,developer_id,placement_id)
    values(v_request.id,v_event.id,p_completion_id,v_request.game_id,v_request.build_id,v_request.developer_id,v_request.placement_id);
  update public.ad_requests set status='completed' where id=v_request.id;
  return jsonb_build_object('redeemed',true,'request_id',v_request.id);
exception when unique_violation then
  return jsonb_build_object('redeemed',false,'reason','completion_replayed');
end;
$$;

-- Callback handlers must first verify a concrete provider's signature/key,
-- timestamp and nonce. This service-only RPC atomically records the branded
-- verified result; no browser or generic "completed" endpoint can call it.
create or replace function public.record_verified_ad_provider_event(
  p_provider_key text,p_request_id uuid,p_provider_event_id text,p_event_type text,
  p_normalized_status text,p_completion_id text,p_occurred_at timestamptz,
  p_verification_key_id text,p_payload_hash text,p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_provider public.ad_providers%rowtype;
  v_request public.ad_requests%rowtype;
  v_existing_event public.ad_provider_events%rowtype;
  v_event_id bigint;
begin
  if p_provider_event_id is null or char_length(p_provider_event_id) not between 1 and 240
    or p_event_type not in ('ready','started','impression','completed','skipped','failed','closed','adjustment')
    or (p_normalized_status is not null and p_normalized_status not in ('completed','skipped','failed','unavailable','blocked'))
    or (p_completion_id is not null and char_length(p_completion_id) not between 1 and 240)
    or (p_verification_key_id is not null and char_length(p_verification_key_id)>160)
    or p_payload_hash !~ '^[a-f0-9]{64}$' or p_payload is null or jsonb_typeof(p_payload)<>'object'
    or octet_length(p_payload::text)>65536
    or p_occurred_at is null or p_occurred_at>now()+interval '5 minutes'
    or (p_normalized_status='completed' and (p_event_type<>'completed' or p_completion_id is null)) then
    return jsonb_build_object('accepted',false,'reason','verified_event_invalid');
  end if;
  select * into v_provider from public.ad_providers where provider_key=p_provider_key and enabled for share;
  if not found then return jsonb_build_object('accepted',false,'reason','provider_disabled'); end if;
  select * into v_existing_event from public.ad_provider_events
    where provider_id=v_provider.id and provider_event_id=p_provider_event_id;
  if found then
    if v_existing_event.request_id=p_request_id and v_existing_event.event_type=p_event_type
      and v_existing_event.normalized_status is not distinct from p_normalized_status
      and v_existing_event.completion_id is not distinct from p_completion_id
      and v_existing_event.payload_hash=p_payload_hash then
      return jsonb_build_object('accepted',true,'duplicate',true,'provider_event_id',v_existing_event.id);
    end if;
    return jsonb_build_object('accepted',false,'reason','provider_event_conflict');
  end if;
  select * into v_request from public.ad_requests where id=p_request_id and provider_id=v_provider.id for update;
  if not found or p_occurred_at<v_request.created_at-interval '10 minutes' then
    return jsonb_build_object('accepted',false,'reason','request_binding_invalid');
  end if;
  if v_request.status<>'consumed' or v_request.active_expires_at is null or v_request.active_expires_at<=now() then
    return jsonb_build_object('accepted',false,'reason','request_inactive');
  end if;
  insert into public.ad_provider_events(provider_id,request_id,provider_event_id,completion_id,event_type,
    normalized_status,verification_status,signature_verified,verification_key_id,occurred_at,payload_hash,payload)
  values(v_provider.id,v_request.id,p_provider_event_id,p_completion_id,p_event_type,p_normalized_status,
    'verified',true,p_verification_key_id,p_occurred_at,p_payload_hash,p_payload)
  returning id into v_event_id;
  if p_normalized_status is not null then
    insert into public.ad_outcomes(request_id,provider_event_id,status,trust_level,occurred_at)
      values(v_request.id,v_event_id,p_normalized_status,'server_verified',p_occurred_at);
    if p_normalized_status<>'completed' or v_request.format='interstitial' then
      update public.ad_requests set status=p_normalized_status where id=v_request.id and status='consumed';
    end if;
  end if;
  return jsonb_build_object('accepted',true,'duplicate',false,'provider_event_id',v_event_id);
exception when unique_violation then
  return jsonb_build_object('accepted',false,'reason','provider_event_conflict');
end;
$$;

revoke all on function public.issue_ad_request_ticket(text,text,text,text,text,uuid,text,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.consume_ad_request_ticket(text,uuid,text,uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.redeem_ad_reward(text,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.record_verified_ad_provider_event(text,uuid,text,text,text,text,timestamptz,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.issue_ad_request_ticket(text,text,text,text,text,uuid,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.consume_ad_request_ticket(text,uuid,text,uuid,text,text,text,text,text) to service_role;
grant execute on function public.redeem_ad_reward(text,uuid,uuid,text,text,text) to service_role;
grant execute on function public.record_verified_ad_provider_event(text,uuid,text,text,text,text,timestamptz,text,text,jsonb) to service_role;

-- Publishing with the reviewer monetization checklist checked creates disabled,
-- provider-neutral placement approvals for that exact game build. Existing games
-- and earlier builds are not backfilled or auto-enabled.
create or replace function public.sync_reviewed_ad_placements()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_submission public.game_submissions%rowtype;
  v_game public.games%rowtype;
  v_review public.submission_reviews%rowtype;
  v_item jsonb;
  v_origin text;
  v_entry_url text;
begin
  if new.status<>'published' or new.game_id is null then return new; end if;
  v_submission:=new;
  select * into v_review from public.submission_reviews where submission_id=new.id and decision='published'
    order by created_at desc limit 1;
  if not found or coalesce((v_review.checklist->>'monetization')::boolean,false) is not true then return new; end if;
  select * into v_game from public.games where id=v_submission.game_id and status='published';
  if not found or v_game.build_id is null then return new; end if;
  update public.ad_placements set enabled=false,approval_state='disabled',updated_at=now()
    where game_id=v_game.id and approval_state='approved';
  if v_submission.monetization->>'mode' not in ('uniblex_ads','hybrid') then return new; end if;
  select preview_url into v_entry_url from public.developer_game_builds where id=v_game.build_id;
  v_entry_url:=coalesce(nullif(v_entry_url,''),v_game.iframe_url,'');
  if v_entry_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#].*)?$' then return new; end if;
  v_origin:=lower(substring(v_entry_url from '^(https://[A-Za-z0-9.-]+(:[0-9]{1,5})?)'));
  if v_origin is null then return new; end if;
  for v_item in select value from jsonb_array_elements(coalesce(v_submission.monetization->'placements','[]'::jsonb)) loop
    if coalesce(v_item->>'token','') ~ '^[A-Za-z0-9_-]{1,80}$' and v_item->>'format' in ('interstitial','rewarded') then
      insert into public.ad_placements(game_id,build_id,developer_id,review_id,placement_token,format,
        trigger_description,reward_description,allowed_frame_origin,approval_state,enabled,rollout_percent,approved_at)
      values(v_game.id,v_game.build_id,v_submission.owner_id,v_review.id,v_item->>'token',v_item->>'format',
        left(coalesce(v_item->>'trigger',''),500),case when v_item->>'format'='rewarded' then nullif(left(coalesce(v_item->>'reward',''),160),'') else null end,
        v_origin,'approved',false,0,now())
      on conflict(game_id,build_id,placement_token,format) do update set
        review_id=excluded.review_id,trigger_description=excluded.trigger_description,reward_description=excluded.reward_description,
        allowed_frame_origin=excluded.allowed_frame_origin,approval_state='approved',enabled=false,rollout_percent=0,
        provider_id=null,frequency_policy_id=null,approved_at=now(),updated_at=now();
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.sync_reviewed_ad_placements() from public,anon,authenticated;
create trigger sync_reviewed_ad_placements after update of status,game_id on public.game_submissions
  for each row when (new.status='published' and new.game_id is not null)
  execute function public.sync_reviewed_ad_placements();

commit;
