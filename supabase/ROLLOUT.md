# Cyber Arena V2 cloud rollout checklist

Current status: cloud adapter and SQL schema are staged, **not connected to the live website**. Do not treat cloud backups as active.

## Owner setup (required before live cloud sync)
1. Create a Supabase project and keep its database password and service_role key private.
2. Review and execute `supabase/schema.sql` in the SQL editor.
3. Enable Supabase Auth for the owner. Never store a service_role key in frontend code.
4. Use the project URL, public anon/publishable key, and authenticated user's access token with `CyberArenaCloud.config(url, key, token, userId)`.
5. Before uploading, download a JSON backup from the existing site and verify it opens.
6. Review cloud data and local data before any recovery. Do not overwrite a newer local copy automatically.
7. Test on a separate account and test database before production rollout.

## Limitations and security
- The adapter is not yet wired into `index.html`, and it does not automatically synchronize devices.
- Snapshot saves now use an atomic database RPC with revision checks, but this still requires database deployment, integration testing, and a conflict-resolution UX before automatic multi-device synchronization.
- Cloud snapshots exclude settings.pin, settings.bridgeToken and settings.bridgeUrl. Local owner PIN protection is not a substitute for Supabase Auth.
- The schema stores JSON snapshots, not normalized financial transactions. Audit-grade financial ledgers and server-side authorization require further work.
- Recovery must be explicit, backed up, and verified. No unattended restoration.
- The print bridge remains local and should not be exposed to the internet.
