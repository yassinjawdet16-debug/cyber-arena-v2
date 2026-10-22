import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('failed cloud refresh hides stale financial and station data',()=>{
 assert.match(ui,/catch\(e\)\{el\('stations'\)\.replaceChildren\(\);el\('revision'\)\.textContent='Cloud refresh failed/);
 assert.match(ui,/Cloud totals unavailable until a successful refresh/);
 assert.match(ui,/No financial edits allowed/);
});
test('failed owner login clears any previous financial view',()=>{
 assert.match(ui,/client\?\.logout\(\);client=null;session=null;needsRefresh=false/);
 assert.match(ui,/el\('financialSummary'\)\.textContent='Sign in to view verified cloud totals\.'/);
});
