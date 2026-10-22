import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../cloud-manager.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('cloud manager is separate from local-only public website',()=>{
 assert.match(html,/Development preview only/);
 assert.match(html,/cloud\/cloud-manager-ui\.mjs/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage/);
});
test('all critical money-changing UI actions use cloud session execute',()=>{
 for(const action of ['start','timed','extend','discount','finish','sale','cash'])
  assert.match(ui,new RegExp("case '"+action+"'"));
 assert.match(ui,/session\.execute\(command,args\)/);
 assert.match(ui,/session\.refresh\(\)/);
});
test('cloud manager requires owner login and explicit confirmation',()=>{
 assert.match(ui,/client\.login\(/);
 assert.match(ui,/confirm\(/);
 assert.match(ui,/crypto\.randomUUID\(/);
 assert.match(ui,/iraqBusinessDay\(at\)/);
});
