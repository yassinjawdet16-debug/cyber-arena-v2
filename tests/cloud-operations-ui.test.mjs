import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../cloud-operations.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../cloud/operations-ui.mjs',import.meta.url),'utf8');
test('every referenced cloud operations control exists',()=>{
 const ids=[...js.matchAll(/el\('([^']+)'\)/g)].map(x=>x[1]);
 for(const id of ids)assert.match(html,new RegExp('id="'+id+'"'),'Missing '+id);
});
test('cloud operations are owner-authenticated and revision-safe',()=>{
 assert.match(js,/client\.login\(/);
 assert.match(js,/createCloudCoordinator\(client\)/);
 assert.match(js,/runner\.execute\(name,args\)/);
 assert.match(js,/coordinator\.refresh\(\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|service_role/);
});
test('all financial actions use cloud transaction runner',()=>{
 for(const action of ['start','extend','discount','finish','sale','cash'])assert.match(js,new RegExp("run\\('"+action+"'"),'Missing '+action);
});
test('development console explicitly warns against live use',()=>{
 assert.match(html,/Do not use with live income/);
 assert.match(html,/development-only|Development-only/i);
});
