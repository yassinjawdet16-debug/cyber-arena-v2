/* Cyber Arena V2 optional cloud adapter.
 * Does not automatically overwrite local data. No service_role keys in browsers.
 * Caller must authenticate with Supabase Auth and provide a user access token.
 * Optimistic revision checks prevent silently replacing a newer cloud snapshot.
 */
(function(global){
'use strict';
function config(url,anonKey,accessToken,userId){
 const u=new URL(url);
 if(u.protocol!=='https:'||!/^https:\/\//.test(u.origin))throw Error('Supabase URL must be HTTPS');
 if(!anonKey||!accessToken||!userId)throw Error('Missing cloud authentication');
 const headers={'apikey':anonKey,'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'};
 const endpoint=u.origin+'/rest/v1/arena_snapshots';
 async function request(path,opts={}){
  const r=await fetch(endpoint+path,{...opts,headers:{...headers,...opts.headers},cache:'no-store'});
  if(!r.ok)throw Error('Cloud HTTP '+r.status+': '+(await r.text()).slice(0,180));
  return r.status===204?null:r.json();
 }
 async function read(){
  const rows=await request('?owner_id=eq.'+encodeURIComponent(userId)+'&select=owner_id,revision,payload,updated_at');
  return rows[0]||null;
 }
 async function save(payload,expectedRevision){
  if(!payload||typeof payload!=='object'||!Array.isArray(payload.stations))throw Error('Invalid snapshot');
  // Do not upload printer secrets or local owner PIN.
  const clean=JSON.parse(JSON.stringify(payload));
  if(clean.settings){delete clean.settings.pin;delete clean.settings.bridgeToken;delete clean.settings.bridgeUrl;}
  const current=await read();
  if(current && expectedRevision!==current.revision)throw Error('Cloud changed: review and reconcile before saving');
  if(!current && expectedRevision!==null)throw Error('Cloud revision mismatch');
  const next=(current?.revision||0)+1;
  const body=JSON.stringify({owner_id:userId,revision:next,payload:clean});
  if(current){
   const rows=await request('?owner_id=eq.'+encodeURIComponent(userId)+'&revision=eq.'+current.revision,{
    method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({revision:next,payload:clean,updated_at:new Date().toISOString()})
   });
   if(rows.length!==1)throw Error('Cloud conflict: no records changed');
   return rows[0];
  }
  const rows=await request('',{method:'POST',headers:{Prefer:'return=representation'},body});
  return rows[0];
 }
 return {read,save};
}
global.CyberArenaCloud={config};
})(window);
