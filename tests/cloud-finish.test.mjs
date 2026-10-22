import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
import {prepareCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
test('finishing one-hour VIP creates matching 10000 IQD session, bill and cash record',()=>{
 const s=state();cloudCommands.start({stationId:'VIP-01',id:'S1',at:100000})(s);
 cloudCommands.finish({stationId:'VIP-01',endedAt:3700000,billId:'B1',movementId:'M1',businessDay:'2026-10-22'})(s);
 assert.equal(s.sessions[0].charge,10000);assert.equal(s.bills[0].amount,10000);assert.equal(s.adjustments[0].amount,10000);
 assert.equal(s.active['VIP-01'],undefined);assert.equal(prepareCloudState(s).sessions.length,1);
 assert.throws(()=>cloudCommands.finish({stationId:'VIP-01',endedAt:3700000,billId:'B2',movementId:'M2',businessDay:'2026-10-22'})(s),/Invalid active session/);
});
test('percentage discount and nearest 250 IQD rounding',()=>{
 const s=state();cloudCommands.start({stationId:'PS5-02',id:'S1',at:100000})(s);
 cloudCommands.discount({stationId:'PS5-02',type:'percent',value:10})(s);
 cloudCommands.finish({stationId:'PS5-02',endedAt:3700000,billId:'B1',movementId:'M1',businessDay:'2026-10-22'})(s);
 assert.equal(s.sessions[0].charge,4500);prepareCloudState(s);
});
test('invalid finish does not modify financial records',()=>{
 const s=state();cloudCommands.start({stationId:'PS4-09',id:'S1',at:100000})(s);
 const before=JSON.stringify(s);
 assert.throws(()=>cloudCommands.finish({stationId:'PS4-09',endedAt:99999,billId:'B1',movementId:'M1',businessDay:'2026-10-22'})(s),/Invalid completion/);
 assert.equal(JSON.stringify(s),before);
});
