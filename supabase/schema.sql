-- Cyber Arena V2 cloud snapshots, per authenticated owner.
-- Run in Supabase SQL editor after reviewing the project and backups.
create table if not exists public.arena_snapshots (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.arena_snapshots enable row level security;
revoke all on public.arena_snapshots from anon;
grant select, insert, update on public.arena_snapshots to authenticated;
drop policy if exists arena_owner_select on public.arena_snapshots;
create policy arena_owner_select on public.arena_snapshots for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists arena_owner_insert on public.arena_snapshots;
create policy arena_owner_insert on public.arena_snapshots for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists arena_owner_update on public.arena_snapshots;
create policy arena_owner_update on public.arena_snapshots for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- Never put the Supabase service_role key in GitHub Pages or browser code.
-- A later migration should separate sensitive business records into transactional tables.
