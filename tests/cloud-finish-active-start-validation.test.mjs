import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const state=()=>({stations:[{id:'VIP-01',type:'VIP',rate:10000}],active:{'VIP-01':{id:'session-1',stationId:'VIP-01',startedAt:1000,rate:10000,endsAt:null,discount:0}},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
for(const startedAt of ['1000',null,-1,Number.MAX_SAFE_INTEGER+1]){
 test('reject invalid active start '+String(startedAt),()=>{
  const s=state();s.active['VIP-01'].startedAt=startedAt;
  assert.throws(()=>cloudCommands.finish({stationId:'VIP-01',endedAt:61000,billId:'bill-1',movementId:'movement-1',businessDay:'1970-01-01'})(s),/Invalid completion/);
  assert.equal(s.bills.length,0);assert.equal(s.adjustments.length,0);assert.ok(s.active['VIP-01']);
 });
}
test('valid active session can still finish',()=>{
 const s=state();
 cloudCommands.finish({stationId:'VIP-01',endedAt:61000,billId:'bill-1',movementId:'movement-1',businessDay:'1970-01-01'})(s);
 assert.equal(s.bills.length,1);assert.equal(s.adjustments.length,1);assert.equal(s.sessions.length,1);
});
