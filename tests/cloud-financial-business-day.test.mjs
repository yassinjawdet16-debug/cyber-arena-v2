import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
import {iraqBusinessDay} from '../cloud/business-day.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
const at=Date.parse('2026-10-22T05:30:00+03:00');
test('business day at 05:30 Baghdad belongs to previous day',()=>assert.equal(iraqBusinessDay(at),'2026-10-21'));
test('sale rejects mismatched financial day without mutation',()=>{
 const s=state();assert.throws(()=>cloudCommands.sale({id:'sale1',movementId:'mov1',name:'Water',qty:1,price:1000,at,businessDay:'2026-10-22'})(s),/Invalid sale/);
 assert.equal(s.sales.length,0);assert.equal(s.adjustments.length,0);
});
test('cash adjustment rejects mismatched financial day without mutation',()=>{
 const s=state();assert.throws(()=>cloudCommands.cash({id:'cash1',amount:250,at,businessDay:'2026-10-22'})(s),/Invalid adjustment/);
 assert.equal(s.adjustments.length,0);
});
test('session finish rejects mismatched financial day without mutation',()=>{
 const s=state();s.active['VIP-01']={id:'session1',stationId:'VIP-01',startedAt:at-60000,rate:10000,discount:0};
 assert.throws(()=>cloudCommands.finish({stationId:'VIP-01',endedAt:at,billId:'bill1',movementId:'mov1',businessDay:'2026-10-22'})(s),/Invalid completion/);
 assert.equal(s.bills.length,0);assert.ok(s.active['VIP-01']);
});
