import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudUiSession} from '../cloud/cloud-ui-session.mjs';
const state=()=>({stations:Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000})),active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
function backend(){
 let data=state(),revision=1,writes=0,uncertain=false;
 const client=()=>({
  async read(){return {initialized:true,revision,state:structuredClone(data)}},
  async write(expected,next){
   if(expected!==revision)throw Error('revision conflict');
   data=structuredClone(next);revision++;writes++;
   if(uncertain){uncertain=false;throw Error('Network timeout after commit')}
   return revision;
  }
 });
 return {client,get data(){return structuredClone(data)},get revision(){return revision},get writes(){return writes},uncertainNext(){uncertain=true}};
}
test('stale device cannot overwrite a session created on another device',async()=>{
 const b=backend(),a=createCloudUiSession(b.client()),c=createCloudUiSession(b.client());
 await Promise.all([a.refresh(),c.refresh()]);
 await a.execute('start',{stationId:'VIP-01',id:'session-A',at:1000});
 await assert.rejects(c.execute('start',{stationId:'VIP-01',id:'session-B',at:2000}),/changed on another device/);
 assert.equal(c.status().blocked,true);
 assert.equal(b.writes,1);
 assert.equal(b.data.active['VIP-01'].id,'session-A');
 await c.refresh();
 await assert.rejects(c.execute('start',{stationId:'VIP-01',id:'session-B',at:2000}),/Station unavailable/);
 assert.equal(b.writes,1);
});
test('uncertain write locks device and refresh exposes committed record',async()=>{
 const b=backend(),ui=createCloudUiSession(b.client());
 await ui.refresh();b.uncertainNext();
 await assert.rejects(ui.execute('start',{stationId:'PS5-02',id:'S1',at:1000}),/timeout/);
 assert.equal(ui.status().blocked,true);
 assert.equal(b.writes,1);
 await assert.rejects(ui.execute('start',{stationId:'PS5-02',id:'S1',at:1000}),/timeout/);
 await ui.refresh();
 assert.equal(ui.current().state.active['PS5-02'].id,'S1');
 assert.equal(b.writes,1);
});
test('two devices can sequentially commit after refresh without losing income',async()=>{
 const b=backend(),a=createCloudUiSession(b.client()),c=createCloudUiSession(b.client());
 await a.refresh();await c.refresh();
 await a.execute('start',{stationId:'PS5-02',id:'S1',at:1000});
 await c.refresh();
 await c.execute('sale',{id:'sale-1',movementId:'movement-1',name:'Water',qty:2,price:500,at:2000,businessDay:'2026-10-22'});
 assert.equal(b.data.active['PS5-02'].id,'S1');
 assert.equal(b.data.sales[0].total,1000);
 assert.equal(b.data.adjustments[0].amount,1000);
 assert.equal(b.writes,2);
});
