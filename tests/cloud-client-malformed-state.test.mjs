import test from 'node:test';
import assert from 'node:assert/strict';
import {createArenaCloudClient} from '../cloud/arena-cloud-client.mjs';
const ok=body=>({ok:true,status:200,json:async()=>body});
function makeClient(readState){
 let writes=0;
 const fetchImpl=async(url)=>{
  const path=new URL(url).pathname;
  if(path==='/auth/v1/token')return ok({access_token:'token',user:{id:'owner'}});
  if(path==='/rest/v1/arena_members')return ok([{role:'owner'}]);
  if(path.endsWith('arena_read_cloud_state'))return ok([{revision:1,state:readState}]);
  if(path.endsWith('arena_write_cloud_state')){writes++;return ok(2)}
  throw Error('Unexpected URL');
 };
 return {client:createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public',fetchImpl}),writes:()=>writes};
}
test('Supabase read rejects array cloud state',async()=>{
 const {client}=makeClient([]);await client.login('owner@example.com','x');
 await assert.rejects(client.read(),e=>e.code==='invalid_response');
});
test('Supabase write refuses revision overflow before network call',async()=>{
 const {client,writes}=makeClient({});await client.login('owner@example.com','x');
 await assert.rejects(client.write(Number.MAX_SAFE_INTEGER,{}),e=>e.code==='configuration');
 assert.equal(writes(),0);
});
test('Supabase read accepts ordinary object cloud state',async()=>{
 const {client}=makeClient({stations:[]});await client.login('owner@example.com','x');
 assert.deepEqual((await client.read()).state,{stations:[]});
});
