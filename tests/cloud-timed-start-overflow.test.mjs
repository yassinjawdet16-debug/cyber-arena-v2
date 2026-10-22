import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const station={id:'VIP-01',type:'VIP',rate:10000};
const state=()=>({stations:[station],active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
test('timed session rejects end timestamp overflow without mutating station',()=>{
 const s=state();
 assert.throws(()=>cloudCommands.start({stationId:'VIP-01',id:'session-1',at:Number.MAX_SAFE_INTEGER-1000,minutes:1})(s),/Invalid session/);
 assert.deepEqual(s.active,{});
});
test('ordinary timed session calculates safe end timestamp',()=>{
 const s=state();const at=Date.parse('2026-10-22T10:00:00Z');
 cloudCommands.start({stationId:'VIP-01',id:'session-1',at,minutes:90})(s);
 assert.equal(s.active['VIP-01'].endsAt,at+90*60000);
});
test('open-ended session remains supported',()=>{
 const s=state();cloudCommands.start({stationId:'VIP-01',id:'session-1',at:1000})(s);
 assert.equal(s.active['VIP-01'].endsAt,null);
});
