import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudCoordinator} from '../cloud/cloud-coordinator.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state={stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}};
for(const revision of [undefined,null,0,-1,1.5,'1',Number.MAX_SAFE_INTEGER+1]){
 test('cloud refresh rejects invalid revision '+String(revision),async()=>{
  const client={read:async()=>({initialized:true,revision,state}),write:async()=>{throw Error('must not write')}};
  const coordinator=createCloudCoordinator(client);
  await assert.rejects(coordinator.refresh(),/Invalid cloud revision/);
  assert.equal(coordinator.status().ready,false);
 });
}
test('cloud refresh accepts positive safe integer revision',async()=>{
 const client={read:async()=>({initialized:true,revision:2,state}),write:async()=>3};
 const coordinator=createCloudCoordinator(client);
 const snapshot=await coordinator.refresh();
 assert.equal(snapshot.revision,2);
 assert.equal(coordinator.status().ready,true);
});
