import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const state=()=>({stations:[],active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
test('valid sale business-day key accepted',()=>{
 const s=state();cloudCommands.sale({id:'S1',movementId:'M1',name:'Water',qty:2,price:500,at:1000,businessDay:'2026-10-22'})(s);
 assert.equal(s.sales[0].total,1000);
});
test('invalid financial day and timestamp rejected',()=>{
 assert.throws(()=>cloudCommands.sale({id:'S1',movementId:'M1',name:'Water',qty:1,price:500,at:-1,businessDay:'2026-10-22'})(state()),/Invalid sale/);
 assert.throws(()=>cloudCommands.cash({id:'M1',amount:250,at:1000,businessDay:'tomorrow'})(state()),/Invalid adjustment/);
});
test('cash identifier cannot collide with receipt identifier',()=>{
 const s=state();s.bills.push({id:'B1'});
 assert.throws(()=>cloudCommands.cash({id:'B1',amount:250,at:1000,businessDay:'2026-10-22'})(s),/Invalid adjustment/);
});
