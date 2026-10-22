import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudRecoveryPackage,inspectCloudRecoveryPackage,planCloudRecovery} from '../cloud/cloud-recovery.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{pin:'1234',bridgeToken:'secret',receiptName:'Arena'}});
test('recovery export strips secrets without modifying source',()=>{
 const source=state(),pkg=createCloudRecoveryPackage({initialized:true,revision:4,state:source});
 assert.equal(pkg.state.settings.pin,undefined);
 assert.equal(pkg.state.settings.bridgeToken,undefined);
 assert.equal(source.settings.pin,'1234');
 assert.equal(inspectCloudRecoveryPackage(pkg).sourceRevision,4);
});
test('recovery rejects tampered station rates and malformed packages',()=>{
 const pkg=createCloudRecoveryPackage({initialized:true,revision:1,state:state()});
 pkg.state.stations[0].rate=1;
 assert.throws(()=>inspectCloudRecoveryPackage(pkg),/rate mismatch/);
 assert.throws(()=>inspectCloudRecoveryPackage({}),/Invalid recovery package/);
});
test('recovery planning requires valid current cloud and does not write',()=>{
 const pkg=createCloudRecoveryPackage({initialized:true,revision:1,state:state()});
 const current={initialized:true,revision:9,state:createCloudRecoveryPackage({initialized:true,revision:9,state:state()}).state};
 const plan=planCloudRecovery(pkg,current);
 assert.equal(plan.expectedRevision,9);
 assert.equal(plan.requiresOwnerConfirmation,true);
 assert.equal(plan.requiresCurrentCloudBackup,true);
 assert.throws(()=>planCloudRecovery(pkg,{initialized:false}),/Current cloud state/);
});
