import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreCloudRecovery} from '../cloud/cloud-restore.mjs';
import {createCloudRecoveryPackage} from '../cloud/cloud-recovery.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
test('recovery rejects maximum safe revision after backup and owner confirmation without writing',async()=>{
 let writes=0,backupCalls=0,confirmCalls=0;
 const client={read:async()=>({initialized:true,revision:Number.MAX_SAFE_INTEGER,state:state()}),write:async()=>{writes++;return 0}};
 const pkg=createCloudRecoveryPackage({initialized:true,revision:1,state:state()});
 await assert.rejects(restoreCloudRecovery({client,packageToRestore:pkg,saveCurrentBackup:async()=>{backupCalls++;return true},confirmRestore:async()=>{confirmCalls++;return true}}),/revision limit reached/);
 assert.equal(backupCalls,1);assert.equal(confirmCalls,1);assert.equal(writes,0);
});
