-- Cyber Arena V2: read-only cloud security inventory.
-- Run in Supabase SQL Editor. This does not modify records or permissions.
-- SQL Editor generally runs as an elevated role: these results do NOT prove
-- that owner/non-owner/anonymous browser requests are denied.
select 'cloud table exists' as check_name,
       case when to_regclass('public.arena_cloud_state') is not null then 'PRESENT' else 'MISSING' end as result
union all
select 'owner function',case when to_regprocedure('public.arena_is_owner()') is not null then 'PRESENT' else 'MISSING' end
union all
select 'read function',case when to_regprocedure('public.arena_read_cloud_state()') is not null then 'PRESENT' else 'MISSING' end
union all
select 'write function',case when to_regprocedure('public.arena_write_cloud_state(bigint,jsonb)') is not null then 'PRESENT' else 'MISSING' end;

select c.relname as table_name,c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='arena_cloud_state';

select routine_name,grantee,privilege_type
from information_schema.routine_privileges
where routine_schema='public'
  and routine_name in ('arena_is_owner','arena_read_cloud_state','arena_write_cloud_state')
order by routine_name,grantee;

-- Inspect direct table privileges; unexpected grants need manual review.
select grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='arena_cloud_state'
order by grantee,privilege_type;
