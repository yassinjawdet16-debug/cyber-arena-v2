import test from 'node:test';
import assert from 'node:assert/strict';
import {createArenaCloudClient,ArenaCloudError} from '../cloud/arena-cloud-client.mjs';
const state={stations:Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':i<8?'PS5-'+String(i+1).padStart(2,'0'):'PS4-'+String(i+1).padStart(2,'0')})),active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{receiptName:'CYBER ARENA'}};
const ok=(body)=>({ok:true,status:200,json:async()=>body});
function mock(){
 let revision=0,stored=null,requests=[];
 const fetchImpl=async(url,options)=>{
  const path=new URL(url).pathname;
  requests.push({path,options});
  if(path==='/auth/v1/token')return ok({access_token:'test-token',user:{id:'owner-test'}});
  if(path==='/rest/v1/arena_members')return ok([{role:'owner'}]);
  if(path.endsWith('arena_read_cloud_state'))return ok(revision?[{revision,state:stored,updated_at:'2026-10-22T00:00:00Z'}]:[]);
  if(path.endsWith('arena_write_cloud_state')){
   const args=JSON.parse(options.body);
   if(args.p_expected_revision!==revision)return {ok:false,status:409,json:async()=>({message:'Cloud revision conflict'})};
   revision++;stored=args.p_state;return ok(revision);
  }
  throw Error('Unexpected path '+path);
 };
 return {fetchImpl,requests};
}
test('owner login and empty cloud read',async()=>{
 const {fetchImpl}=mock(),client=createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public-test',fetchImpl});
 await client.login('owner@example.com','test-password');
 assert.deepEqual(await client.read(),{initialized:false,revision:0,state:null});
});
test('cloud write requires owner login',async()=>{
 const {fetchImpl}=mock(),client=createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public-test',fetchImpl});
 await assert.rejects(client.write(0,state),e=>e.code==='unauthorized');
});
test('cloud writes increment revisions and reject stale second-device updates',async()=>{
 const {fetchImpl}=mock();
 const a=createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public-test',fetchImpl});
 const b=createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public-test',fetchImpl});
 await a.login('owner@example.com','x');await b.login('owner@example.com','x');
 assert.equal(await a.write(0,state),1);
 assert.equal((await b.read()).revision,1);
 assert.equal(await b.write(1,{...state,sessions:[{id:'SES-1'}]}),2);
 await assert.rejects(a.write(1,state),e=>e.code==='conflict');
 assert.equal((await a.read()).revision,2);
});
test('cloud client rejects private PIN and bridge credentials',async()=>{
 const {fetchImpl}=mock(),client=createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public-test',fetchImpl});
 await client.login('owner@example.com','x');
 await assert.rejects(client.write(0,{...state,settings:{pin:'1234'}}),e=>e.code==='private_settings');
 await assert.rejects(client.write(0,{...state,settings:{bridgeToken:'secret'}}),e=>e.code==='private_settings');
 await assert.rejects(client.write(0,{...state,settings:{printerIp:'192.168.1.41'}}),e=>e.code==='private_settings');
});
test('uncertain network writes must not be blindly retried',async()=>{
 const base=mock();
 const fetchImpl=async(url,options)=>new URL(url).pathname.endsWith('arena_write_cloud_state')?Promise.reject(new TypeError('offline')):base.fetchImpl(url,options);
 const client=createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public-test',fetchImpl});
 await client.login('owner@example.com','x');
 await assert.rejects(client.write(0,state),e=>e.code==='uncertain_write');
});
test('logout clears owner access',async()=>{
 const {fetchImpl}=mock(),client=createArenaCloudClient({url:'https://example.supabase.co',publishableKey:'public-test',fetchImpl});
 await client.login('owner@example.com','x');client.logout();
 await assert.rejects(client.read(),e=>e.code==='unauthorized');
});
