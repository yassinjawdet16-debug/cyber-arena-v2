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
