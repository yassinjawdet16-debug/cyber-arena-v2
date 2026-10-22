import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const state=()=>({stations:[],active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
const at=Date.parse('2026-10-22T10:00:00Z'),businessDay='2026-10-22';
for(const [id,movementId,name] of [[123,'movement','Water'],['sale',{},'Water'],['sale','movement',{}],[' ','movement','Water'],['sale',' ','Water'],['sale','movement','   ']]){
 test('sale rejects malformed IDs or item name '+JSON.stringify([id,movementId,name]),()=>{
  const s=state();assert.throws(()=>cloudCommands.sale({id,movementId,name,qty:1,price:250,at,businessDay})(s),/Invalid sale/);
  assert.deepEqual(s.sales,[]);assert.deepEqual(s.adjustments,[]);
 });
}
for(const id of [123,{},' ',null]){
 test('cash adjustment rejects invalid ID '+JSON.stringify(id),()=>{
  const s=state();assert.throws(()=>cloudCommands.cash({id,amount:250,at,businessDay})(s),/Invalid adjustment/);
  assert.deepEqual(s.adjustments,[]);
 });
}
test('valid sale creates sale and matching cash movement',()=>{
 const s=state();cloudCommands.sale({id:'sale-1',movementId:'movement-1',name:'Water',qty:2,price:250,at,businessDay})(s);
 assert.equal(s.sales[0].total,500);assert.equal(s.adjustments[0].amount,500);
});
