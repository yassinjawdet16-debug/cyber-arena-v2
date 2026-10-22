// Cyber Arena V2 — dependency-free deployment safety checks.
// Run: node tests/safety.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function check(name, fn) { try { fn(); console.log('PASS', name); } catch (error) { console.error('FAIL', name, error.message); process.exitCode = 1; } }
const stationMatch = html.match(/const DEFAULT_STATIONS\s*=\s*(\[[\s\S]*?\]);/);
check('16 sequential stations and fixed rates', () => {
  assert.ok(stationMatch, 'Station definition missing');
  const stations = vm.runInNewContext(stationMatch[1]);
  assert.equal(stations.length, 16);
  stations.forEach((station, index) => {
    const number = index + 1;
    const type = number === 1 ? 'VIP' : number <= 8 ? 'PS5' : 'PS4';
    assert.equal(station.id, type + '-' + String(number).padStart(2, '0'));
    assert.equal(station.type, type);
    assert.equal(station.rate, type === 'VIP' ? 10000 : type === 'PS5' ? 5000 : 3000);
  });
});
check('250 IQD rounding at boundaries', () => {
  const match = html.match(/function round250\(n\)\s*\{[^}]*\}/);
  assert.ok(match, 'Rounding function missing');
  const round = vm.runInNewContext(match[0] + ';round250');
  [[0,0],[124,0],[125,250],[249,250],[374,250],[375,500],[10000,10000]].forEach(([input, expected]) => assert.equal(round(input), expected));
});
check('manual receipt printing and print bridge controls', () => {
  assert.match(html, /async function printBill\s*\(/);
  assert.doesNotMatch(html, /192\.168\.1\.44/);
  assert.match(html, /192\.168\.1\.41/);
  assert.match(html, /function printBill\s*\(/);
  assert.match(html, /id="bridgeUrl"/);
  assert.match(html, /id="bridgeToken"/);
});
check('archive and backup controls exist', () => {
  assert.match(html, /function manualArchive\s*\(/);
  assert.match(html, /function (?:backupJSON|exportBackup|downloadBackup|backupData)\s*\(/);
});
check('no unexpected remote JavaScript imports', () => {
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
});
if (!process.exitCode) console.log('Cyber Arena V2 safety checks passed.');

check('cloud adapter requires authenticated atomic RPC', () => {
 const cloud = fs.readFileSync(path.join(__dirname, '..', 'cloud', 'cloud-sync.js'), 'utf8');
 const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
 assert.match(cloud, /rpc\/arena_save_snapshot/);
 assert.match(schema, /pg_advisory_xact_lock/);
 assert.match(schema, /auth\.uid\(\)/);
 assert.match(schema, /row level security/i);
 assert.doesNotMatch(cloud, /['\"]service_role['\"]\s*:/i);
});

check('owner Settings tab is PIN gated and relocks', () => {
 assert.match(html, /let ownerUnlocked=false/);
 assert.match(html, /btn\.dataset\.tab==='settings'&&!ownerUnlocked/);
 assert.match(html, /btn\.dataset\.tab!=='settings'\)ownerUnlocked=false/);
 assert.match(html, /ownerUnlocked=true;closeModal\(\)/);
});

check('daily archive catches missed 6 AM minute', () => {
 assert.match(html, /data\.lastArchiveDay!==baghdadDayStart\(now\)\)archiveEligible\(false\)/);
 assert.doesNotMatch(html, /Number\(p\.hour\)===6&&Number\(p\.minute\)===0/);
 assert.match(html, /timeZone:'Asia\/Baghdad'/);
});

check('financial inputs reject unsafe values', () => {
 assert.match(html, /Number\.isSafeInteger\(qty\)/);
 assert.match(html, /Number\.isSafeInteger\(price\)/);
 assert.match(html, /Number\.isSafeInteger\(qty\*price\)/);
 assert.match(html, /Number\.isSafeInteger\(amount\)\|\|amount===0/);
});

check('blank inputs and manual bill amounts are validated', () => {
 assert.match(html, /saleQty'\)\.value\.trim\(\)/);
 assert.match(html, /salePrice'\)\.value\.trim\(\)/);
 assert.match(html, /adjAmount'\)\.value\.trim\(\)/);
 assert.match(html, /Number\.isSafeInteger\(amount\)\|\|amount<=0/);
});

check('archive uses the Baghdad business day boundary', () => {
 assert.match(html, /const now=new Date\(\),cutoffDay=baghdadDayStart\(now\)/);
 assert.match(html, /if\(force\|\|day<cutoffDay\)/);
 assert.doesNotMatch(html, /day<today&&day<cutoffDay/);
});

check('overnight sessions are classified by business day', () => {
 assert.match(html, /const day=baghdadDayStart\(new Date\(s\.endedAt\)\);if\(force\|\|day<cutoffDay\)/);
});

check('archives are stored under Baghdad business-day keys', () => {
 assert.match(html, /function businessDayForTimestamp\(ts\)\{return baghdadDayStart\(new Date\(ts\)\)\}/);
 assert.match(html, /const d=businessDayForTimestamp\(s\.endedAt\);\(data\.archives\[d\]\?\?=\[\]\)\.push\(s\)/);
});

check('cash and reports share 6 AM Baghdad business day', () => {
 assert.match(html, /function renderCash\(\)\{const today=baghdadDayStart\(\)/);
 assert.match(html, /function renderStats\(\)\{const today=baghdadDayStart\(\)/);
 assert.match(html, /function printDailyReport\(\)\{const d=baghdadDayStart\(\)/);
 assert.match(html, /function recordBusinessDay\(record,timeKey='createdAt'\)/);
 assert.match(html, /businessDayForTimestamp\(s\.endedAt\)===today/);
 assert.match(html, /recordBusinessDay\(a,'at'\)===today/);
});

check('cloud sync requires a known baseline and refuses divergent snapshots', () => {
 assert.match(html, /async function cloudSync\(\)/);
 assert.match(html, /if\(localChanged&&cloudChanged\)/);
 assert.match(html, /if\(!base\)/);
 assert.match(html, /cloudSession\.baseline=\{revision:remote\.revision,fingerprint:cloudSnapshotFingerprint\(remote\.payload\)\}/);
 assert.match(html, /adapter\.save\(data,remote\.revision\)/);
});

check('cloud operations reject active session snapshots', () => {
 assert.match(html, /End active sessions before cloud upload/);
 assert.match(html, /Cloud snapshot contains active sessions/);
 assert.match(html, /End active sessions before recovering/);
 assert.match(html, /End active sessions before syncing/);
});

check('Arabic Badini Sorani language selector and right-to-left support', () => {
 const lang=fs.readFileSync(path.join(__dirname,'..','i18n','languages.js'),'utf8');
 for(const code of ['ar','badini','sorani'])assert.ok(lang.includes(code+':{'),code+' dictionary missing');
 assert.match(lang,/current==='badini'\?'ku'/);
 assert.match(lang,/current==='ar'\|\|current==='sorani'\|\|current==='badini'\?'rtl'/);
 assert.match(html,/id="arenaLanguage"/);
});

check('translated cloud and sales controls are present in each language', () => {
 const lang=fs.readFileSync(path.join(__dirname,'..','i18n','languages.js'),'utf8');
 assert.match(lang,/Object\.assign\(dictionary\.ar,/);
 assert.match(lang,/Object\.assign\(dictionary\.badini,/);
 assert.match(lang,/Object\.assign\(dictionary\.sorani,/);
 for(const label of ['Sync safely','Recover cloud snapshot','PlayStation Stations','Sales history'])assert.ok(lang.includes(label),label+' translation key missing');
});

check('daily report reconciles session income, sales, and manual adjustments', () => {
 assert.match(html,/const adjustments=data\.adjustments\.filter\(a=>a\.kind==='adjustment'/);
 assert.match(html,/Cash adjustments: \$\{money\(adjustmentTotal\)\}/);
 assert.match(html,/Cash total: \$\{money\(sessionTotal\+salesTotal\+adjustmentTotal\)\}/);
});
