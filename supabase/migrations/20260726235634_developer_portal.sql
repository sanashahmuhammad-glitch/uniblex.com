-- Additive Developer Portal schema. Existing games and upload objects are untouched.
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('owner','admin','reviewer'));

create or replace function public.is_portal_reviewer()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admins where id=(select auth.uid()) and is_active and role in ('owner','admin','reviewer'));
$$;
revoke all on function public.is_portal_reviewer() from public, anon;
grant execute on function public.is_portal_reviewer() to authenticated;

create table if not exists public.developer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  studio_name text not null default '', display_name text not null default '',
  country text, website text, portfolio_url text, company_info text, support_email text,
  social_links jsonb not null default '{}'::jsonb, logo_url text, biography text,
  terms_accepted_at timestamptz, privacy_accepted_at timestamptz,
  account_status text not null default 'pending' check(account_status in ('pending','active','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.game_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.developer_profiles(id) on delete restrict,
  game_id uuid references public.games(id) on delete set null,
  title text not null, slug text not null, short_description text not null default '',
  full_description text not null default '', category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}', engine text, primary_language text not null default 'English',
  age_rating text, content_declaration jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb, gameplay_video_url text,
  status text not null default 'draft' check(status in ('draft','uploading','upload_failed','verification_pending','verification_failed','ready_for_review','submitted','under_review','changes_requested','approved','rejected','published','unpublished','archived')),
  build_verified boolean not null default false, submitted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,slug)
);

create table if not exists public.game_media (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.game_submissions(id) on delete cascade,
  owner_id uuid not null references public.developer_profiles(id) on delete cascade,
  role text not null check(role in ('cover','thumbnail','screenshot-1','screenshot-2','screenshot-3','screenshot-4','screenshot-5','screenshot-6')),
  object_key text not null unique, public_url text not null, file_name text not null,
  content_type text not null, size_bytes bigint not null check(size_bytes>0),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  verified_at timestamptz not null, created_at timestamptz not null default now(),
  unique(submission_id,role)
);

create table if not exists public.developer_game_builds (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.game_submissions(id) on delete cascade,
  owner_id uuid not null references public.developer_profiles(id) on delete cascade,
  operation_id uuid, idempotency_key text, build_type text, compression_mode text, entry_path text,
  file_count integer not null default 0, total_bytes bigint not null default 0,
  manifest jsonb not null default '[]'::jsonb, preview_url text,
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','failed','aborted')),
  verification_error text, verified_at timestamptz, created_at timestamptz not null default now(),
  unique(owner_id,idempotency_key)
);

create table if not exists public.submission_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.game_submissions(id) on delete cascade,
  reviewer_id uuid not null references public.admins(id) on delete restrict,
  decision text not null check(decision in ('under_review','changes_requested','approved','rejected','published','unpublished')),
  developer_feedback text, internal_notes text, checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, title text not null, body text not null, read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.developer_profiles(id) on delete restrict,
  category text not null check(category in ('account_issue','submission_issue','upload_issue','review_appeal','technical_issue','general_question')),
  subject text not null, message text not null,
  status text not null default 'open' check(status in ('open','in_progress','awaiting_developer','resolved','closed')),
  assigned_reviewer_id uuid references public.admins(id) on delete set null, internal_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null, entity_id uuid, action text not null,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists game_submissions_owner_status_idx on public.game_submissions(owner_id,status,updated_at desc);
create index if not exists game_submissions_review_queue_idx on public.game_submissions(status,submitted_at);
create index if not exists game_media_submission_idx on public.game_media(submission_id);
create index if not exists developer_game_builds_submission_idx on public.developer_game_builds(submission_id,created_at desc);
create index if not exists support_tickets_owner_idx on public.support_tickets(owner_id,created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

drop trigger if exists set_developer_profiles_updated_at on public.developer_profiles;
create trigger set_developer_profiles_updated_at before update on public.developer_profiles for each row execute function public.set_updated_at();
drop trigger if exists set_game_submissions_updated_at on public.game_submissions;
create trigger set_game_submissions_updated_at before update on public.game_submissions for each row execute function public.set_updated_at();
drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();

alter table public.developer_profiles enable row level security;
alter table public.game_submissions enable row level security;
alter table public.game_media enable row level security;
alter table public.developer_game_builds enable row level security;
alter table public.submission_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_events enable row level security;

create policy "Developer owns profile" on public.developer_profiles for all to authenticated using(id=(select auth.uid()) or public.is_portal_reviewer()) with check(id=(select auth.uid()) or public.is_portal_reviewer());
create policy "Developer owns submissions" on public.game_submissions for all to authenticated using(owner_id=(select auth.uid()) or public.is_portal_reviewer()) with check(owner_id=(select auth.uid()) or public.is_portal_reviewer());
create policy "Developer manages media" on public.game_media for all to authenticated using(owner_id=(select auth.uid()) or public.is_portal_reviewer()) with check(owner_id=(select auth.uid()) or public.is_portal_reviewer());
create policy "Developer manages builds" on public.developer_game_builds for all to authenticated using(owner_id=(select auth.uid()) or public.is_portal_reviewer()) with check(owner_id=(select auth.uid()) or public.is_portal_reviewer());
create policy "Submission review visibility" on public.submission_reviews for select to authenticated using(public.is_portal_reviewer() or exists(select 1 from public.game_submissions s where s.id=submission_id and s.owner_id=(select auth.uid())));
create policy "Reviewer writes reviews" on public.submission_reviews for all to authenticated using(public.is_portal_reviewer()) with check(public.is_portal_reviewer());
create policy "User reads notifications" on public.notifications for select to authenticated using(user_id=(select auth.uid()) or public.is_portal_reviewer());
create policy "Developer reads tickets" on public.support_tickets for select to authenticated using(owner_id=(select auth.uid()) or public.is_portal_reviewer());
create policy "Developer creates tickets" on public.support_tickets for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "Reviewer updates tickets" on public.support_tickets for update to authenticated using(public.is_portal_reviewer()) with check(public.is_portal_reviewer());
create policy "Reviewer reads audit" on public.audit_events for select to authenticated using(public.is_portal_reviewer());
create policy "Reviewer creates notifications" on public.notifications for insert to authenticated with check(public.is_portal_reviewer());
create policy "Reviewer creates audit" on public.audit_events for insert to authenticated with check(public.is_portal_reviewer());

grant select,insert,update on public.developer_profiles,public.game_submissions,public.support_tickets,public.game_media,public.developer_game_builds to authenticated;
grant delete on public.game_media to authenticated;
revoke select on public.submission_reviews from authenticated;
grant select (id,submission_id,reviewer_id,decision,developer_feedback,checklist,created_at) on public.submission_reviews to authenticated;
grant insert on public.submission_reviews,public.notifications,public.audit_events to authenticated;
grant select on public.notifications to authenticated;
