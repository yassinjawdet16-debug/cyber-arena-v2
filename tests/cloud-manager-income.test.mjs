import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../cloud-manager.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('cloud cash summary delegates to validated business-day calculation',()=>{
 assert.match(html,/id="financialSummary"/);
 assert.match(ui,/cloudDailyCashSummary/);
 assert.match(ui,/cloud-cash-summary\.mjs/);
 assert.match(ui,/showFinancialSummary\(snapshot\)/);
});
test('cash summary does not read local device financial records',()=>{
 assert.doesNotMatch(ui,/localStorage|sessionStorage/);
 assert.match(ui,/snapshot\.state/);
});
