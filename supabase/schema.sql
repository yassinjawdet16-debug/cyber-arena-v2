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

-- Atomic compare-and-swap snapshot writer.
-- Expected revision NULL means the owner has no snapshot yet.
create or replace function public.arena_save_snapshot(expected_revision bigint, new_payload jsonb)
returns public.arena_snapshots
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  previous_revision bigint;
  saved public.arena_snapshots;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if new_payload is null or jsonb_typeof(new_payload) <> 'object' then
    raise exception 'Invalid snapshot payload';
  end if;
  -- Serialize writes per owner, including first-time insert.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 1042));
  select revision into previous_revision from public.arena_snapshots where owner_id = actor for update;
  if previous_revision is distinct from expected_revision then
    raise exception 'Cloud conflict: revision changed' using errcode = '40001';
  end if;
  insert into public.arena_snapshots(owner_id,revision,payload,updated_at)
  values(actor,coalesce(previous_revision,0)+1,new_payload,now())
  on conflict(owner_id) do update set revision = excluded.revision, payload = excluded.payload, updated_at = excluded.updated_at
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.arena_save_snapshot(bigint,jsonb) from public, anon;
grant execute on function public.arena_save_snapshot(bigint,jsonb) to authenticated;
