/*
 Cyber Arena V2 — cloud transport foundation.
 This module is not connected to the live café controls.
 It never saves credentials, never retries writes, and never writes localStorage.
*/
export class ArenaCloudError extends Error {
 constructor(message,code='cloud_error'){super(message);this.name='ArenaCloudError';this.code=code}
}
export function createArenaCloudClient({url,publishableKey,fetchImpl=fetch,timeoutMs=12000}={}){
 if(typeof url!=='string'||!/^https:\/\//.test(url)||!publishableKey)throw new ArenaCloudError('HTTPS Supabase URL and publishable key required','configuration');
 const base=url.replace(/\/$/,'');
 let token=null,ownerId=null;
 const request=async(path,{method='GET',body,auth=true}={})=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(base+path,{method,signal:controller.signal,cache:'no-store',headers:{apikey:publishableKey,...(auth&&token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
   const json=await response.json().catch(()=>null);
   if(!response.ok){
    const msg=json?.message||json?.error_description||json?.error||'Cloud HTTP '+response.status;
    throw new ArenaCloudError(String(msg),response.status===401?'unauthorized':response.status===403?'forbidden':response.status===409?'conflict':'http_error');
   }
   return json;
  }catch(e){
   if(e?.name==='AbortError')throw new ArenaCloudError('Cloud request timed out. The outcome of a write may be unknown: reload before trying again.','timeout');
   if(e instanceof TypeError)throw new ArenaCloudError('Network error. The outcome of a write may be unknown: reload before trying again.','network');
   throw e;
  }finally{clearTimeout(timer)}
 };
 const requireOwner=()=>{if(!token||!ownerId)throw new ArenaCloudError('Owner login required','unauthorized')};
 return Object.freeze({
  async login(email,password){
   if(!email||!password)throw new ArenaCloudError('Email and password required','configuration');
   token=null;ownerId=null;
   const auth=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},auth:false});
   if(!auth?.access_token||!auth?.user?.id)throw new ArenaCloudError('Login response invalid','unauthorized');
   token=auth.access_token;
   try{
    const rows=await request('/rest/v1/arena_members?select=role&user_id=eq.'+encodeURIComponent(auth.user.id));
    if(!Array.isArray(rows)||!rows.some(x=>x.role==='owner'))throw new ArenaCloudError('Owner membership required','forbidden');
    ownerId=auth.user.id;
    return {userId:ownerId};
   }catch(e){token=null;ownerId=null;throw e}
  },
  logout(){token=null;ownerId=null},
  isLoggedIn(){return Boolean(token&&ownerId)},
  async read(){
   requireOwner();
   const rows=await request('/rest/v1/rpc/arena_read_cloud_state',{method:'POST',body:{}});
   if(!Array.isArray(rows))throw new ArenaCloudError('Invalid cloud read response','invalid_response');
   if(rows.length===0)return {initialized:false,revision:0,state:null};
   if(rows.length!==1||!Number.isSafeInteger(Number(rows[0].revision))||Number(rows[0].revision)<1||!rows[0].state||typeof rows[0].state!=='object')throw new ArenaCloudError('Invalid cloud state','invalid_response');
   return {initialized:true,revision:Number(rows[0].revision),state:rows[0].state,updatedAt:rows[0].updated_at};
  },
  async write(expectedRevision,state){
   requireOwner();
   if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!state||typeof state!=='object'||Array.isArray(state))throw new ArenaCloudError('Invalid write arguments','configuration');
   if(state.settings&&['pin','bridgeToken','bridgeUrl'].some(k=>Object.hasOwn(state.settings,k)))throw new ArenaCloudError('Private device settings must not be uploaded','private_settings');
   try{
    const revision=await request('/rest/v1/rpc/arena_write_cloud_state',{method:'POST',body:{p_expected_revision:expectedRevision,p_state:state}});
    if(!Number.isSafeInteger(Number(revision))||Number(revision)!==expectedRevision+1)throw new ArenaCloudError('Unexpected write response; read cloud state before retrying','uncertain_write');
    return Number(revision);
   }catch(e){
    if(e instanceof ArenaCloudError&&(e.code==='timeout'||e.code==='network'||e.code==='http_error'))throw new ArenaCloudError(e.message+' Never blindly repeat a write; read the latest revision first.','uncertain_write');
    throw e;
   }
  }
 });
}
