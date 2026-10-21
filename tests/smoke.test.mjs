import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(here, '../index.html'), 'utf8');
const scriptStart = html.indexOf('<script>') + '<script>'.length;
const scriptEnd = html.indexOf('</script>', scriptStart);
assert.ok(scriptStart >= '<script>'.length && scriptEnd > scriptStart, 'main script tag must exist');
const source = html.slice(scriptStart, scriptEnd);
new Function(source); // Parse-check the complete browser script.

const stationMatch = source.match(/const DEFAULT_STATIONS=\[([\s\S]*?)\n\];/);
assert.ok(stationMatch, 'default station list must exist');
const stations = [...stationMatch[1].matchAll(/\{id:'([^']+)',type:'([^']+)',rate:(\d+)\}/g)]
  .map((m) => ({ id: m[1], type: m[2], rate: Number(m[3]) }));

const chargeStart = source.indexOf('function round250(');
const chargeEnd = source.indexOf('function activeFor(', chargeStart);
assert.ok(chargeStart >= 0 && chargeEnd > chargeStart, 'charge helpers must exist');
const { round250, chargeFor } = new Function(
  source.slice(chargeStart, chargeEnd) + '; return { round250, chargeFor };'
)();

const timeStart = source.indexOf('function localDateKey(');
const timeEnd = source.indexOf('function defaultData(', timeStart);
assert.ok(timeStart >= 0 && timeEnd > timeStart, 'Baghdad date helpers must exist');
const { baghdadDayStart } = new Function(
  source.slice(timeStart, timeEnd) + '; return { baghdadDayStart };'
)();

test('all 16 stations and hourly prices match the business setup', () => {
  assert.equal(stations.length, 16);
  assert.deepEqual(stations[0], { id: 'VIP-01', type: 'VIP', rate: 10000 });
  assert.equal(stations.filter((s) => s.type === 'PS5').length, 7);
  assert.equal(stations.filter((s) => s.type === 'PS4').length, 8);
  assert.ok(stations.filter((s) => s.type === 'PS5').every((s) => s.rate === 5000));
  assert.ok(stations.filter((s) => s.type === 'PS4').every((s) => s.rate === 3000));
  assert.equal(stations.at(-1).id, 'PS4-16');
});

test('one-hour station charges use the configured rates', () => {
  assert.equal(chargeFor({ rate: 10000 }, 0, 3600000).final, 10000);
  assert.equal(chargeFor({ rate: 5000 }, 0, 3600000).final, 5000);
  assert.equal(chargeFor({ rate: 3000 }, 0, 3600000).final, 3000);
});

test('partial sessions and nearest-250 rounding work', () => {
  assert.equal(chargeFor({ rate: 3000 }, 0, 1800000).final, 1500);
  assert.equal(round250(1375), 1500);
  assert.equal(round250(1124), 1000);
});

test('invalid negative elapsed time cannot create a charge', () => {
  assert.equal(chargeFor({ rate: 3000 }, 3600000, 0).final, 0);
});

test('discount cannot make a session charge negative', () => {
  assert.equal(chargeFor({ rate: 5000 }, 0, 1800000, 9000).final, 0);
});

test('Baghdad business day changes at 06:00 local time', () => {
  assert.equal(baghdadDayStart(new Date('2026-10-21T02:59:00Z')), '2026-10-20'); // 05:59 Iraq
  assert.equal(baghdadDayStart(new Date('2026-10-21T03:00:00Z')), '2026-10-21'); // 06:00 Iraq
});

test('timed sessions alert without auto-finishing', () => {
  assert.match(source, /TIME EXPIRED — SESSION STILL RUNNING/);
  assert.match(source, /session is still running/);
  assert.doesNotMatch(source, /if\(expired\.length\)[\s\S]{0,1000}finishSession\(/);
});

test('clear history protects data with owner PIN and downloads backup first', () => {
  const start = source.indexOf('function clearHistoryProtected(');
  const end = source.indexOf('function fullResetProtected(', start);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /actionPin/);
  assert.match(fn, /backupJSON\(\)/);
  assert.match(fn, /if\(!save\(\)\)/);
});

test('printing requires bridge acceptance before marking a bill printed', () => {
  assert.match(source, /response\.accepted===true\|\|response\.status==='accepted'\|\|response\.success===true/);
  assert.match(source, /Browser print dialog requested\. Bill stays unprinted until a print bridge confirms acceptance/);
  assert.match(source, /text:billText\(b\),billId:b\.id/);
});

test('backup and CSV export functions are present', () => {
  for (const name of ['backupJSON', 'restoreJSON', 'exportCSV', 'exportSalesCSV', 'exportBillsCSV', 'exportCashCSV']) {
    assert.ok(source.includes('function ' + name + '('), name + ' should exist');
  }
});

test('restored archived sessions validate dates, rates, duration and charge', () => {
  assert.match(source, /businessDayForTimestamp\(row\.endedAt\)!==archiveDay/);
  assert.match(source, /Backup archive contains an invalid session record/);
  assert.match(source, /Backup contains an invalid archived session record/);
});
