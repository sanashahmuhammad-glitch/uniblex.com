create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  reading_time text,
  image_url text,
  author_name text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blogs_status_published_at_idx
on public.blogs (status, published_at desc);

create index if not exists blogs_category_id_idx
on public.blogs (category_id);

create trigger set_blogs_updated_at
before update on public.blogs
for each row execute function public.set_updated_at();

alter table public.blogs enable row level security;

create policy "Public can read published blogs"
on public.blogs
for select
to anon, authenticated
using (status = 'published');

create policy "Admins can read all blogs"
on public.blogs
for select
to authenticated
using (public.is_admin());

create policy "Admins can create blogs"
on public.blogs
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update blogs"
on public.blogs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete blogs"
on public.blogs
for delete
to authenticated
using (public.is_admin());
