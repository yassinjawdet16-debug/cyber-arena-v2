import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudActionRunner,CloudPresentationError} from '../cloud/cloud-action-runner.mjs';
test('UI failure after commit reports committed write, not retryable failure',async()=>{
 let writes=0,blocked=0;
 const runner=createCloudActionRunner({transact:async fn=>{writes++;return {revision:writes}}},{onCommitted:()=>{throw Error('render failed')},onBlocked:()=>blocked++});
 await assert.rejects(runner.execute('cash',{id:'M1',amount:250,at:1,businessDay:'2026-10-22'}),e=>e instanceof CloudPresentationError&&e.cloudCommitted===true);
 assert.equal(writes,1);assert.equal(blocked,0);assert.equal(runner.isPending(),false);
});
test('failed cloud write invokes blocked callback',async()=>{
 let blocked=0;
 const runner=createCloudActionRunner({transact:async()=>{throw Error('network')}} ,{onBlocked:()=>blocked++});
 await assert.rejects(runner.execute('cash',{}),/network/);
 assert.equal(blocked,1);assert.equal(runner.isPending(),false);
});
test('overlapping commands blocked while awaiting write',async()=>{
 let release;const gate=new Promise(r=>release=r);
 const runner=createCloudActionRunner({transact:async()=>{await gate;return {revision:2}}});
 const first=runner.execute('cash',{});
 await assert.rejects(runner.execute('cash',{}),/already in progress/);
 release();await first;
 assert.equal(runner.isPending(),false);
});
