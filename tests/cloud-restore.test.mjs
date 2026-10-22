import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCloudRecovery} from '../cloud/cloud-restore.mjs';
import {createCloudRecoveryPackage} from '../cloud/cloud-recovery.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
const snapshot=()=>({initialized:true,revision:3,state:state()});
const pkg=createCloudRecoveryPackage(snapshot());
function setup(){let writes=0,reads=0;return {client:{read:async()=>{reads++;return snapshot()},write:async(expected,s)=>{writes++;assert.equal(expected,3);return 4}},counts:()=>({writes,reads})}}
test('recovery requires verified backup and explicit confirmation',async()=>{
 const x=setup();
 await assert.rejects(restoreCloudRecovery({client:x.client,packageToRestore:pkg,saveCurrentBackup:async()=>false,confirmRestore:async()=>true}),/backup not saved/);
 assert.equal(x.counts().writes,0);
 await assert.rejects(restoreCloudRecovery({client:x.client,packageToRestore:pkg,saveCurrentBackup:async()=>true,confirmRestore:async()=>false}),/not confirmed/);
 assert.equal(x.counts().writes,0);
});
test('confirmed recovery writes once with expected revision',async()=>{
 const x=setup();
 const r=await restoreCloudRecovery({client:x.client,packageToRestore:pkg,saveCurrentBackup:async b=>b.sourceRevision===3,confirmRestore:async()=>true});
 assert.deepEqual(r,{restored:true,revision:4});assert.deepEqual(x.counts(),{writes:1,reads:2});
});
test('recovery rejects concurrent changes without writing',async()=>{
 const x=setup();let reads=0;
 x.client.read=async()=>{reads++;return {...snapshot(),revision:reads===1?3:4}};
 await assert.rejects(restoreCloudRecovery({client:x.client,packageToRestore:pkg,saveCurrentBackup:async()=>true,confirmRestore:async()=>true}),/Cloud changed/);
 assert.equal(x.counts().writes,0);
});
