import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[{id:'sale-1',qty:2,unitPrice:750,total:1500,businessDay:'2026-10-22'}],adjustments:[{id:'movement-1',kind:'sale',amount:1500,businessDay:'2026-10-22'}],settings:{}});
test('valid sale quantity and unit price reconcile',()=>assert.equal(validateCloudState(state()).valid,true));
test('sale total differing from quantity times unit price is rejected',()=>{
 const s=state();s.sales[0].total=1250;assert.throws(()=>validateCloudState(s),/Sale quantity, unit price or total mismatch/);
});
test('string quantity is rejected',()=>{
 const s=state();s.sales[0].qty='2';assert.throws(()=>validateCloudState(s),/Sale quantity, unit price or total mismatch/);
});
test('string unit price is rejected',()=>{
 const s=state();s.sales[0].unitPrice='750';assert.throws(()=>validateCloudState(s),/Sale quantity, unit price or total mismatch/);
});
test('overflowing multiplication is rejected',()=>{
 const s=state();s.sales[0].qty=Number.MAX_SAFE_INTEGER;s.sales[0].unitPrice=2;
 assert.throws(()=>validateCloudState(s),/Sale quantity, unit price or total mismatch/);
});
