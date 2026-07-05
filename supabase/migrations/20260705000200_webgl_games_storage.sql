insert into storage.buckets (id, name, public)
values ('webgl-games', 'webgl-games', true)
on conflict (id) do update
set public = true;

create policy "Public can read webgl game files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'webgl-games');

create policy "Admins can upload webgl game files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'webgl-games'
  and public.is_admin()
);

create policy "Admins can update webgl game files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'webgl-games'
  and public.is_admin()
)
with check (
  bucket_id = 'webgl-games'
  and public.is_admin()
);

create policy "Admins can delete webgl game files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'webgl-games'
  and public.is_admin()
);
