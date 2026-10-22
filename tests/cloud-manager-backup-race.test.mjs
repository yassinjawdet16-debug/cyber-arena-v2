import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('backup export is blocked if connectivity changes during cloud read',()=>{
 const start=ui.indexOf("el('backup').addEventListener");
 const end=ui.indexOf("el('logout').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/const startedEpoch=connectionEpoch;\s*const snapshot=await session\.refresh\(\)/);
 assert.match(block,/startedEpoch!==connectionEpoch\|\|needsRefresh/);
 assert.match(block,/Connection changed during backup; refresh and export again/);
 assert.ok(block.indexOf('Connection changed during backup')<block.indexOf('createCloudRecoveryPackage'));
});
