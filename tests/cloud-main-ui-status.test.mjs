import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('development manager explicitly warns that cloud synchronization is not enabled',()=>{
 assert.match(html,/id="cloudSafetyPanel"/);
 assert.match(html,/Cloud synchronization — not yet enabled/);
 assert.match(html,/saves records on this device only/);
});
test('all cloud tools linked from manager exist in development branch',()=>{
 for(const file of ['cloud-migration.html','cloud-recovery.html','cloud-operations.html']){
  assert.match(html,new RegExp('href="\\./'+file.replace('.','\\.')+'"'));
  assert.ok(readFileSync(new URL('../'+file,import.meta.url),'utf8').length>200);
 }
});
