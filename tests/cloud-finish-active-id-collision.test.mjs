import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{'VIP-01':{id:'session-vip',stationId:'VIP-01',startedAt:1000,rate:10000},'PS5-02':{id:'session-other',stationId:'PS5-02',startedAt:1000,rate:5000}},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
const args={stationId:'VIP-01',endedAt:61000,billId:'bill-new',movementId:'cash-new',businessDay:'1970-01-01'};
test('finish rejects bill ID colliding with another active session',()=>{
 const s=state();assert.throws(()=>cloudCommands.finish({...args,billId:'session-other'})(s),/Duplicate financial ID/);
 assert.equal(s.sessions.length,0);assert.equal(s.bills.length,0);assert.ok(s.active['VIP-01']);
});
test('finish rejects cash movement ID colliding with another active session',()=>{
 const s=state();assert.throws(()=>cloudCommands.finish({...args,movementId:'session-other'})(s),/Duplicate financial ID/);
 assert.equal(s.adjustments.length,0);assert.ok(s.active['VIP-01']);
});
test('finish accepts unique bill and cash movement IDs',()=>{
 const s=state();cloudCommands.finish(args)(s);
 assert.equal(s.bills.length,1);assert.equal(s.adjustments.length,1);assert.ok(s.active['PS5-02']);
});
