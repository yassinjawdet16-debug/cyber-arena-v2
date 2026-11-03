-- Cyber Arena V2 STAGING ONLY: run in a separate test Supabase project.
-- Never run against the live business database without a reviewed migration.
-- Owner-scoped, append-only command log with atomic duplicate detection.
-- This is not yet wired to Cyber Arena's live session or billing code.
create table if not exists public.arena_stage_commands (
 owner_id uuid not null references auth.users(id) on delete cascade,
 command_id uuid not null,
 device_id text not null check (length(device_id) between 1 and 120),
 command_type text not null check (command_type in ('start','pause','resume','transfer','finish','combine','continue','discount','void','print_accepted')),
 station_id text,
 expected_revision bigint not null check (expected_revision >= 0),
 resulting_revision bigint not null check (resulting_revision > 0),
 created_at timestamptz not null default now(),
 primary key(owner_id,command_id),
 unique(owner_id,resulting_revision)
);
create table if not exists public.arena_stage_state (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now()
);
alter table public.arena_stage_commands enable row level security;
alter table public.arena_stage_state enable row level security;
revoke all on public.arena_stage_commands,public.arena_stage_state from anon;
revoke insert,update,delete on public.arena_stage_commands from authenticated;
revoke insert,update,delete on public.arena_stage_state from authenticated;
grant select on public.arena_stage_commands,public.arena_stage_state to authenticated;
drop policy if exists arena_stage_commands_owner on public.arena_stage_commands;
create policy arena_stage_commands_owner on public.arena_stage_commands for select to authenticated using (owner_id=(select auth.uid()));
drop policy if exists arena_stage_state_owner on public.arena_stage_state;
create policy arena_stage_state_owner on public.arena_stage_state for select to authenticated using (owner_id=(select auth.uid()));
-- Transactionally accept a unique command ID at the expected revision.
-- No money, timer, or station state changes occur in this prototype.
create or replace function public.arena_stage_accept_command(
 p_command_id uuid,p_device_id text,p_command_type text,p_station_id text,p_expected_revision bigint
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
 actor uuid := (select auth.uid());
 current_revision bigint;
 accepted_revision bigint;
 previous_device text;
 previous_type text;
 previous_station text;
 previous_expected bigint;
begin
 if actor is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_command_id is null or p_device_id is null or length(p_device_id) not between 1 and 120 or
    p_command_type not in ('start','pause','resume','transfer','finish','combine','continue','discount','void','print_accepted') or
    p_expected_revision is null or p_expected_revision < 0 then
   raise exception 'Invalid command';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text, 7733));
 select resulting_revision,device_id,command_type,station_id,expected_revision
 into accepted_revision,previous_device,previous_type,previous_station,previous_expected
 from public.arena_stage_commands where owner_id=actor and command_id=p_command_id;
 if found then
   if previous_device is distinct from p_device_id or previous_type is distinct from p_command_type or
      previous_station is distinct from p_station_id or previous_expected is distinct from p_expected_revision then
     raise exception 'Command ID reused with different payload';
   end if;
   return accepted_revision;
 end if;
 insert into public.arena_stage_state(owner_id,revision) values(actor,0)
 on conflict(owner_id) do nothing;
 select revision into current_revision from public.arena_stage_state where owner_id=actor for update;
 if current_revision <> p_expected_revision then
   raise exception 'Revision conflict' using errcode='40001';
 end if;
 accepted_revision:=current_revision+1;
 insert into public.arena_stage_commands(owner_id,command_id,device_id,command_type,station_id,expected_revision,resulting_revision)
 values(actor,p_command_id,p_device_id,p_command_type,p_station_id,current_revision,accepted_revision);
 update public.arena_stage_state set revision=accepted_revision,updated_at=now() where owner_id=actor;
 return accepted_revision;
end; $$;
revoke all on function public.arena_stage_accept_command(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.arena_stage_accept_command(uuid,text,text,text,bigint) to authenticated;
