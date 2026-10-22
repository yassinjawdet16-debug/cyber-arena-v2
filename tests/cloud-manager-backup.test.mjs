import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCloudRecoveryPackage,inspectCloudRecoveryPackage} from '../cloud/cloud-recovery.mjs';
const html=readFileSync(new URL('../cloud-manager.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('cloud manager exports recovery only after fresh authoritative read',()=>{
 assert.match(html,/id="backup" disabled/);
 assert.match(ui,/el\('backup'\)\.disabled=!ready\(\)/);
 assert.match(ui,/const snapshot=await session\.refresh\(\)/);
 assert.match(ui,/createCloudRecoveryPackage\(snapshot\)/);
 assert.match(ui,/anchor\.download='cyber-arena-cloud-backup-'/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage/);
});
test('recovery package rejects uninitialized cloud revision',()=>{
 assert.throws(()=>createCloudRecoveryPackage({initialized:false,revision:1,state:{}}),/Initialized cloud revision required/);
 assert.throws(()=>inspectCloudRecoveryPackage({format:'cyber-arena-cloud-recovery',version:1,sourceRevision:0,state:{}}),/Invalid recovery package/);
});
