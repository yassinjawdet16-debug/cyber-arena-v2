import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[{id:'s1',stationId:'VIP-01',startedAt:1000,endedAt:61000,charge:250}],archives:{},bills:[{id:'b1',kind:'session',sessionId:'s1',stationId:'VIP-01',rate:10000,amount:250}],sales:[],adjustments:[],settings:{}});
test('matching receipt rate is accepted',()=>assert.equal(validateCloudState(state()).valid,true));
for(const rate of [5000,'10000',null]){
 test('incorrect receipt hourly rate is rejected '+String(rate),()=>{
  const s=state();s.bills[0].rate=rate;
  assert.throws(()=>validateCloudState(s),/Bill hourly rate mismatch/);
 });
}
test('legacy receipt without hourly rate remains accepted',()=>{
 const s=state();delete s.bills[0].rate;
 assert.equal(validateCloudState(s).valid,true);
});
