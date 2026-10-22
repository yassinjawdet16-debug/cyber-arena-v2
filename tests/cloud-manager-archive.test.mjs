import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const html=readFileSync(new URL('../cloud-manager.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('archive is an owner-confirmed cloud operation',()=>{
 assert.match(html,/data-action="archive" disabled/);
 assert.match(ui,/case 'archive':return \['archive',\{businessDay,at\}\]/);
 assert.match(ui,/session\.execute\(command,args\)/);
 assert.match(ui,/confirm\('This changes Supabase financial or session records/);
});
test('archive retains active and current-day sessions while moving old completed sessions',()=>{
 const at=Date.parse('2026-10-22T06:00:00+03:00');
 const old=Date.parse('2026-10-21T09:00:00+03:00');
 const current=Date.parse('2026-10-22T06:10:00+03:00');
 const s={active:{'VIP-01':{id:'active',stationId:'VIP-01'}},sessions:[{id:'old',endedAt:old},{id:'current',endedAt:current}],archives:{},bills:[]};
 cloudCommands.archive({businessDay:'2026-10-22',at:current})(s);
 assert.deepEqual(s.sessions.map(x=>x.id),['current']);
 assert.deepEqual(s.archives['2026-10-21'].map(x=>x.id),['old']);
 assert.equal(s.active['VIP-01'].id,'active');
});
