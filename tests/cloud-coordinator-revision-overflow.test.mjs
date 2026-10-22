import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudCoordinator} from '../cloud/cloud-coordinator.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
test('maximum safe cloud revision cannot overflow on write',async()=>{
 let writes=0;
 const client={read:async()=>({initialized:true,revision:Number.MAX_SAFE_INTEGER,state:state()}),write:async()=>{writes++;return 0}};
 const coordinator=createCloudCoordinator(client);
 await coordinator.refresh();
 await assert.rejects(coordinator.transact(s=>{s.settings.note='blocked'}),/Cloud revision limit reached/);
 assert.equal(writes,0);assert.equal(coordinator.status().ready,false);
});
test('prewrite revision zero blocks transaction before mutation or write',async()=>{
 let reads=0,writes=0,mutations=0;
 const client={read:async()=>({initialized:true,revision:++reads===1?1:0,state:state()}),write:async()=>{writes++;return 2}};
 const coordinator=createCloudCoordinator(client);await coordinator.refresh();
 await assert.rejects(coordinator.transact(()=>{mutations++}),/revision is invalid/);
 assert.equal(mutations,0);assert.equal(writes,0);assert.equal(coordinator.status().ready,false);
});
