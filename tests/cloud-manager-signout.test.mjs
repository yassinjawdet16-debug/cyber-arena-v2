import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('owner cannot switch cloud identity without signing out',()=>{
 assert.match(ui,/el\('login'\)\.disabled=busy\|\|Boolean\(client\)/);
 assert.match(ui,/if\(busy\|\|client\)return;busy=true;buttons\(\)/);
});
test('sign-out clears sensitive cloud financial and recovery views',()=>{
 assert.match(ui,/client\?\.logout\(\);client=null;session=null/);
 assert.match(ui,/el\('stations'\)\.replaceChildren\(\)/);
 assert.match(ui,/el\('financialSummary'\)\.textContent='Sign in to view verified cloud totals\.'/);
 assert.match(ui,/el\('recoveryReport'\)\.textContent='No recovery file inspected\.'/);
 assert.match(ui,/el\('recoveryFile'\)\.value=''/);
});
