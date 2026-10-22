import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[{id:'s1',stationId:'VIP-01',startedAt:1000,endedAt:61000,charge:250}],archives:{},bills:[{id:'b1',kind:'session',sessionId:'s1',stationId:'VIP-01',amount:250}],sales:[],adjustments:[],settings:{}});
test('matching bill station is valid',()=>assert.equal(validateCloudState(state()).valid,true));
test('mismatched bill station is rejected',()=>{
 const s=state();s.bills[0].stationId='PS5-02';
 assert.throws(()=>validateCloudState(s),/Bill station mismatch/);
});
test('legacy bill without stationId remains accepted',()=>{
 const s=state();delete s.bills[0].stationId;
 assert.equal(validateCloudState(s).valid,true);
});
