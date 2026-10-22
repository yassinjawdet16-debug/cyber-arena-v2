-- Cyber Arena V2 — read-only Supabase migration preflight
-- Run in the intended Supabase project's SQL Editor BEFORE 001_cloud_state.sql.
-- This script changes nothing. It does not export or reveal member identities.
with checks as (
 select 'arena_members table' as item,
        to_regclass('public.arena_members') is not null as passed,
        'Required existing membership table' as details
 union all
 select 'member user_id column',
        exists(select 1 from information_schema.columns where table_schema='public' and table_name='arena_members' and column_name='user_id' and udt_name='uuid'),
        'Expected uuid user_id'
 union all
 select 'member role column',
        exists(select 1 from information_schema.columns where table_schema='public' and table_name='arena_members' and column_name='role' and data_type in ('text','character varying')),
        'Expected text role'
 union all
 select 'arena_cloud_state not yet present',
        to_regclass('public.arena_cloud_state') is null,
        'Existing table requires manual review before installing migration'
 union all
 select 'arena_read_cloud_state not yet present',
        to_regprocedure('public.arena_read_cloud_state()') is null,
        'Existing function requires manual review before installing migration'
 union all
 select 'arena_write_cloud_state not yet present',
        to_regprocedure('public.arena_write_cloud_state(bigint,jsonb)') is null,
        'Existing function requires manual review before installing migration'
 union all
 select 'arena_is_owner not yet present',
        to_regprocedure('public.arena_is_owner()') is null,
        'Existing function requires manual review before installing migration'
)
select item,case when passed then 'PASS' else 'REVIEW REQUIRED' end as result,details
from checks order by item;

-- Check row-level security on the existing business tables (read-only).
select c.relname as table_name,
       case when c.relrowsecurity then 'ENABLED' else 'DISABLED - REVIEW' end as rls_status
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind in ('r','p')
  and c.relname in ('arena_members','arena_stations','arena_sessions','arena_receipts','arena_cash_movements')
order by c.relname;

-- This preflight cannot confirm the current owner's membership or test
-- authenticated browser permissions because SQL Editor usually runs with
-- elevated database privileges. Test these separately after installation.
