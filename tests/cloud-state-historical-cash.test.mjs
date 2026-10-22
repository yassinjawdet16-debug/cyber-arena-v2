import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[{id:'sale-old',total:5000,businessDay:'2025-01-01'}],adjustments:[{id:'cash-old',kind:'sale',amount:5000,businessDay:'2025-01-01'}],settings:{}});
test('old sale with string total is rejected before cloud refresh',()=>{
 const s=state();s.sales[0].total='5000';
 assert.throws(()=>validateCloudState(s),/Invalid sale total/);
});
test('old sale with negative total is rejected',()=>{
 const s=state();s.sales[0].total=-250;
 assert.throws(()=>validateCloudState(s),/Invalid sale total/);
});
test('old ledger movement with string amount is rejected',()=>{
 const s=state();s.adjustments[0].amount='5000';
 assert.throws(()=>validateCloudState(s),/Invalid cash movement amount/);
});
test('valid historical sales and cash movements remain accepted',()=>{
 assert.equal(validateCloudState(state()).valid,true);
});
