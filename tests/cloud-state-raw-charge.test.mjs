import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[{id:'session-1',stationId:'VIP-01',startedAt:1000,endedAt:61000,charge:250,rawCharge:278}],archives:{},bills:[{id:'bill-1',kind:'session',sessionId:'session-1',amount:250}],sales:[],adjustments:[],settings:{}});
test('completed session permits valid rounded raw charge',()=>assert.equal(validateCloudState(state()).valid,true));
for(const rawCharge of ['278',-1,Number.MAX_SAFE_INTEGER+1,NaN]){
 test('reject malformed completed raw charge '+String(rawCharge),()=>{
  const s=state();s.sessions[0].rawCharge=rawCharge;
  assert.throws(()=>validateCloudState(s),/Invalid completed session raw charge/);
 });
}
test('legacy completed session without rawCharge remains accepted',()=>{
 const s=state();delete s.sessions[0].rawCharge;
 assert.equal(validateCloudState(s).valid,true);
});
