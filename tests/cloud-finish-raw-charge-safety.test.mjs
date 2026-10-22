import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const station={id:'VIP-01',type:'VIP',rate:10000};
const state=()=>({stations:[station],active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
test('reject unsafe raw charge even with 100 percent discount, without partial billing',()=>{
 const s=state();
 cloudCommands.start({stationId:'VIP-01',id:'session-1',at:0})(s);
 cloudCommands.discount({stationId:'VIP-01',type:'percent',value:100})(s);
 const endedAt=Number.MAX_SAFE_INTEGER-1;
 assert.throws(()=>cloudCommands.finish({stationId:'VIP-01',endedAt,billId:'bill-1',movementId:'movement-1',businessDay:'1970-01-01'})(s),/Invalid completion|Invalid session charge/);
 assert.equal(s.sessions.length,0);assert.equal(s.bills.length,0);assert.equal(s.adjustments.length,0);
 assert.ok(s.active['VIP-01']);
});
test('normal completed session still creates one bill and movement',()=>{
 const s=state(),at=Date.parse('2026-10-22T10:00:00Z');
 cloudCommands.start({stationId:'VIP-01',id:'session-1',at})(s);
 cloudCommands.finish({stationId:'VIP-01',endedAt:at+3600000,billId:'bill-1',movementId:'movement-1',businessDay:'2026-10-22'})(s);
 assert.equal(s.sessions[0].charge,10000);assert.equal(s.bills[0].amount,10000);assert.equal(s.adjustments[0].amount,10000);
});
