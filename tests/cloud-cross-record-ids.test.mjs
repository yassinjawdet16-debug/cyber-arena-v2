import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const stations=[{id:'VIP-01',rate:10000}];
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
test('start refuses a session ID already used by a receipt',()=>{
 const s=state();s.bills.push({id:'shared'});
 assert.throws(()=>cloudCommands.start({stationId:'VIP-01',id:'shared',at:1000})(s),/Duplicate session/);
 assert.equal(Object.keys(s.active).length,0);
});
test('start refuses an ID already used by an archived session',()=>{
 const s=state();s.archives['2026-10-21']=[{id:'archived'}];
 assert.throws(()=>cloudCommands.start({stationId:'VIP-01',id:'archived',at:1000})(s),/Duplicate session/);
});
test('sale refuses receipt and archived-session ID collisions',()=>{
 const s=state();s.bills.push({id:'bill'});s.archives['2026-10-21']=[{id:'archived'}];
 for(const ids of [['bill','new-movement'],['new-sale','archived']]){
  assert.throws(()=>cloudCommands.sale({id:ids[0],movementId:ids[1],name:'Water',qty:1,price:500,at:1000,businessDay:'2026-10-22'})(s),/Duplicate sale/);
 }
 assert.equal(s.sales.length,0);assert.equal(s.adjustments.length,0);
});
test('cash refuses ID of an archived session',()=>{
 const s=state();s.archives['2026-10-21']=[{id:'archived'}];
 assert.throws(()=>cloudCommands.cash({id:'archived',amount:250,at:1000,businessDay:'2026-10-22'})(s),/Invalid adjustment/);
 assert.equal(s.adjustments.length,0);
});
