-- Create a dedicated bucket for content thumbnails
insert into storage.buckets (id, name, public)
values ('content-thumbnails', 'content-thumbnails', true)
on conflict (id) do update set public = excluded.public;

-- Policies for public read
create policy "Public can view content thumbnails"
on storage.objects
for select
using (bucket_id = 'content-thumbnails');

-- Policies for authenticated users to manage thumbnails
create policy "Authenticated can upload content thumbnails"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'content-thumbnails');

create policy "Authenticated can update content thumbnails"
on storage.objects
for update
to authenticated
using (bucket_id = 'content-thumbnails');

create policy "Authenticated can delete content thumbnails"
on storage.objects
for delete
to authenticated
using (bucket_id = 'content-thumbnails');
