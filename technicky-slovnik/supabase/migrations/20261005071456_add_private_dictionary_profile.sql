create table public.dictionary_profiles (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  seeded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.dictionary_profiles enable row level security;
grant select, insert, update on public.dictionary_profiles to authenticated;

create policy "Dictionary owner can manage own profile"
  on public.dictionary_profiles
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
