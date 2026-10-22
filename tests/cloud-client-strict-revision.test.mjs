import test from 'node:test';
import assert from 'node:assert/strict';
import {createArenaCloudClient} from '../cloud/arena-cloud-client.mjs';
const ok=body=>({ok:true,status:200,json:async()=>body});
const state={stations:[],active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}};
function clientFor({readRevision=1,writeRevision=2}={}){
 const fetchImpl=async(url)=>{
  const path=new URL(url).pathname;
  if(path==='/auth/v1/token')return ok({access_token:'test-token',user:{id:'owner'}});
  if(path==='/rest/v1/arena_members')return ok([{role:'owner'}]);
  if(path.endsWith('arena_read_cloud_state'))return ok([{revision:readRevision,state}]);
  if(path.endsWith('arena_write_cloud_state'))return ok(writeRevision);
  throw Error('Unexpected request '+path);
 };
 return createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public',fetchImpl});
}
for(const revision of ['1',null,1.5]){
 test('Supabase read rejects nonnumeric revision '+String(revision),async()=>{
  const client=clientFor({readRevision:revision});await client.login('owner@example.com','x');
  await assert.rejects(client.read(),e=>e.code==='invalid_response');
 });
}
for(const revision of ['2',null,2.5]){
 test('Supabase write treats nonnumeric revision '+String(revision)+' as uncertain',async()=>{
  const client=clientFor({writeRevision:revision});await client.login('owner@example.com','x');
  await assert.rejects(client.write(1,state),e=>e.code==='uncertain_write');
 });
}
test('numeric read and write revisions remain valid',async()=>{
 const client=clientFor();await client.login('owner@example.com','x');
 assert.equal((await client.read()).revision,1);
 assert.equal(await client.write(1,state),2);
});
