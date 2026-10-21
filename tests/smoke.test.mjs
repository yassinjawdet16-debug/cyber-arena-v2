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
  assert.match(source, /function baghdadTime\(value\)/, 'active session start times must use an explicit Iraq timezone');
  assert.match(source, /baghdadTime\(a\.startedAt\)/, 'station timers must show start time in Iraq time');
  assert.doesNotMatch(source, /new Date\(a\.startedAt\)\.toLocaleTimeString\(\)/, 'station time must not depend on device timezone');
  assert.doesNotMatch(source, /if\(expired\.length\)[\s\S]{0,1000}finishSession\(/);
});

test('default owner PIN warning is visible until the owner changes the PIN', () => {
  assert.match(html, /id="defaultPinWarning"[^>]*role="status"/, 'PIN warning markup must be present in the page');
  assert.match(source, /data\.settings\.pin==='1234'\?'block':'none'/, 'warning must disappear after changing the default PIN');
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

test('print failure persistence is checked so stale sending state is not hidden', () => {
  const start = source.indexOf('async function printBill(');
  const end = source.indexOf('function ', start + 10);
  assert.ok(start >= 0 && end > start, 'print handler must exist');
  const fn = source.slice(start, end);
  assert.match(fn, /const uncertain=!!\(e&&\(e\.name==='AbortError'\|\|e instanceof TypeError\|\|\/HTTP 502\/\.test\(String\(e\.message\|\|''\)\)\)\);b\.jobStatus=uncertain\?'uncertain':'failed';const failureSaved=save\(\);renderBills\(\);/);
  assert.match(fn, /if\(!failureSaved\)\{b\.jobStatus=previousJobStatus;renderBills\(\);setStatus\('🔴 Printing failed, but browser storage could not save the failure status/);
  assert.match(fn, /This bill may still show as sending after reload/);
});


test('print bridge URLs normalize a base address to the /print endpoint', () => {
  const start = source.indexOf('function resolveBridgeUrl(');
  const end = source.indexOf('async function printBill(', start);
  assert.ok(start >= 0 && end > start, 'bridge URL resolver must exist');
  const { resolveBridgeUrl } = new Function(source.slice(start, end) + '; return { resolveBridgeUrl };')();
  assert.equal(resolveBridgeUrl('http://192.168.1.122:8787'), 'http://192.168.1.122:8787/print');
  assert.equal(resolveBridgeUrl('http://192.168.1.122:8787/'), 'http://192.168.1.122:8787/print');
  assert.equal(resolveBridgeUrl('http://192.168.1.122:8787/print'), 'http://192.168.1.122:8787/print');
  assert.throws(() => resolveBridgeUrl('ftp://192.168.1.122:8787'), /HTTP or HTTPS/);
  assert.throws(() => resolveBridgeUrl('http://192.168.1.122:8787/health'), /end in \/print/);
});


test('confirmed Xprinter address is the app default and print fallback', () => {
  assert.ok(source.includes("printerIp:'192.168.1.41'"));
  assert.ok(source.includes("data.settings.printerIp||'192.168.1.41'"));
  assert.ok(html.includes('placeholder="192.168.1.41"'));
});

test('backup and CSV export functions are present', () => {
  for (const name of ['backupJSON', 'restoreJSON', 'exportCSV', 'exportSalesCSV', 'exportBillsCSV', 'exportCashCSV']) {
    assert.ok(source.includes('function ' + name + '('), name + ' should exist');
  }
});

test('backup restore validates imported data before replacing live data or downloading the safety backup', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  const validation = fn.indexOf("throw Error('Backup contains an invalid or duplicate cash movement')");
  const snapshot = fn.indexOf('const previousData=data;');
  const backup = fn.indexOf('backupJSON();');
  const replace = fn.indexOf('data=imported;');
  assert.ok(validation >= 0 && snapshot > validation, 'all record validation should happen before snapshot/commit');
  assert.ok(backup > validation && backup < replace, 'safety backup must be downloaded only after validation and before replacement');
  assert.ok(replace > backup, 'live data replacement must occur after the safety backup');
  assert.match(fn, /catch\(commitError\)\{data=previousData;/, 'failed commit should restore the prior in-memory data');
});

test('backup restore reports when the selected file cannot be read', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /reader\.onerror=\(\)=>setStatus\('🔴 Could not read the backup file/);
  assert.match(fn, /reader\.readAsText\(f\)/);
});

test('backup restore rejects unsafe sale totals and cash movement amounts', () => {
  assert.match(source, /Number\.isSafeInteger\(Number\(row\.qty\)\*Number\(row\.unitPrice\)\)/);
  assert.match(source, /Number\.isSafeInteger\(Number\(row\.total\)\)/);
  assert.match(source, /Number\.isSafeInteger\(Number\(row\.amount\)\).*Backup contains an invalid or duplicate cash movement/);
  assert.match(source, /typeof row\.name!=='string'\|\|!row\.name\.trim\(\)/);
});

test('restored archived sessions validate dates, rates, duration and charge', () => {
  assert.match(source, /businessDayForTimestamp\(row\.endedAt\)!==archiveDay/);
  assert.match(source, /Backup archive contains an invalid session record/);
  assert.match(source, /Backup contains an invalid archived session record/);
});

test('history table escapes imported station labels and bill statuses', () => {
  const start = source.indexOf('function renderHistory(');
  const end = source.indexOf('function archiveEligible(', start);
  assert.ok(start >= 0 && end > start, 'history renderer must exist');
  const fn = source.slice(start, end);
  assert.match(fn, /escapeHTML\(s\.stationId\)/, 'station labels must be escaped in history');
  assert.match(fn, /escapeHTML\(b\.status\)/, 'bill statuses must be escaped in history');
  assert.match(fn, /baghdadDateTime\(s\.startedAt\)/, 'history start times must display in Iraq time');
  assert.match(fn, /baghdadDateTime\(s\.endedAt\)/, 'history end times must display in Iraq time');
  assert.doesNotMatch(fn, /new Date\(s\.(?:startedAt|endedAt)\)\.toLocaleString\(\)/, 'history times must not depend on the device timezone');
  assert.doesNotMatch(fn, /<td>\$\{s\.stationId\}<\/td>/, 'raw station labels must not enter HTML');
});

test('daily archiving moves old sessions and preserves sales and cash records', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /data\.archives/);
  assert.match(fn, /data\.sessions=keep/);
  assert.match(fn, /b\.archived=true/);
  assert.doesNotMatch(fn, /data\.sales\s*=/);
  assert.doesNotMatch(fn, /data\.adjustments\s*=/);
  assert.match(fn, /if\(!save\(\)\)\{data=JSON\.parse\(previousData\)/);
});

test('daily archive leaves active sessions and financial source records intact', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end);
  assert.doesNotMatch(fn, /data\.active\s*=/, 'active sessions must keep running through the daily archive');
  assert.doesNotMatch(fn, /delete\s+data\.active/, 'daily archive must not delete active sessions');
  assert.doesNotMatch(fn, /data\.sales\s*=/, 'sales history must be retained');
  assert.doesNotMatch(fn, /data\.adjustments\s*=/, 'cash movements must be retained');
  assert.doesNotMatch(fn, /data\.bills\s*=\s*\[\]/, 'bills must be archived, not deleted');
  assert.match(fn, /b\.archived=true/, 'old bills should be marked archived');
});

test('Clear History archives sessions without deleting sales or bills', () => {
  const start = source.indexOf('function clearHistoryProtected(');
  const end = source.indexOf('function fullResetProtected(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /data\.sessions=\[\]/);
  assert.match(fn, /data\.archives/);
  assert.doesNotMatch(fn, /data\.sales\s*=/);
  assert.doesNotMatch(fn, /data\.bills\s*=/);
});

test('daily archive preserves active sessions, sales, cash movements, and unprinted bill state', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  const fn = source.slice(start, end);
  assert.doesNotMatch(fn, /data\.active\s*=/, 'daily archiving must not replace active sessions');
  assert.doesNotMatch(fn, /data\.sales\s*=/, 'daily archiving must preserve extra sales');
  assert.doesNotMatch(fn, /data\.adjustments\s*=/, 'daily archiving must preserve cash movements');
  assert.doesNotMatch(fn, /b\.status\s*=\s*'printed'/, 'archiving must not mark an unprinted bill as printed');
  assert.match(fn, /data\.bills/, 'daily archiving may archive bills without deleting them');
  assert.match(fn, /if\(!save\(\)\)\{data=JSON\.parse\(previousData\)/, 'failed archive saves must restore the original data');
});

test('daily archive only archives bills and preserves each bill print state', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /for\(const b of data\.bills\)/, 'archiving must iterate over existing bills rather than replace the bill list');
  assert.match(fn, /b\.archived=true/, 'eligible bills should be marked archived');
  assert.doesNotMatch(fn, /data\.bills\s*=\s*\[\]/, 'daily archiving must not clear the bill queue');
  assert.doesNotMatch(fn, /b\.status\s*=\s*['\"]printed['\"]/, 'archiving must never turn an unprinted bill into a printed bill');
  assert.doesNotMatch(fn, /b\.jobStatus\s*=\s*['\"]accepted['\"]/, 'archiving must not fabricate printer bridge acceptance');
  assert.match(fn, /const day=b\.businessDay\|\|businessDayForTimestamp\(b\.createdAt\);b\.businessDay=day/, 'older bills without a business-day field should get a date without being deleted');
});

test('manual archive preserves financial records and rolls back on save failure', () => {
  const start = source.indexOf('function manualArchive(');
  const end = source.indexOf('function clearHistoryProtected(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /data\.sessions=\[\]/, 'manual archive clears only the visible completed-session list');
  assert.doesNotMatch(fn, /data\.sales\s*=/, 'manual archive must not replace extra sales');
  assert.doesNotMatch(fn, /data\.adjustments\s*=/, 'manual archive must not replace cash movements');
  assert.doesNotMatch(fn, /data\.bills\s*=\s*\[\]/, 'manual archive must not delete bills');
  assert.match(fn, /const archive=data\.archives\[d\]\?\?=\[\]/, 'completed sessions must be moved into dated archives');
  assert.match(fn, /if\(!save\(\)\)\{data=JSON\.parse\(previousData\)/, 'failed save must restore the original session list');
});

test('interrupted print jobs return to the unprinted queue with uncertain status on reload', () => {
  const start = source.indexOf('function normalize(');
  const end = source.indexOf('function save(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /b\.jobStatus==='sending'/);
  assert.match(fn, /b\.jobStatus='uncertain'/);
  assert.match(fn, /b\.status!=='printed'\)b\.status='unprinted'/);
});

test('completed sessions create a bill and a cash movement with rollback protection', () => {
  const start = source.indexOf('function finishSession(');
  const end = source.indexOf('function extendSession(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /data\.sessions\.unshift\(sess\)/);
  assert.match(fn, /data\.bills\.unshift\(bill\)/);
  assert.match(fn, /data\.adjustments\.push/);
  assert.match(fn, /if\(!save\(\)\)\{data=JSON\.parse\(previousData\)/);
});

test('manual bills begin unprinted and are retained when saving fails', () => {
  const start = source.indexOf('function makeManualBill(');
  const end = source.indexOf('function ', start + 10);
  const fn = source.slice(start, end);
  assert.match(fn, /status:'unprinted'/);
  assert.match(fn, /if\(!save\(\)\)\{data=JSON\.parse\(previousData\)/);
});

test('daily archive retains bills and active sessions instead of deleting them', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /for\(const b of data\.bills\)/);
  assert.match(fn, /b\.archived=true/);
  assert.doesNotMatch(fn, /data\.bills\s*=\s*\[\]/);
  assert.doesNotMatch(fn, /data\.active\s*=\s*\{\}/);
});

test('receipt designer clamps paper width and restores settings after save failure', () => {
  const start = source.indexOf('function saveReceiptDesigner(');
  const end = source.indexOf('function renderReceiptDesigner(', start);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /Math\.max\(24,Math\.min\(48/);
  assert.match(fn, /\['small','normal','large'\]\.includes\(size\)/);
  assert.match(fn, /if\(!save\(\)\)\{data\.settings=JSON\.parse\(previous\)/);
});

test('backup restore rejects duplicate IDs and rolls storage back on failure', () => {
  const start = source.indexOf('function restoreJSON(');
  const end = source.indexOf('function csvCell(', start);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /validateUniqueIds\(imported\.sessions,'session'\)/);
  assert.match(fn, /validateUniqueIds\(imported\.bills,'bill'\)/);
  assert.match(fn, /Number\(row\.amount\)%250!==0/, 'restored bill totals must use valid 250 IQD increments');
  assert.match(fn, /Number\(row\.rawCharge\?\?row\.amount\)/, 'restored bill original amount must be validated');
  assert.match(fn, /Number\(row\.discount\?\?0\)%250!==0/, 'restored bill discounts must use valid 250 IQD increments');
  assert.match(fn, /!\['session','manual'\]\.includes\(row\.kind\)/, 'unknown bill kinds must be rejected');
  assert.match(fn, /Number\(row\.rate\)!==DEFAULT_STATIONS\.find\(x=>x\.id===row\.stationId\)\.rate/, 'session bills must match the station hourly rate');
  assert.match(fn, /Number\(row\.charge\)%250!==0/, 'completed session charges must use 250 IQD increments');
  assert.match(fn, /Number\(row\.discount\)%250!==0/, 'completed session discounts must use 250 IQD increments');
  assert.match(fn, /Number\(a\.discount\?\?0\)%250!==0/, 'active session discounts must use 250 IQD increments');
  assert.match(fn, /const previousStorage=localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(fn, /Previous data was restored where browser storage allowed/);
  assert.ok(fn.indexOf('data=previousData') < fn.indexOf('localStorage.removeItem(STORAGE_KEY)'), 'in-memory data must be restored before attempting storage rollback');
  assert.ok(fn.indexOf('localStorage.setItem(STORAGE_KEY,previousStorage)') < fn.indexOf("throw Error('Restore could not be saved."), 'storage rollback must be attempted before reporting restore failure');
  assert.ok(fn.indexOf('backupJSON();try{data=imported') >= 0, 'the existing data backup must be prepared before imported data is committed');
});

test('daily archive function moves old sessions and bills while preserving active sessions and financial records', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  assert.ok(start >= 0 && end > start);
  const archiveSource = source.slice(start, end);
  const oldSession = { id: 'old-session', stationId: 'PS5-02', endedAt: 1 };
  const currentSession = { id: 'today-session', stationId: 'PS5-03', endedAt: 2 };
  const oldBill = { id: 'old-bill', createdAt: 1, businessDay: '2026-10-20', status: 'unprinted' };
  const currentBill = { id: 'today-bill', createdAt: 2, businessDay: '2026-10-21', status: 'unprinted' };
  const data = {
    lastArchiveDay: null,
    sessions: [oldSession, currentSession],
    archives: {},
    bills: [oldBill, currentBill],
    active: { 'PS4-09': { id: 'active-session' } },
    sales: [{ id: 'sale', total: 1000 }],
    adjustments: [{ id: 'cash', amount: -250 }]
  };
  const originalSales = JSON.stringify(data.sales);
  const originalAdjustments = JSON.stringify(data.adjustments);
  let renders = 0;
  let lastStatus = '';
  const archiveEligible = new Function(
    'data', 'baghdadDayStart', 'businessDayForTimestamp', 'save', 'renderAll', 'setStatus',
    archiveSource + '; return archiveEligible;'
  )(
    data,
    () => '2026-10-21',
    (ts) => ts === 1 ? '2026-10-20' : '2026-10-21',
    () => true,
    () => { renders++; },
    (message) => { lastStatus = message; }
  );
  assert.equal(archiveEligible(), true);
  assert.deepEqual(data.sessions.map(s => s.id), ['today-session']);
  assert.deepEqual(data.archives['2026-10-20'].map(s => s.id), ['old-session']);
  assert.equal(data.archives['2026-10-20'][0].archived, true);
  assert.equal(data.bills[0].archived, true);
  assert.equal(data.bills[1].archived, undefined);
  assert.ok(data.active['PS4-09'], 'active session must remain untouched');
  assert.equal(JSON.stringify(data.sales), originalSales);
  assert.equal(JSON.stringify(data.adjustments), originalAdjustments);
  assert.equal(renders, 1);
  assert.match(lastStatus, /Financial records preserved/);
});

test('daily archive is idempotent when checked repeatedly on the same business day', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  const archiveSource = source.slice(start, end);
  const data = {
    lastArchiveDay: null,
    sessions: [{ id: 'old-session', stationId: 'PS5-02', endedAt: 1 }],
    archives: { '2026-10-20': [{ id: 'old-session', stationId: 'PS5-02', endedAt: 1, archived: true }] },
    bills: [{ id: 'old-bill', createdAt: 1, businessDay: '2026-10-20', status: 'unprinted' }],
    active: { 'PS4-09': { id: 'active-session' } },
    sales: [{ id: 'sale', total: 1000 }],
    adjustments: [{ id: 'cash', amount: -250 }]
  };
  let saves = 0;
  const archiveEligible = new Function(
    'data', 'baghdadDayStart', 'businessDayForTimestamp', 'save', 'renderAll', 'setStatus',
    archiveSource + '; return archiveEligible;'
  )(data, () => '2026-10-21', () => '2026-10-20', () => { saves++; return true; }, () => {}, () => {});
  assert.equal(archiveEligible(), true);
  assert.equal(data.archives['2026-10-20'].filter(s => s.id === 'old-session').length, 1, 'existing archived sessions must not be duplicated');
  assert.equal(data.sessions.length, 0);
  const afterFirstRun = JSON.stringify(data);
  assert.equal(archiveEligible(), false, 'same-day repeat should be a no-op');
  assert.equal(JSON.stringify(data), afterFirstRun);
  assert.equal(saves, 1, 'a repeat same-day check should not save again');
  assert.equal(data.bills[0].archived, true);
  assert.ok(data.active['PS4-09'], 'active sessions remain untouched');
  assert.equal(data.sales[0].total, 1000);
  assert.equal(data.adjustments[0].amount, -250);
});

test('daily archive rolls back all changes when storage save fails', () => {
  const start = source.indexOf('function archiveEligible(');
  const end = source.indexOf('function manualArchive(', start);
  const archiveSource = source.slice(start, end);
  const data = {
    lastArchiveDay: null,
    sessions: [{ id: 'old-session', stationId: 'PS5-02', endedAt: 1 }],
    archives: {},
    bills: [{ id: 'old-bill', createdAt: 1, businessDay: '2026-10-20', status: 'unprinted' }],
    active: {},
    sales: [{ id: 'sale', total: 1000 }],
    adjustments: []
  };
  const before = JSON.stringify(data);
  const harness = new Function(
    'initialData', 'baghdadDayStart', 'businessDayForTimestamp', 'save', 'renderAll', 'setStatus',
    'let data=initialData;' + archiveSource + '; return {archiveEligible, getData:()=>data};'
  )(
    data,
    () => '2026-10-21',
    () => '2026-10-20',
    () => false,
    () => {},
    () => {}
  );
  assert.equal(harness.archiveEligible(), false);
  assert.equal(JSON.stringify(harness.getData()), before);
});

function makePrintBillHarness({ bridgeResponse, bridgeError, saveResults = [true, true], initialStatus = 'unprinted', initialJobStatus = 'not-sent', confirmResult = false }) {
  const start = source.indexOf('async function printBill(');
  const end = source.indexOf('function reprintBill(', start);
  assert.ok(start >= 0 && end > start, 'printBill function must exist');
  const printSource = source.slice(start, end);
  const bill = {
    id: 'bill-test-1',
    status: initialStatus,
    jobStatus: initialJobStatus,
    amount: 5000,
    stationId: 'PS5-02'
  };
  const data = { bills: [bill], settings: { bridgeUrl: 'http://192.168.1.122:8787/print', bridgeToken: 'test-token', printerIp: '192.168.1.41' } };
  const statuses = [];
  const renderCalls = [];
  let saveCount = 0;
  const mockFetch = async () => {
    if (bridgeError) throw bridgeError;
    return { ok: true, status: 200, json: async () => bridgeResponse };
  };
  const document = { getElementById: () => ({ innerHTML: '', classList: { remove() {}, add() {} } }), body: { classList: { add() {}, remove() {} } } };
  const printBill = new Function(
    'data', 'resolveBridgeUrl', 'save', 'renderBills', 'setStatus', 'fetch', 'billText',
    'AbortController', 'setTimeout', 'clearTimeout', 'Date', 'renderAll', 'document',
    'window', 'escapeHTML', 'confirm',
    printSource + '; return printBill;'
  )(
    data,
    (value) => value,
    () => saveResults[Math.min(saveCount++, saveResults.length - 1)],
    () => renderCalls.push('bills'),
    (message) => statuses.push(message),
    mockFetch,
    () => 'TEST RECEIPT',
    AbortController,
    (fn) => globalThis.setTimeout(fn, 100000),
    (id) => globalThis.clearTimeout(id),
    Date,
    () => renderCalls.push('all'),
    document,
    { print() {} },
    (value) => String(value),
    () => confirmResult
  );
  return { printBill, bill, data, statuses, renderCalls };
}


test('accepted bridge with failed printed-status save never reports a green success', async () => {
  const h = makePrintBillHarness({ bridgeResponse: { accepted: true }, saveResults: [true, false] });
  await h.printBill(h.bill.id);
  assert.equal(h.bill.status, 'printed', 'bridge acceptance is retained in the current view');
  assert.equal(h.bill.jobStatus, 'accepted');
  assert.match(h.statuses.at(-1), /browser could not save its printed status/);
  assert.doesNotMatch(h.statuses.at(-1), /🟢/);
  assert.match(h.statuses.at(-1), /Do not press Print again yet/);
});

test('accepted printer bridge job is marked printed only after save succeeds', async () => {
  const h = makePrintBillHarness({ bridgeResponse: { accepted: true }, saveResults: [true, true] });
  await h.printBill(h.bill.id);
  assert.equal(h.bill.status, 'printed');
  assert.equal(h.bill.jobStatus, 'accepted');
  assert.ok(Number.isFinite(h.bill.printedAt));
  assert.match(h.statuses.at(-1), /accepted the job and its status was saved/);
  assert.match(h.statuses.at(-1), /Physical paper output is not independently verified/);
});

test('ambiguous printer network failures mark a bill uncertain and warn against blind retry', async () => {
  const h = makePrintBillHarness({ bridgeError: new TypeError('Failed to fetch'), saveResults: [true, true] });
  await h.printBill(h.bill.id);
  assert.equal(h.bill.status, 'unprinted');
  assert.equal(h.bill.jobStatus, 'uncertain');
  assert.match(h.statuses.at(-1), /Print result is uncertain/);
  assert.match(h.statuses.at(-1), /duplicate receipt is possible/);
});

test('printer bridge HTTP 502 is treated as an uncertain print result', async () => {
  const h = makePrintBillHarness({ bridgeError: new Error('Bridge returned HTTP 502'), saveResults: [true, true] });
  await h.printBill(h.bill.id);
  assert.equal(h.bill.status, 'unprinted');
  assert.equal(h.bill.jobStatus, 'uncertain');
  assert.match(h.statuses.at(-1), /Print result is uncertain/);
});

test('uncertain print retry requires explicit confirmation', async () => {
  const h = makePrintBillHarness({ bridgeResponse: { accepted: true }, initialJobStatus: 'uncertain', confirmResult: false });
  await h.printBill(h.bill.id);
  assert.equal(h.bill.status, 'unprinted');
  assert.equal(h.bill.jobStatus, 'uncertain');
  assert.match(h.statuses.at(-1), /Check the printer before retrying/);
});

test('printer bridge rejection leaves the bill unprinted and reports failure', async () => {
  const h = makePrintBillHarness({ bridgeResponse: { accepted: false, message: 'Printer offline' }, saveResults: [true, true] });
  await h.printBill(h.bill.id);
  assert.equal(h.bill.status, 'unprinted');
  assert.equal(h.bill.jobStatus, 'failed');
  assert.match(h.statuses.at(-1), /Printing failed: Printer offline/);
});

test('accepted bridge job with failed status save warns against duplicate printing', async () => {
  const h = makePrintBillHarness({ bridgeResponse: { accepted: true }, saveResults: [true, false] });
  await h.printBill(h.bill.id);
  assert.equal(h.bill.status, 'printed');
  assert.equal(h.bill.jobStatus, 'accepted');
  assert.match(h.statuses.at(-1), /could not save its printed status/);
  assert.match(h.statuses.at(-1), /Do not press Print again yet/);
});

function makeFinishSessionHarness({ saveResult = true } = {}) {
  const start = source.indexOf('function finishSession(');
  const end = source.indexOf('function extendSession(', start);
  assert.ok(start >= 0 && end > start, 'finishSession function must exist');
  const finishSource = source.slice(start, end);
  const startedAt = Date.now() - 60 * 60 * 1000;
  const data = {
    stations: [{ id: 'PS5-02', rate: 5000, type: 'PS5' }],
    active: { 'PS5-02': { id: 'session-1', stationId: 'PS5-02', startedAt, rate: 5000, discount: 0 } },
    sessions: [], bills: [], adjustments: [],
    settings: { pin: '1234' }
  };
  const statuses = [];
  const calls = [];
  let uidCounter = 0;
  const helpers = {
    activeFor: (id) => data.active[id],
    chargeFor: (station, from, to, discount) => ({ raw: 5000, final: 5000, discount: discount || 0, mins: 60 }),
    uid: (prefix) => prefix + '-' + (++uidCounter),
    baghdadDayStart: () => '2026-10-21',
    localDateKey: () => '2026-10-21',
    save: () => saveResult,
    renderAll: () => calls.push('renderAll'),
    setStatus: (message) => statuses.push(message),
    openBillPreview: (id) => calls.push('preview:' + id)
  };
  const harness = new Function(
    'initialData', 'helpers', 'Date', 'JSON',
    `let data=initialData;
    const {activeFor,chargeFor,uid,baghdadDayStart,localDateKey,save,renderAll,setStatus,openBillPreview}=helpers;
    ${finishSource}
    return {finishSession,getData:()=>data};`
  )(data, helpers, Date, JSON);
  return { ...harness, statuses, calls };
}

test('finishing a session creates exactly one bill and a cash movement', () => {
  const h = makeFinishSessionHarness();
  h.finishSession('PS5-02');
  const data = h.getData();
  assert.equal(data.active['PS5-02'], undefined);
  assert.equal(data.sessions.length, 1);
  assert.equal(data.sessions[0].charge, 5000);
  assert.equal(data.bills.length, 1);
  assert.equal(data.bills[0].status, 'unprinted');
  assert.equal(data.bills[0].sessionId, data.sessions[0].id);
  assert.equal(data.adjustments.length, 1);
  assert.equal(data.adjustments[0].amount, 5000);
  assert.ok(h.calls.includes('preview:' + data.bills[0].id));
});


test('duplicate session completion is blocked before creating a second bill or cash movement', () => {
  const h = makeFinishSessionHarness();
  const data = h.getData();
  data.sessions.push({ id: 'session-1', charge: 5000 });
  h.finishSession('PS5-02');
  assert.ok(data.active['PS5-02'], 'active session should remain available for manual review');
  assert.equal(data.sessions.length, 1);
  assert.equal(data.bills.length, 0);
  assert.equal(data.adjustments.length, 0);
  assert.match(h.statuses.at(-1), /Duplicate session completion blocked/);
});

test('invalid saved hourly rate blocks session completion without changing records', () => {
  const h = makeFinishSessionHarness();
  const data = h.getData();
  data.active['PS5-02'].rate = 3000;
  h.finishSession('PS5-02');
  assert.ok(data.active['PS5-02']);
  assert.equal(data.sessions.length, 0);
  assert.equal(data.bills.length, 0);
  assert.equal(data.adjustments.length, 0);
  assert.match(h.statuses.at(-1), /hourly rate is invalid/);
});

test('failed save while finishing a session restores the active session and creates no records', () => {
  const h = makeFinishSessionHarness({ saveResult: false });
  h.finishSession('PS5-02');
  const data = h.getData();
  assert.ok(data.active['PS5-02']);
  assert.equal(data.sessions.length, 0);
  assert.equal(data.bills.length, 0);
  assert.equal(data.adjustments.length, 0);
  assert.match(h.statuses.at(-1), /could not be saved/);
});

test('Arabic rerender applies translations without repeatedly saving language settings', () => {
  const start = source.indexOf('function toggleLanguage(');
  const end = source.indexOf('function ', start + 10);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end);
  assert.match(fn, /function toggleLanguage\(force,silent=false\)/);
  assert.match(fn, /if\(!silent\)\{[\s\S]*?if\(!save\(\)\)/);
  assert.match(source, /if\(data\.settings\.language==='ar'\)toggleLanguage\('ar',true\)/);
});

test('main menu starts closed and closes after selecting a section', () => {
  assert.match(html, /id="mainMenu" class="tabs no-print menu-hidden"/);
  assert.match(source, /function toggleMainMenu\(\)/);
  assert.match(source, /menu\.classList\.remove\('menu-open'\);menu\.classList\.add\('menu-hidden'\)/);
  assert.match(source, /setAttribute\('aria-expanded','false'\)/);
});

test('all unprinted bills remain queued across the daily archive; only old printed bills move to archive view', () => {
  const start = source.indexOf('function renderBills(');
  const end = source.indexOf('function ', start + 10);
  const fn = source.slice(start, end);
  assert.match(fn, /const un=data\.bills\.filter\(b=>b\.status!=='printed'\)/, 'unprinted bills must remain in the queue regardless of business day');
  assert.match(fn, /const livePrinted=data\.bills\.filter\(b=>b\.status==='printed'&&!b\.archived/);
  assert.match(fn, /const oldPrinted=data\.bills\.filter\(b=>b\.status==='printed'&&\(b\.archived\|\|/);
  assert.match(fn, /getElementById\('archivedBills'\)/);
  assert.match(fn, /data\.bills\.length/, 'rendering must not delete bill records');
});

test('timed session controls reject zero, negative, and fractional durations', () => {
  const start = source.indexOf('function startSession(');
  const end = source.indexOf('function ', start + 10);
  const fn = source.slice(start, end);
  assert.match(fn, /Number\(durationMinutes\)<=0/);
  assert.match(fn, /Number\.isSafeInteger\(Number\(durationMinutes\)\)/);
  assert.match(fn, /endsAt:duration\?now\+duration\*60000:null/);
});

test('global status messages are announced accessibly and use outcome colors', () => {
  assert.match(html, /<div(?=[^>]*id="globalStatus")(?=[^>]*role="status")(?=[^>]*aria-live="polite")(?=[^>]*aria-atomic="true")[^>]*>/);
  assert.match(source, /function setStatus\(msg,kind=''\)/);
  assert.match(source, /el\.textContent=msg/);
  assert.match(source, /String\(msg\)\.startsWith\('🟢'\)\?'green'/);
  assert.match(source, /String\(msg\)\.startsWith\('🔴'\)\?'red'/);
  assert.match(source, /String\(msg\)\.startsWith\('⚠️'\)\|\|String\(msg\)\.startsWith\('🟠'\)\?'gold'/);
});

test('bill center does not silently truncate same-day printed bills or archived receipts', () => {
  const start = source.indexOf('function renderBills(');
  const end = source.indexOf('function ', start + 10);
  const fn = source.slice(start, end);
  assert.match(fn, /const livePrinted=data\.bills\.filter\(b=>b\.status==='printed'&&!b\.archived&&/);
  assert.match(fn, /const oldPrinted=data\.bills\.filter\(b=>b\.status==='printed'&&\(b\.archived\|\|/);
  assert.match(fn, /const un=data\.bills\.filter\(b=>b\.status!=='printed'\)/);
  assert.doesNotMatch(fn, /livePrinted\.slice\(0,100\)|oldPrinted\.slice\(0,100\)/);
});

test('CSV exports quote cells and neutralize spreadsheet formulas in user-controlled text', () => {
  const start = source.indexOf('function csvCell(');
  const end = source.indexOf('function ', start + 10);
  assert.ok(start >= 0 && end > start);
  const csvCell = new Function(source.slice(start, end) + '; return csvCell;')();
  assert.equal(csvCell('ordinary text'), '"ordinary text"');
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell('=HYPERLINK("https://bad.example","click")'), '"\'=HYPERLINK(""https://bad.example"",""click"")"');
  assert.equal(csvCell('  +SUM(A1:A2)'), '"\'  +SUM(A1:A2)"');
  assert.equal(csvCell('@command'), '"\'@command"');
  assert.equal(csvCell(-250), '"-250"', 'numeric negative cash movements remain numeric data, not formula text');
  assert.equal(csvCell(null), '""');
});

test('sales table does not silently hide older extra-sale records', () => {
  const start = source.indexOf('function renderSales(');
  const end = source.indexOf('function ', start + 10);
  const fn = source.slice(start, end);
  assert.match(fn, /data\.sales\.map\(s=>/);
  assert.doesNotMatch(fn, /data\.sales\.slice\(0,\s*200\)/);
  assert.match(fn, /escapeHTML\(s\.name\)/, 'product names must be HTML-escaped');
});

test('static HTML event handlers reference existing app functions', () => {
  const declared = new Set([...source.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
  const handlerAttrs = [...html.matchAll(/\son(?:click|change|input|submit|keydown|keyup|focus|blur)\s*=\s*"([^"]*)"/g)].map(m => m[1]);
  assert.ok(handlerAttrs.length > 0, 'expected inline UI handlers to be checked');
  const builtins = new Set(['if','confirm','alert','prompt','setTimeout','clearTimeout','setInterval','clearInterval','Number','String','Date','Math','JSON','open','print','focus','click','remove','add','set','stopPropagation','preventDefault','closest','querySelector','querySelectorAll','getElementById']);
  const missing = new Set();
  for (const handler of handlerAttrs) {
    for (const match of handler.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = match[1];
      if (!declared.has(name) && !builtins.has(name) && !['event','window','document','this'].includes(name)) missing.add(name);
    }
  }
  assert.deepEqual([...missing], [], 'every app function used by static HTML handlers must be defined');
});

test('bill cards visibly warn when a prior print result is uncertain', () => {
  const start = source.indexOf('function billCard(b)');
  const end = source.indexOf('function ', start + 10);
  const fn = source.slice(start, end);
  assert.match(fn, /b\.jobStatus==='uncertain'\?'UNPRINTED • CHECK PRINTER':'UNPRINTED'/);
  assert.match(fn, /b\.jobStatus==='uncertain'\?'⚠️ Retry print':'🖨️ Print'/);
});

test('bill cards HTML-escape bill IDs and station labels before rendering', () => {
  const start = source.indexOf('function billCard(b)');
  const end = source.indexOf('function ', start + 10);
  const fn = source.slice(start, end);
  assert.match(fn, /escapeHTML\(b\.id\)/, 'bill ID must be escaped');
  assert.match(fn, /escapeHTML\(b\.stationId\)/, 'station label must be escaped');
  assert.match(source, /function inlineArg\(value\)\{return escapeHTML\(JSON\.stringify\(String\(value\)\)\.replace\(\/<\/g,'\\\\u003c'\)\)\}/, 'IDs must be encoded as JavaScript string literals and HTML-escaped');
  assert.match(fn, /printBill\(\$\{inlineArg\(b\.id\)\}\)/);
  assert.match(fn, /openBillPreview\(\$\{inlineArg\(b\.id\)\}\)/);
  assert.match(fn, /reprintBill\(\$\{inlineArg\(b\.id\)\}\)/);
  assert.match(fn, /exportSingleBill\(\$\{inlineArg\(b\.id\)\}\)/);
  assert.doesNotMatch(fn, /(?:printBill|openBillPreview|reprintBill|exportSingleBill)\('\$\{b\.id\}'\)/, 'raw imported IDs must never be interpolated into JavaScript handlers');
});


test('discount is subtracted before final 250-IQD rounding', () => {
  const result = chargeFor({ rate: 5000 }, 0, 3600000, 250);
  assert.equal(result.raw, 5000);
  assert.equal(result.discount, 250);
  assert.equal(result.final, 4750);
});

test('discount input is clamped and cannot increase or make a charge negative', () => {
  assert.equal(chargeFor({ rate: 5000 }, 0, 3600000, -300).final, 5000);
  assert.equal(chargeFor({ rate: 5000 }, 0, 3600000, 9000).final, 0);
  assert.equal(chargeFor({ rate: 5000 }, 0, 3600000, 'not-a-number').final, 5000);
});

test('250-IQD rounding handles exact ties and values around the boundary', () => {
  assert.equal(round250(1124), 1000);
  assert.equal(round250(1125), 1250);
  assert.equal(round250(1374), 1250);
  assert.equal(round250(1375), 1500);
  assert.equal(round250(0), 0);
});


function makeAddSaleHarness({ saveResult = true, name = 'Water', qty = '2', price = '750' } = {}) {
  const start = source.indexOf('function addSale()');
  const end = source.indexOf('function openCashAdjustment(', start);
  assert.ok(start >= 0 && end > start, 'addSale function must exist');
  const saleSource = source.slice(start, end);
  const elements = {
    saleName: { value: name },
    saleQty: { value: qty },
    salePrice: { value: price }
  };
  const data = { sales: [], adjustments: [] };
  const statuses = [];
  const calls = [];
  let uidCounter = 0;
  const addSale = new Function(
    'initialData', 'elements', 'helpers', 'Date', 'JSON',
    `let data=initialData;
    const document={getElementById:(id)=>elements[id]};
    const {baghdadDayStart,localDateKey,uid,save,renderAll,setStatus}=helpers;
    ${saleSource}
    return {addSale,getData:()=>data};`
  )(
    data,
    elements,
    {
      baghdadDayStart: () => '2026-10-21',
      localDateKey: () => '2026-10-21',
      uid: (prefix) => prefix + '-' + (++uidCounter),
      save: () => saveResult,
      renderAll: () => calls.push('renderAll'),
      setStatus: (message) => statuses.push(message)
    },
    Date,
    JSON
  );
  return { ...addSale, elements, statuses, calls };
}

test('extra sale records the sale and matching cash movement exactly once', () => {
  const h = makeAddSaleHarness();
  h.addSale();
  const data = h.getData();
  assert.equal(data.sales.length, 1);
  assert.deepEqual(
    { name: data.sales[0].name, qty: data.sales[0].qty, unitPrice: data.sales[0].unitPrice, total: data.sales[0].total },
    { name: 'Water', qty: 2, unitPrice: 750, total: 1500 }
  );
  assert.equal(data.sales[0].businessDay, '2026-10-21');
  assert.equal(data.adjustments.length, 1);
  assert.equal(data.adjustments[0].kind, 'sale');
  assert.equal(data.adjustments[0].amount, 1500);
  assert.match(data.adjustments[0].description, /2 × Water/);
  assert.equal(h.elements.saleName.value, '');
  assert.equal(h.elements.saleQty.value, '1');
  assert.equal(h.elements.salePrice.value, '');
});

test('invalid extra-sale quantity or price creates no financial records', () => {
  for (const options of [{ qty: '0' }, { qty: '1.5' }, { price: '-250' }, { price: '12.5' }]) {
    const h = makeAddSaleHarness(options);
    h.addSale();
    assert.equal(h.getData().sales.length, 0);
    assert.equal(h.getData().adjustments.length, 0);
    assert.match(h.statuses.at(-1), /Quantity must be|Unit price must be/);
  }
});

test('failed save while adding an extra sale rolls back both sale and cash movement', () => {
  const h = makeAddSaleHarness({ saveResult: false });
  h.addSale();
  assert.equal(h.getData().sales.length, 0);
  assert.equal(h.getData().adjustments.length, 0);
  assert.match(h.statuses.at(-1), /Sale was not saved/);
});


function makeRenderCashHarness(data) {
  const start = source.indexOf('function renderCash()');
  const end = source.indexOf('function renderSales(', start);
  assert.ok(start >= 0 && end > start, 'renderCash function must exist');
  const cashSource = source.slice(start, end);
  const elements = Object.fromEntries(
    ['cashSessions', 'cashSales', 'cashAdjustments', 'cashTotal', 'cashMovements']
      .map((id) => [id, { textContent: '', innerHTML: '' }])
  );
  const renderCash = new Function(
    'data', 'helpers', 'document',
    `const {baghdadDayStart,businessDayForTimestamp,allSessions,money,baghdadDateTime,escapeHTML}=helpers;
    ${cashSource}
    return renderCash;`
  )(
    data,
    {
      baghdadDayStart: () => '2026-10-21',
      businessDayForTimestamp: (timestamp) => timestamp === 1 ? '2026-10-20' : '2026-10-21',
      allSessions: () => { const seen = new Set(); return [...data.sessions, ...Object.values(data.archives || {}).flat()].filter((session, index) => { const key = session && session.id ? String(session.id) : `legacy-${index}`; if (seen.has(key)) return false; seen.add(key); return true; }); },
      money: (amount) => 'IQD ' + amount,
      baghdadDateTime: (timestamp) => 'time-' + timestamp,
      escapeHTML: (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    },
    { getElementById: (id) => elements[id] }
  );
  return { renderCash, elements };
}

test('daily cash register totals count session income, extra sales, and adjustments once', () => {
  const data = {
    sessions: [{ id: 'today-session', endedAt: 2, charge: 5000 }],
    archives: {},
    sales: [{ id: 'today-sale', businessDay: '2026-10-21', createdAt: 2, total: 1500 }],
    adjustments: [
      { id: 'session-movement', businessDay: '2026-10-21', kind: 'session', amount: 5000, at: 2, description: 'Session PS5-02' },
      { id: 'sale-movement', businessDay: '2026-10-21', kind: 'sale', amount: 1500, at: 2, description: '2 × Water' },
      { id: 'expense', businessDay: '2026-10-21', kind: 'adjustment', amount: -250, at: 3, description: 'Cleaning supplies' },
      { id: 'old-session', businessDay: '2026-10-20', kind: 'adjustment', amount: 9000, at: 1, description: 'Previous day' }
    ]
  };
  const h = makeRenderCashHarness(data);
  h.renderCash();
  assert.equal(h.elements.cashSessions.textContent, 'IQD 5000');
  assert.equal(h.elements.cashSales.textContent, 'IQD 1500');
  assert.equal(h.elements.cashAdjustments.textContent, 'IQD -250');
  assert.equal(h.elements.cashTotal.textContent, 'IQD 6250');
  assert.match(h.elements.cashMovements.innerHTML, /Cleaning supplies/);
  assert.doesNotMatch(h.elements.cashMovements.innerHTML, /Previous day/);
  assert.match(h.elements.cashMovements.innerHTML, /Session PS5-02/);
});

test('daily cash register counts archived session income without counting duplicate archived IDs twice', () => {
  const archived = { id: 'archived-session', endedAt: 2, charge: 3000 };
  const data = {
    sessions: [archived],
    archives: { '2026-10-21': [{ ...archived, archived: true }] },
    sales: [],
    adjustments: []
  };
  const h = makeRenderCashHarness(data);
  h.renderCash();
  assert.equal(h.elements.cashSessions.textContent, 'IQD 3000');
  assert.equal(h.elements.cashTotal.textContent, 'IQD 3000');
});


test('backup restore rejects active sessions with invalid station, rate, duration, or reused IDs', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /for\(const \[id,a\] of Object\.entries\(imported\.active\)\)/);
  assert.match(fn, /!stationIds\.has\(id\)/, 'active sessions must belong to a known station');
  assert.match(fn, /Number\(a\.rate\)!==DEFAULT_STATIONS\.find\(x=>x\.id===id\)\.rate/, 'active rate must match station pricing');
  assert.match(fn, /Number\(a\.durationMinutes\)<=0/, 'active duration must be positive');
  assert.match(fn, /reuses a completed or archived session ID/, 'active IDs must not reuse completed IDs');
});

test('backup restore rejects session bills that do not link to a restored session', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.ok(fn.includes("row.kind==='session'&&(!stationIds.has(row.stationId)||typeof row.sessionId!=='string'||!sessionIds.has(row.sessionId)"), 'session bills must reference a known current or archived session ID');
  assert.match(fn, /const restoredSessionsById=new Map\(\[\.\.\.imported\.sessions,\.\.\.Object\.values\(imported\.archives\)\.flat\(\)\]\.map\(session=>\[session\.id,session\]\)\)/, 'current and archived session IDs must be indexed before bill validation');
  assert.match(fn, /Backup contains an invalid bill record/);
});


test('backup restore rejects multiple session bills linked to the same session', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /const billedSessionIds=new Set\(\);for\(const row of imported\.bills\)/);
  assert.match(fn, /if\(billedSessionIds\.has\(row\.sessionId\)\)throw Error\('Backup contains duplicate bills for session '\+row\.sessionId\)/);
  assert.match(fn, /billedSessionIds\.add\(row\.sessionId\)/);
});

test('backup restore duplicate-session-bill protection applies only to session bills', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /if\(row\.kind==='session'\)\{if\(billedSessionIds\.has/);
  assert.ok(fn.indexOf("if(row.kind==='session'){if(billedSessionIds.has") < fn.indexOf("Backup contains duplicate bills for session"));
});


test('backup restore verifies session bill amount, duration, and discount against its source session', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /const restoredSessionsById=new Map\(\[\.\.\.imported\.sessions,\.\.\.Object\.values\(imported\.archives\)\.flat\(\)\]\.map\(session=>\[session\.id,session\]\)\)/);
  assert.match(fn, /Number\(row\.amount\)!==Number\(restoredSessionsById\.get\(row\.sessionId\)\.charge\)/, 'bill amount must match the source session charge');
  assert.match(fn, /Number\(row\.minutes\)!==Number\(restoredSessionsById\.get\(row\.sessionId\)\.minutes\)/, 'bill duration must match the source session');
  assert.match(fn, /Number\(row\.discount\?\?0\)!==Number\(restoredSessionsById\.get\(row\.sessionId\)\.discount\?\?0\)/, 'bill discount must match the source session');
  assert.ok(fn.includes("typeof row.sessionId!=='string'||!sessionIds.has(row.sessionId)"), 'session bills must link to a known current or archived session ID');
});


test('backup restore rejects duplicate cash movement IDs', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /const adjustmentIds=new Set\(\);for\(const row of imported\.adjustments\)/);
  assert.match(fn, /adjustmentIds\.has\(row\.id\)/);
  assert.match(fn, /throw Error\('Backup contains an invalid or duplicate cash movement'\);adjustmentIds\.add\(row\.id\)/);
  assert.match(fn, /!\['session','sale','adjustment'\]\.includes\(row\.kind\)/, 'unknown cash movement types must be rejected');
  assert.match(fn, /!Number\.isSafeInteger\(Number\(row\.amount\)\)/, 'cash movement amounts must be whole IQD values');
  assert.match(fn, /row\.kind!=='adjustment'&&Number\(row\.amount\)<0/, 'session and sale movements cannot be negative');
  assert.match(fn, /row\.businessDay!==businessDayForTimestamp\(row\.createdAt\)/, 'sale business day must match its timestamp');
  assert.match(fn, /row\.businessDay!==businessDayForTimestamp\(movementTime\)/, 'cash movement business day must match its timestamp');
  assert.match(fn, /Backup cash movement does not match a unique source session/, 'session income must match exactly one completed or archived source session');
  assert.match(fn, /session\.stationId===match\[1\]/, 'session cash movements must link by station ID, not confuse station IDs with session IDs');
  assert.match(fn, /Backup cash movement does not match a unique source sale/, 'sale income must match one source sale');
  assert.match(fn, /Number\(movement\.amount\)===Number\(session\.charge\)/, 'session cash movement amount must equal the session charge');
  assert.match(fn, /Number\(movement\.at\?\?movement\.createdAt\)===Number\(session\.endedAt\)/, 'session cash movement timestamp must equal completion time');
  assert.match(fn, /matches\.length!==1/, 'source linkage must be unique rather than ambiguous');
  assert.match(fn, /sale\.createdAt===saleTime/, 'sale cash movement must match the sale timestamp');
  assert.match(fn, /movement\.description===`\$\{sale\.qty\} × \$\{sale\.name\}`/, 'sale cash movement must match the source sale description');
});


test('backup restore rejects record ID collisions across different record types', () => {
  const start = source.indexOf('function restoreJSON()');
  const end = source.indexOf('function csvCell(', start);
  const fn = source.slice(start, end);
  assert.match(fn, /const globalRecordIds=new Map\(\)/);
  assert.match(fn, /globalRecordIds\.has\(id\)/);
  assert.match(fn, /registerGlobalId\(row\.id,'session'\)/);
  assert.match(fn, /registerGlobalId\(row\.id,'sale'\)/);
  assert.match(fn, /registerGlobalId\(row\.id,'bill'\)/);
  assert.match(fn, /registerGlobalId\(row\.id,'cash movement'\)/);
  assert.match(fn, /registerGlobalId\(row\.id,'archived session'\)/);
});
