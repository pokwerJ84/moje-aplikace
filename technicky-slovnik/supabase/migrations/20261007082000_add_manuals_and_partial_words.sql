alter table public.dictionary_words drop constraint dictionary_words_ja_nonempty;
alter table public.dictionary_words drop constraint dictionary_words_en_nonempty;
alter table public.dictionary_words drop constraint dictionary_words_cs_nonempty;
alter table public.dictionary_words add constraint dictionary_words_one_name check (length(trim(ja || en || cs)) > 0);
create table public.dictionary_manuals (
 id text primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null default 'instrument' check (kind in ('instrument','procedure')),
 ja text not null default '', en text not null default '', model text not null default '',
 description text not null default '',
 steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps)='array'),
 photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos)='array'),
 created_at timestamptz not null default now(),
 constraint dictionary_manuals_one_name check (length(trim(ja || en || model)) > 0)
);
create index dictionary_manuals_owner_created_idx on public.dictionary_manuals(owner_id,created_at);
alter table public.dictionary_manuals enable row level security;
grant select,insert,update,delete on public.dictionary_manuals to authenticated;
create policy "Owner manages own manuals" on public.dictionary_manuals for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
