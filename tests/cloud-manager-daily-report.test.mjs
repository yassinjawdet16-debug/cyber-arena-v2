import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../cloud-manager.html',import.meta.url),'utf8');
test('daily CSV report exports cloud totals only after fresh authoritative read',()=>{
 assert.match(html,/id="dailyReport" disabled/);
 const start=ui.indexOf("el('dailyReport').addEventListener");
 const end=ui.indexOf("el('backup').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/const snapshot=await session\.refresh\(\)/);
 assert.match(block,/startedEpoch!==connectionEpoch\|\|needsRefresh/);
 assert.ok(block.indexOf('session.refresh()')<block.indexOf('cloudDailyCashSummary('));
 assert.match(block,/\['Cash difference',report\.cashDifference,'IQD'\]/);
 assert.match(block,/\['Requires reconciliation',report\.requiresReconciliation\?'YES':'NO',''\]/);
 assert.match(block,/text\/csv;charset=utf-8/);
});
test('daily CSV export errors lock editing and hide stale totals',()=>{
 const block=ui.slice(ui.indexOf("el('dailyReport').addEventListener"),ui.indexOf("el('backup').addEventListener"));
 assert.match(block,/catch\(e\)\{\s*try\{session\?\.lock\(\)\}catch\(_\)\{\}\s*hideUnverifiedCloudView\(\)/);
 assert.match(ui,/el\('dailyReport'\)\.disabled=!ready\(\)/);
});
