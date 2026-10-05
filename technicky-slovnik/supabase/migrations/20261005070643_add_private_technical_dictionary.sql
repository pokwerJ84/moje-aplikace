create table public.dictionary_words (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ja text not null,
  en text not null,
  cs text not null,
  description_cs text not null default '',
  description_en text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  constraint dictionary_words_id_nonempty check (length(trim(id)) > 0),
  constraint dictionary_words_ja_nonempty check (length(trim(ja)) > 0),
  constraint dictionary_words_en_nonempty check (length(trim(en)) > 0),
  constraint dictionary_words_cs_nonempty check (length(trim(cs)) > 0)
);

create index dictionary_words_owner_created_idx
  on public.dictionary_words (owner_id, created_at);

alter table public.dictionary_words enable row level security;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.dictionary_words to authenticated;

create policy "Dictionary owner can manage own words"
  on public.dictionary_words
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dictionary-images',
  'dictionary-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Dictionary owner can view own images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dictionary-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Dictionary owner can upload own images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dictionary-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Dictionary owner can update own images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'dictionary-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'dictionary-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Dictionary owner can delete own images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'dictionary-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
