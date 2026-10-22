# Cyber Arena V2 cloud rollout checklist

Current status: cloud adapter and SQL schema are staged, **not connected to the live website**. Do not treat cloud backups as active.

## Owner setup (required before live cloud sync)
1. Create a Supabase project and keep its database password and service_role key private.
2. Review and execute `supabase/schema.sql` in the SQL editor.
3. Enable Supabase Auth for the owner. Never store a service_role key in frontend code.
4. In the website Owner Settings panel, enter the Supabase project URL, public anon/publishable key, and owner Supabase Auth email/password. The site obtains an access token using Supabase Auth; do not paste service_role credentials.
5. Before uploading, download a JSON backup from the existing site and verify it opens.
6. Review cloud data and local data before any recovery. Do not overwrite a newer local copy automatically.
7. Test on a separate account and test database before production rollout.

## Limitations and security
- The adapter is wired into `index.html` for explicit upload, Safe Sync, and recovery. Safe Sync uses an in-memory baseline and refuses divergent snapshots; it does not run unattended, merge conflicting transactions, or automatically synchronize devices.
- Snapshot saves use an atomic database RPC with revision checks; database deployment and integration testing remain required. This is manual snapshot backup/recovery, **not** automatic multi-device synchronization.
- Cloud snapshots exclude settings.pin, settings.bridgeToken and settings.bridgeUrl. Local owner PIN protection is not a substitute for Supabase Auth.
- The schema stores JSON snapshots, not normalized financial transactions. Audit-grade financial ledgers and server-side authorization require further work.
- Recovery must be explicit, backed up, and verified. No unattended restoration.
- The print bridge remains local and should not be exposed to the internet.

## Safe Sync workflow
1. Sign in on the device containing the trusted source data. If cloud is empty, upload its first snapshot.
2. On another device, sign in and recover the cloud snapshot (after backing up any local data) to establish a baseline.
3. After local changes, choose **Sync safely**. It uploads only when the cloud still matches the baseline. A conflict never silently replaces data.
4. For a conflict, download both local and cloud backups, reconcile offline, then explicitly recover or upload the chosen copy. No automatic merge is implemented.
5. Session timers must not be active when syncing changes. Real Supabase end-to-end tests remain required before using this for live business data.

## Safety before PC/iPhone rollout
- Stop all active sessions before initial upload, Safe Sync upload, or cloud recovery. The UI blocks transferring active timers to avoid conflicting devices.
- Use one device as the active operator until live two-device testing confirms the workflow. Safe Sync is manual, not live collaboration.
- Verify a cloud snapshot's session totals and sales against a downloaded local JSON backup before recovering onto another device.
- A passing automated test run and real Supabase Auth/RLS tests are still required before treating cloud recovery as production-ready.
