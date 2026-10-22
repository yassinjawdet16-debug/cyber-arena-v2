import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{'VIP-01':{id:'s1',stationId:'VIP-01',startedAt:1000,rate:10000,endsAt:61000,durationMinutes:1}},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
test('valid timed session is accepted',()=>assert.equal(validateCloudState(state()).valid,true));
for(const durationMinutes of ['1',0,-1,1.5]){
 test('reject malformed timed duration '+String(durationMinutes),()=>{
  const s=state();s.active['VIP-01'].durationMinutes=durationMinutes;
  assert.throws(()=>validateCloudState(s),/Invalid timed session duration/);
 });
}
test('reject duration without an end timestamp',()=>{
 const s=state();s.active['VIP-01'].endsAt=null;
 assert.throws(()=>validateCloudState(s),/Invalid timed session duration/);
});
test('open session with no duration or end timestamp remains valid',()=>{
 const s=state();s.active['VIP-01'].endsAt=null;s.active['VIP-01'].durationMinutes=null;
 assert.equal(validateCloudState(s).valid,true);
});
