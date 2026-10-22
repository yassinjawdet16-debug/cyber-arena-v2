# Cyber Arena V2 — manual acceptance checklist

## Before testing
- Export a JSON backup and keep it outside the browser.
- Use test sessions and test amounts; avoid modifying real sales records during testing.
- Ensure printer is 192.168.1.41:9100 and the local Windows bridge is running.

## Financial verification
- VIP-01 is 10,000 IQD/hour; PS5-02 through PS5-08 are 5,000; PS4-09 through PS4-16 are 3,000.
- Session charge rounds to nearest 250 IQD; verify 125 rounds up to 250.
- Apply a fixed discount after ending a session; verify daily totals and bill.
- Check that extra sales and cash adjustments are counted exactly once.
- Check that 6 AM Iraq-time archiving preserves income and receipts.
- Export and restore a backup in a disposable browser profile, not your production profile.

## Printer acceptance
- Print one test bill manually; confirm paper output.
- Check successful bridge acceptance moves bill to Printed.
- Disconnect the printer and verify the bill remains unprinted and an error appears.
- Reprint a previously printed bill and ensure it does not create a second income entry.

## Cloud acceptance
- Deploy and review schema.sql with Supabase Auth enabled.
- Use two authenticated test devices and verify owner isolation.
- Simulate simultaneous updates and verify stale revisions are rejected.
- Test recovery using a disposable profile and independently saved JSON backup.
- Do not enable automatic synchronization before these tests pass.

## Language acceptance
- Switch between English, Arabic, Badini and Sorani.
- Verify text direction and readability on iPhone.
- Have native speakers review translations and untranslated labels.

Mark each section complete only after recording the actual result and date.
