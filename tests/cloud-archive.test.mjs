import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const state=()=>({sessions:[{id:'S1',stationId:'VIP-01',startedAt:Date.parse('2026-10-21T01:00:00Z'),endedAt:Date.parse('2026-10-21T02:30:00Z'),charge:250},{id:'S2',stationId:'PS5-02',startedAt:Date.parse('2026-10-22T03:00:00Z'),endedAt:Date.parse('2026-10-22T04:00:00Z'),charge:250}],archives:{},bills:[{id:'B1',businessDay:'2026-10-20'},{id:'B2',businessDay:'2026-10-22'}]});
test('archive moves only older business-day sessions and receipts',()=>{
 const s=state();cloudCommands.archive({businessDay:'2026-10-22',at:Date.parse('2026-10-22T08:00:00Z')})(s);
 assert.deepEqual(s.sessions.map(x=>x.id),['S2']);assert.equal(s.archives['2026-10-20'][0].id,'S1');
 assert.equal(s.bills[0].archived,true);assert.equal(s.bills[1].archived,undefined);
});
test('duplicate archived session is blocked',()=>{
 const s=state();s.archives['2026-10-20']=[{...s.sessions[0]}];
 assert.throws(()=>cloudCommands.archive({businessDay:'2026-10-22',at:Date.parse('2026-10-22T08:00:00Z')})(s),/Duplicate archived session/);
});
