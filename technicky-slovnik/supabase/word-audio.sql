-- Applied as dictionary_private_word_audio; recordings remain private to their owner.
alter table public.dictionary_words add column audio_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dictionary-audio','dictionary-audio',false,10485760,array['audio/mp4','audio/webm','audio/ogg','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/aac','audio/x-m4a'])
on conflict(id) do nothing;
create policy "Owner reads dictionary audio" on storage.objects for select to authenticated
using(bucket_id='dictionary-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Owner uploads dictionary audio" on storage.objects for insert to authenticated
with check(bucket_id='dictionary-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Owner deletes dictionary audio" on storage.objects for delete to authenticated
using(bucket_id='dictionary-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
