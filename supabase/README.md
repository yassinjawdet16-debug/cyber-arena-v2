# Cyber Arena V2 — Cloud synchronization deployment

Status: FOUNDATION ONLY. Not live or ready for production. iPhone printer integration intentionally out of scope.

## Existing state and preservation
- Existing browser localStorage data is not synchronized automatically.
- The current live GitHub Pages branch is unchanged.
- Do not replace or import live records before exporting and verifying a complete JSON backup.
- Existing Supabase tables (arena_stations, arena_sessions, arena_receipts, arena_cash_movements) are untouched by this migration.
- The new arena_cloud_state table is an *additional* owner-only snapshot store; it does not yet replace the existing operational tables.

## Migration
1. Verify the correct Supabase project and authenticated owner membership in public.arena_members.
2. Run the read-only `supabase/000_preflight_readonly.sql` in the SQL Editor and review every result. Do not install the migration if any required table/column fails or an existing cloud object needs review.
3. Back up the database before running migrations. A local website JSON backup is not a substitute for a database backup.
4. Review supabase/001_cloud_state.sql, then run it in the Supabase SQL Editor.
5. Confirm an anonymous user cannot call either RPC and an authenticated non-owner cannot read or write.
6. Verify the authenticated owner can read an empty result; no state is initialized automatically.
7. Never copy the service-role key into browser HTML.

## Transaction design
- arena_read_cloud_state() returns current revision and state to the owner.
- arena_write_cloud_state(expected_revision,state) atomically checks and increments revision.
- A conflicting second write must fail; client must reload and *not* silently retry the same mutation.
- All state mutations need explicit client-side cloud-first commands, including start, extend, finish, discounts, bills, sales, cash adjustments, and archives.
- Financial operations must be idempotent and linked to stable transaction IDs; the snapshot revision check alone is not enough for safe retries.
- Device-specific printer settings, PIN, and bridge credentials must remain local.
- Offline mode must not permit unsynchronized financial writes on multiple devices.
- On failed/uncertain network responses, read authoritative cloud state before attempting another write.

## Still required before release
- Implement and test cloud-first application adapter in the main V2 UI.
- Verify complete state shape, record IDs, station IDs/rates, and cross-record financial consistency server-side.
- Plan controlled migration of local data, with owner confirmation and a recovery point.
- Add rollback strategy, cloud export and restoration.
- Test concurrent starts, finishes, discounts, cash updates, and network interruptions from PC and iPhone.
- Security review and RLS audit of all existing Supabase tables.
- Confirm third interface language.

Do not publish or claim synchronized operation until these items are complete.
