# Cyber Arena V2

Cyber Arena V2 is a local-first PlayStation café manager for 16 stations.

## Business rules

- VIP-01: 10,000 IQD/hour
- PS5-02 through PS5-08: 5,000 IQD/hour
- PS4-09 through PS4-16: 3,000 IQD/hour
- Final session charges round to the nearest 250 IQD.
- Timed sessions alert at zero but keep running until the owner finishes them.
- The Iraq business day runs from 06:00 to 05:59. Daily archiving moves old session history into dated archives without erasing sales, income records, or bills.
- Clear History is PIN-protected and downloads a backup first. Full business-data reset is a separate destructive action.

## Data and release notes

The app stores records in the current browser's local storage. Use the JSON backup/export regularly and keep backups outside the device. Browser-local data does not automatically sync between phones; restoring a backup on another device is a manual operation.

The active development work is on `cyber-arena-v2-safe-updates`. It is intentionally separate from the live/default branch until the owner approves release. Automated smoke tests run on changes; they do not replace a full iPhone/browser test or a real paper-print test.

## Xprinter setup

The secured Windows LAN bridge and setup instructions are in [printer/README.md](printer/README.md). The bridge sends plain-text receipts to the printer's TCP port 9100 and requires a shared secret. Do not expose it to the public internet. HTTPS browser restrictions may prevent a hosted HTTPS page from calling a local HTTP bridge; test on the target iPhone/browser before release.

## Tests

Run the Node.js smoke tests:

```sh
node --test tests/smoke.test.mjs
```

Run the Python bridge security tests:

```sh
python -m unittest tests.test_printer_bridge
```

These automated tests cover core calculations, the Baghdad business-day boundary, archive/clear-history safety checks, receipt queue behavior, and bridge authentication/input validation. Hardware output, Wi-Fi/firewall access, and browser HTTPS restrictions require testing in the actual café setup.
