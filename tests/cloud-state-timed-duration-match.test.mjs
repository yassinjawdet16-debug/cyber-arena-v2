import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{'VIP-01':{id:'s1',stationId:'VIP-01',startedAt:1000,rate:10000,endsAt:61000,durationMinutes:1}},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
test('timed session with matching duration is valid',()=>assert.equal(validateCloudState(state()).valid,true));
test('mismatched duration and end timestamp is rejected',()=>{
 const s=state();s.active['VIP-01'].durationMinutes=2;
 assert.throws(()=>validateCloudState(s),/Timed session duration\/end mismatch/);
});
test('extended timed session matching duration remains valid',()=>{
 const s=state();s.active['VIP-01'].endsAt=361000;s.active['VIP-01'].durationMinutes=6;
 assert.equal(validateCloudState(s).valid,true);
});
test('partial minute rounds up consistently',()=>{
 const s=state();s.active['VIP-01'].endsAt=61001;s.active['VIP-01'].durationMinutes=2;
 assert.equal(validateCloudState(s).valid,true);
});
