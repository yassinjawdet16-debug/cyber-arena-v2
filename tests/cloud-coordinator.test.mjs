import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudCoordinator} from '../cloud/cloud-coordinator.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const initial=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{receiptName:'Arena'}});
const clone=x=>JSON.parse(JSON.stringify(x));
function mock(){
 let state=initial(),revision=1,fail=null,writes=0;
 return {client:{
  async read(){return {initialized:true,revision,state:clone(state)}},
  async write(expected,next){writes++;if(fail){const err=fail;fail=null;throw err}if(expected!==revision)throw Error('revision conflict');state=clone(next);return ++revision}
 },setFailure:e=>{fail=e},externalEdit:()=>{revision++},get writes(){return writes},get state(){return clone(state)}};
}
test('requires refresh before writes and preserves remote data on refresh',async()=>{
 const m=mock(),c=createCloudCoordinator(m.client);
 assert.throws(()=>c.current(),/Refresh/);
 await c.refresh();
 const local=c.current();local.state.settings.receiptName='Tampered';
 assert.equal(c.current().state.settings.receiptName,'Arena');
 await c.transact(s=>{s.settings.receiptName='Updated'});
 assert.equal(m.state.settings.receiptName,'Updated');
 assert.equal(c.status().revision,2);
});
test('network uncertainty locks writes and never automatically retries',async()=>{
 const m=mock(),c=createCloudCoordinator(m.client);await c.refresh();
 m.setFailure(Error('network timeout'));
 await assert.rejects(c.transact(s=>{s.settings.receiptName='Unsafe'}),/timeout/);
 assert.equal(m.writes,1);
 assert.equal(c.status().ready,false);
 await assert.rejects(c.transact(()=>{}),/Refresh/);
 assert.equal(m.writes,1);
 await c.refresh();assert.equal(c.status().ready,true);
});
test('revision conflict blocks stale writer and requires refresh',async()=>{
 const m=mock(),c=createCloudCoordinator(m.client);await c.refresh();m.externalEdit();
 await assert.rejects(c.transact(s=>{s.settings.receiptName='Stale'}),/conflict/);
 assert.equal(c.status().ready,false);
 assert.equal(m.state.settings.receiptName,'Arena');
 await c.refresh();
});
test('rejects invalid financial mutations before cloud write',async()=>{
 const m=mock(),c=createCloudCoordinator(m.client);await c.refresh();
 await assert.rejects(c.transact(s=>{s.stations[0].rate=3000}),/rate mismatch/);
 assert.equal(m.writes,0);
 assert.equal(c.status().ready,false);
});
test('rejects asynchronous mutators and prevents private settings upload',async()=>{
 const m=mock(),c=createCloudCoordinator(m.client);await c.refresh();
 await assert.rejects(c.transact(async s=>{s.settings.receiptName='Async'}),/Async mutators/);
 assert.equal(m.writes,0);
 await c.refresh();
 await c.transact(s=>{s.settings.pin='1234';s.settings.receiptName='Safe'});
 assert.equal(Object.hasOwn(m.state.settings,'pin'),false);
 assert.equal(m.state.settings.receiptName,'Safe');
});
test('concurrent transactions cannot both write',async()=>{
 let finish;const gate=new Promise(resolve=>finish=resolve);
 const m=mock(),base=m.client;
 const c=createCloudCoordinator({...base,write:async(...args)=>{await gate;return base.write(...args)}});
 await c.refresh();
 const first=c.transact(s=>{s.settings.receiptName='One'});
 await assert.rejects(c.transact(s=>{s.settings.receiptName='Two'}),/Operation in progress/);
 finish();await first;assert.equal(m.writes,1);
});
