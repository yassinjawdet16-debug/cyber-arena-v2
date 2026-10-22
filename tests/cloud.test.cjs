const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('cloud/cloud-sync.js','utf8');
async function run(){
 const calls=[];
 const ctx={window:{},URL,encodeURIComponent,fetch:async(url,options={})=>{
  calls.push({url,options});
  if(url.includes('/rpc/'))return {ok:true,json:async()=>({revision:2})};
  return {ok:true,json:async()=>[{revision:1,payload:{stations:[]}}]};
 }};
 vm.runInNewContext(src,ctx);
 const api=ctx.window.CyberArenaCloud.config('https://example.supabase.co','public-key','access-token','user-id');
 const remote=await api.read();
 assert.equal(remote.revision,1);
 const payload={stations:[],settings:{pin:'1234',bridgeToken:'secret',bridgeUrl:'http://127.0.0.1:8787/print',other:'ok'}};
 const result=await api.save(payload,1);
 assert.equal(result.revision,2);
 assert.equal(calls.length,2);
 assert.match(calls[1].url,/\/rpc\/arena_save_snapshot$/);
 const sent=JSON.parse(calls[1].options.body);
 assert.equal(sent.expected_revision,1);
 assert.equal(sent.new_payload.settings.pin,undefined);
 assert.equal(sent.new_payload.settings.bridgeToken,undefined);
 assert.equal(sent.new_payload.settings.bridgeUrl,undefined);
 assert.equal(sent.new_payload.settings.other,'ok');
 assert.equal(payload.settings.pin,'1234');
 assert.equal(calls[1].options.headers.Authorization,'Bearer access-token');
 await assert.rejects(()=>api.save(payload,0),/Invalid expected revision/);
 assert.equal(calls.length,2);
 console.log('PASS cloud adapter read, atomic RPC, sanitization and validation');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
