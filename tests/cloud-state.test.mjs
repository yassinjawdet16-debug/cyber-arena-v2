import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCloudState,validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
function sample(){
 return {stations,active:{},sessions:[{id:'S1',stationId:'VIP-01',startedAt:1000,endedAt:60000,charge:2500}],archives:{},bills:[{id:'B1',kind:'session',sessionId:'S1',amount:2500}],sales:[],adjustments:[{id:'M1',kind:'session',sessionId:'S1',amount:2500}],settings:{pin:'1234',bridgeToken:'SECRET',bridgeUrl:'http://localhost:8787/print',printerIp:'192.168.1.41',receiptName:'Cyber Arena'}};
}
test('cloud preparation removes local secrets without mutating local records',()=>{
 const local=sample(),clean=prepareCloudState(local);
 assert.equal(clean.settings.receiptName,'Cyber Arena');
 for(const key of ['pin','bridgeToken','bridgeUrl','printerIp'])assert.equal(Object.hasOwn(clean.settings,key),false);
 assert.equal(local.settings.pin,'1234');
 assert.deepEqual(validateCloudState(clean),{valid:true,completedSessions:1,activeSessions:0,legacyCashMovements:0});
});
test('cloud state rejects wrong station rate',()=>{
 const state=prepareCloudState(sample());state.stations[0].rate=3000;
 assert.throws(()=>validateCloudState(state),/Station order or rate mismatch/);
});
test('cloud state rejects duplicate financial record IDs',()=>{
 const state=prepareCloudState(sample());state.sales.push({id:'M1'});
 assert.throws(()=>validateCloudState(state),/Duplicate or invalid/);
});
test('cloud state rejects mismatched bill and session charges',()=>{
 const state=prepareCloudState(sample());state.bills[0].amount=5000;
 assert.throws(()=>validateCloudState(state),/Bill amount mismatch/);
});
test('cloud state rejects orphaned session receipts',()=>{
 const state=prepareCloudState(sample());state.bills[0].sessionId='missing';
 assert.throws(()=>validateCloudState(state),/Orphan session bill/);
});
test('cloud state allows legacy unlinked cash movements but counts them',()=>{
 const local=sample();delete local.adjustments[0].sessionId;
 const clean=prepareCloudState(local);
 assert.equal(validateCloudState(clean).legacyCashMovements,1);
});

test('cloud state rejects invalid completed timestamps and unrounded amounts',()=>{
 const badTime=sample();badTime.sessions[0].endedAt=500;
 assert.throws(()=>prepareCloudState(badTime),/Invalid completed session timestamps/);
 const badCharge=sample();badCharge.sessions[0].charge=2555;
 assert.throws(()=>prepareCloudState(badCharge),/Invalid completed session charge/);
});
test('cloud state rejects active sessions with wrong rate or countdown',()=>{
 const bad=sample();bad.active['PS5-02']={id:'A1',stationId:'PS5-02',startedAt:1000,rate:3000,endsAt:5000};
 assert.throws(()=>prepareCloudState(bad),/Invalid active session start or rate/);
 bad.active['PS5-02'].rate=5000;bad.active['PS5-02'].endsAt=500;
 assert.throws(()=>prepareCloudState(bad),/Invalid active session end time/);
});
