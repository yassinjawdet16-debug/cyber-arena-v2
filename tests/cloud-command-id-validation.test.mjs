import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const state=()=>({stations:[{id:'VIP-01',type:'VIP',rate:10000}],active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[]});
for(const id of ['', '   ', 123, {}, null]){
 test('start rejects invalid session id '+JSON.stringify(id),()=>{
  const s=state();
  assert.throws(()=>cloudCommands.start({stationId:'VIP-01',id,at:1000})(s),/Invalid session/);
  assert.deepEqual(s.active,{});
 });
}
for(const [billId,movementId] of [[123,'movement'],['bill',{}],[' ','movement'],['bill',' ']]){
 test('finish rejects invalid financial identifiers '+JSON.stringify([billId,movementId]),()=>{
  const s=state();cloudCommands.start({stationId:'VIP-01',id:'session-1',at:1000})(s);
  assert.throws(()=>cloudCommands.finish({stationId:'VIP-01',endedAt:61000,billId,movementId,businessDay:'1970-01-01'})(s),/Invalid completion/);
  assert.equal(s.sessions.length,0);assert.equal(s.bills.length,0);assert.equal(s.adjustments.length,0);
  assert.ok(s.active['VIP-01']);
 });
}
