# cyber-arena-v2
Cyber Arena Gaming Café Management System

## Live cloud synchronization — staging work (not enabled in production)

Cyber Arena V2 currently stores operational data locally. The existing Supabase snapshot feature is manual and explicitly rejects syncing active sessions. **Do not treat snapshots as live cross-device synchronization.**

### Safety gates before enabling on the café's live website

1. Export and verify a JSON backup from the active PC and iPhone; determine which browser currently holds the authoritative business ledger. Never silently merge or replace localStorage.
2. Use authenticated, owner-scoped Supabase data with row-level security; do not place owner PIN, print-bridge token, or Supabase service-role keys in browser/cloud payloads.
3. Design server-side atomic commands for start, pause, resume, transfer, finish, discounts, bill continuation, combine, void, and print acceptance. Use idempotency keys and optimistic revision checks so simultaneous PC/iPhone actions cannot double-charge or free the same station twice.
4. Represent session events and financial adjustments with immutable IDs and an auditable ledger. A client must not publish a whole localStorage snapshot over newer server data.
5. Preserve server-authoritative timestamps and 6 AM Asia/Baghdad business-day boundaries. Countdown expiry must alert, never auto-finish.
6. If offline or authentication expires, continue showing the last known state but **do not pretend cross-device changes succeeded**. Queueing money-affecting writes requires a tested reconciliation strategy; otherwise disable them with a clear warning.
7. Printing remains on Windows using the existing local bridge at 192.168.1.41:9100. Move an unprinted bill to printed only on accepted bridge response; protect against duplicate printing.
8. Run isolated tests for concurrent starts, simultaneous finishes, retries, reconnects, multi-station bills, continuation, voids, daily archive, printer errors, and recovery. Test two real devices with test-only sessions.
9. Roll out behind a default-OFF owner-only feature flag with a reversible migration, separate staging data, and an explicit rollback procedure. **No production activation until owner approval after testing.**

### Current state
This branch is a design/staging checkpoint only. No production behavior, data, Supabase schema, or GitHub Pages deployment has been changed.
