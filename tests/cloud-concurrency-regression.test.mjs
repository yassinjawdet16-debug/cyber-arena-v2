import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudCoordinator} from '../cloud/cloud-coordinator.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const empty=()=>({stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
const clone=x=>JSON.parse(JSON.stringify(x));
test('second device cannot overwrite first device changes',async()=>{
 let state=empty(),revision=1;
 const client={read:async()=>({initialized:true,revision,state:clone(state)}),write:async(expected,next)=>{if(expected!==revision)throw Error('revision conflict');state=clone(next);return ++revision}};
 const first=createCloudCoordinator(client),second=createCloudCoordinator(client);
 await first.refresh();await second.refresh();
 await first.transact(s=>{s.adjustments.push({id:'A1',amount:250,kind:'adjustment',date:'2026-10-22',businessDay:'2026-10-22',at:1})});
 await assert.rejects(second.transact(s=>{s.adjustments.push({id:'A2',amount:250,kind:'adjustment',date:'2026-10-22',businessDay:'2026-10-22',at:2})}),/Cloud changed/);
 assert.equal(state.adjustments.length,1);
 assert.equal(second.status().ready,false);
 await second.refresh();
 await second.transact(s=>{s.adjustments.push({id:'A2',amount:250,kind:'adjustment',date:'2026-10-22',businessDay:'2026-10-22',at:2})});
 assert.equal(state.adjustments.length,2);
});
test('uncertain write locks client until refresh',async()=>{
 let state=empty(),revision=1,fail=true;
 const client={read:async()=>({initialized:true,revision,state:clone(state)}),write:async(expected,next)=>{if(fail){fail=false;state=clone(next);revision++;throw Error('network dropped after commit')}state=clone(next);return ++revision}};
 const c=createCloudCoordinator(client);await c.refresh();
 await assert.rejects(c.transact(s=>{s.adjustments.push({id:'A1',amount:250,kind:'adjustment',date:'2026-10-22',businessDay:'2026-10-22',at:1})}),/network dropped/);
 assert.equal(c.status().ready,false);
 await assert.rejects(c.transact(()=>{}),/Refresh cloud state/);
 await c.refresh();assert.equal(c.current().state.adjustments.length,1);
});
