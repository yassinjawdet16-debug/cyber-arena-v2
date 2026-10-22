-- Cyber Arena V2 cloud state foundation (not applied automatically).
-- Run only after reviewing in Supabase SQL Editor. Requires existing public.arena_members
-- with user_id uuid and role text. Owner membership must be configured separately.
-- All business writes are serialized and version-checked.
begin;
create table if not exists public.arena_cloud_state (
  singleton_id integer primary key default 1 check (singleton_id = 1),
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.arena_cloud_state enable row level security;
revoke all on public.arena_cloud_state from anon, authenticated;
revoke all on public.arena_cloud_state from public;
create or replace function public.arena_is_owner()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.arena_members m
    where m.user_id = auth.uid() and m.role = 'owner'
  );
$$;
revoke all on function public.arena_is_owner() from public;
grant execute on function public.arena_is_owner() to authenticated;
create or replace function public.arena_read_cloud_state()
returns table (revision bigint, state jsonb, updated_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
begin
 if not public.arena_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 return query select s.revision,s.state,s.updated_at from public.arena_cloud_state s where s.singleton_id=1;
end;
$$;
revoke all on function public.arena_read_cloud_state() from public;
grant execute on function public.arena_read_cloud_state() to authenticated;
create or replace function public.arena_write_cloud_state(p_expected_revision bigint,p_state jsonb)
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
 v_revision bigint;
 v_stations jsonb;
begin
 if not public.arena_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid expected revision'; end if;
 if p_state is null or jsonb_typeof(p_state)<>'object' then raise exception 'State must be an object'; end if;
 v_stations := p_state->'stations';
 if jsonb_typeof(v_stations)<>'array' or jsonb_array_length(v_stations)<>16 then
   raise exception 'State must contain 16 stations';
 end if;
 if jsonb_typeof(p_state->'active')<>'object'
 or jsonb_typeof(p_state->'sessions')<>'array'
 or jsonb_typeof(p_state->'archives')<>'object'
 or jsonb_typeof(p_state->'bills')<>'array'
 or jsonb_typeof(p_state->'sales')<>'array'
 or jsonb_typeof(p_state->'adjustments')<>'array'
 then raise exception 'State missing required business records'; end if;
 -- Do not store device-specific credentials or owner PIN in cloud state.
 if (p_state->'settings') ?| array['pin','bridgeToken','bridgeUrl'] then
   raise exception 'Cloud state must not include PIN or bridge credentials';
 end if;
 -- Row lock ensures exactly one writer can commit a given revision.
 select s.revision into v_revision from public.arena_cloud_state s
 where s.singleton_id=1 for update;
 if not found then
   if p_expected_revision<>0 then raise exception 'Cloud state not initialized (conflict)' using errcode='40001'; end if;
   insert into public.arena_cloud_state(singleton_id,revision,state,updated_by)
   values (1,1,p_state,auth.uid());
   return 1;
 end if;
 if v_revision<>p_expected_revision then
   raise exception 'Cloud revision conflict: reload before saving' using errcode='40001';
 end if;
 update public.arena_cloud_state s set revision=s.revision+1,state=p_state,
 updated_by=auth.uid(),updated_at=now() where s.singleton_id=1
 returning s.revision into v_revision;
 return v_revision;
end;
$$;
revoke all on function public.arena_write_cloud_state(bigint,jsonb) from public;
grant execute on function public.arena_write_cloud_state(bigint,jsonb) to authenticated;
commit;
