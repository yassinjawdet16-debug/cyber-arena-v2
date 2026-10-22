import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudCoordinator} from '../cloud/cloud-coordinator.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
test('coordinator refuses valid but silently changed cloud content at same revision',async()=>{
 let reads=0,writes=0;
 const client={read:async()=>{reads++;const s=state();if(reads===2)s.settings.note='unexpected';return {initialized:true,revision:3,state:s}},write:async()=>{writes++;return 4}};
 const coordinator=createCloudCoordinator(client);
 await coordinator.refresh();
 await assert.rejects(coordinator.transact(s=>{s.settings.test='should not run'}),/Cloud content changed without revision/);
 assert.equal(writes,0);
 assert.equal(coordinator.status().ready,false);
});
test('coordinator still commits unchanged cloud contents exactly once',async()=>{
 let writes=0;
 const client={read:async()=>({initialized:true,revision:3,state:state()}),write:async(expected,s)=>{writes++;assert.equal(expected,3);return 4}};
 const coordinator=createCloudCoordinator(client);
 await coordinator.refresh();
 const result=await coordinator.transact(s=>{s.settings.test='ok'});
 assert.equal(result.revision,4);
 assert.equal(writes,1);
});
