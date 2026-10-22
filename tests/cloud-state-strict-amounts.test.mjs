import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[{id:'s',stationId:'VIP-01',startedAt:0,endedAt:60000,charge:2500}],archives:{},bills:[{id:'b',kind:'session',sessionId:'s',amount:2500}],sales:[],adjustments:[{id:'m',kind:'session',sessionId:'s',amount:2500}],settings:{}});
test('string-encoded completed session charge is rejected',()=>{
 const s=state();s.sessions[0].charge='2500';
 assert.throws(()=>validateCloudState(s),/Invalid completed session charge/);
});
test('string-encoded bill amount is rejected even if numerically equal',()=>{
 const s=state();s.bills[0].amount='2500';
 assert.throws(()=>validateCloudState(s),/Bill amount mismatch/);
});
test('string-encoded linked cash movement amount is rejected',()=>{
 const s=state();s.adjustments[0].amount='2500';
 assert.throws(()=>validateCloudState(s),/Cash movement amount mismatch/);
});
test('valid integer IQD amounts continue to pass',()=>{
 assert.equal(validateCloudState(state()).valid,true);
});
