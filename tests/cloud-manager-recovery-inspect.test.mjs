import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../cloud-manager.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('recovery inspection has explicit file input and no restore action',()=>{
 assert.match(html,/id="recoveryFile"/);
 assert.match(html,/id="inspectRecovery" disabled/);
 assert.match(ui,/inspectCloudRecoveryPackage\(pkg\)/);
 assert.match(ui,/file\.size>20\*1024\*1024/);
 assert.doesNotMatch(ui,/restoreCloudRecovery|planCloudRecovery|client\.write\(/);
});
test('recovery inspector displays validation results and never claims a restore',()=>{
 assert.match(ui,/Source revision /);
 assert.match(ui,/Completed sessions /);
 assert.match(ui,/NO cloud records changed/);
 assert.match(ui,/INVALID BACKUP/);
});
