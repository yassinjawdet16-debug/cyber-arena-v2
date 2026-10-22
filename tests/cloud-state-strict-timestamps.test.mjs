import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=()=>Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations:stations(),active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
test('cloud rejects string station rates',()=>{
 const s=state();s.stations[0].rate='10000';
 assert.throws(()=>validateCloudState(s),/Station order or rate mismatch/);
});
test('cloud rejects string active session timestamps and rates',()=>{
 const s=state();s.active['VIP-01']={id:'a',stationId:'VIP-01',startedAt:'1000',rate:10000,endsAt:null};
 assert.throws(()=>validateCloudState(s),/Invalid active session start or rate/);
 s.active['VIP-01'].startedAt=1000;s.active['VIP-01'].rate='10000';
 assert.throws(()=>validateCloudState(s),/Invalid active session start or rate/);
});
test('cloud rejects string countdown end and completed timestamps',()=>{
 const s=state();s.active['VIP-01']={id:'a',stationId:'VIP-01',startedAt:1000,rate:10000,endsAt:'60000'};
 assert.throws(()=>validateCloudState(s),/Invalid active session end time/);
 delete s.active['VIP-01'];
 s.sessions.push({id:'s',stationId:'VIP-01',startedAt:'1000',endedAt:60000,charge:2500});
 assert.throws(()=>validateCloudState(s),/Invalid completed session timestamps/);
});
test('valid numeric station and active session timestamps pass',()=>{
 const s=state();s.active['VIP-01']={id:'a',stationId:'VIP-01',startedAt:1000,rate:10000,endsAt:60000};
 assert.equal(validateCloudState(s).valid,true);
});
