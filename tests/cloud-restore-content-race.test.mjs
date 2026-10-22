import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCloudRecovery} from '../cloud/cloud-restore.mjs';
import {createCloudRecoveryPackage} from '../cloud/cloud-recovery.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
const initial={initialized:true,revision:5,state:state()};
const pkg=createCloudRecoveryPackage(initial);
test('restore refuses cloud content change without revision increase',async()=>{
 let reads=0,writes=0;
 const client={read:async()=>{reads++;const s=structuredClone(initial);if(reads===2)s.state.settings.note='unexpected update';return s},write:async()=>{writes++;return 6}};
 await assert.rejects(restoreCloudRecovery({client,packageToRestore:pkg,saveCurrentBackup:async()=>true,confirmRestore:async()=>true}),/Cloud content changed without revision/);
 assert.equal(writes,0);
});
test('restore refuses invalid latest state even at expected revision',async()=>{
 let reads=0,writes=0;
 const client={read:async()=>{reads++;const s=structuredClone(initial);if(reads===2)s.state.stations[0].rate=1;return s},write:async()=>{writes++;return 6}};
 await assert.rejects(restoreCloudRecovery({client,packageToRestore:pkg,saveCurrentBackup:async()=>true,confirmRestore:async()=>true}),/Station order or rate mismatch/);
 assert.equal(writes,0);
});
