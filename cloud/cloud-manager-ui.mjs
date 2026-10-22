import {createArenaCloudClient} from './arena-cloud-client.mjs';
import {createCloudUiSession} from './cloud-ui-session.mjs';
import {iraqBusinessDay} from './business-day.mjs';
const el=id=>document.getElementById(id);
const stations=Array.from({length:16},(_,i)=>i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'));
let client=null,session=null,busy=false;
const newId=()=>crypto.randomUUID();
const safeNumber=id=>Number(el(id).value);
const message=(text,level='error')=>{el('status').textContent=text;el('status').dataset.level=level};
const ready=()=>Boolean(session?.status().ready)&&!busy;
function buttons(){
 const allowed=ready();
 for(const b of document.querySelectorAll('[data-action]'))b.disabled=!allowed;
 el('refresh').disabled=!session||busy;
 el('logout').disabled=!client||busy;
 el('login').disabled=busy;
}
function render(snapshot){
 const root=el('stations');root.replaceChildren();
 el('revision').textContent='Cloud revision '+snapshot.revision+' · '+Object.keys(snapshot.state.active).length+' active station(s)';
 for(const stationId of stations){
  const st=snapshot.state.stations.find(x=>x.id===stationId),active=snapshot.state.active[stationId];
  const card=document.createElement('article');card.className='station';
  const title=document.createElement('h3');title.textContent=stationId;card.append(title);
  const details=document.createElement('p');details.className='muted';
  details.textContent=st.rate.toLocaleString('en-US')+' IQD/hr · '+(active?'Active since '+new Date(active.startedAt).toLocaleString():'Available');
  card.append(details);
  if(active?.endsAt){const p=document.createElement('p');p.textContent='Timed until '+new Date(active.endsAt).toLocaleString();card.append(p)}
  const actions=active?['extend','discount','finish']:['start','timed'];
  for(const action of actions){
   const button=document.createElement('button');button.dataset.action=action;button.dataset.station=stationId;
   button.textContent={start:'Start open',timed:'Start timed',extend:'Extend timed session',discount:'Set discount',finish:'Finish and bill'}[action];
   card.append(button);
  }
  root.append(card);
 }
 buttons();
}
async function refresh(){
 if(!session)throw Error('Owner sign-in required');
 busy=true;buttons();
 try{const snapshot=await session.refresh();message('Cloud refreshed. Revision '+snapshot.revision,'ok')}
 catch(e){message('Cloud refresh blocked: '+e.message+'. No financial edits allowed.')}
 finally{busy=false;buttons()}
}
el('login').addEventListener('click',async()=>{
 if(busy)return;busy=true;buttons();
 try{
  client=createArenaCloudClient({url:el('url').value.trim(),publishableKey:el('key').value.trim()});
  await client.login(el('email').value.trim(),el('password').value);
  el('password').value='';
  session=createCloudUiSession(client,{render,onBlocked:e=>message('Cloud locked: '+e)});
  const snapshot=await session.refresh();
  message('Owner authenticated. Cloud revision '+snapshot.revision,'ok');
 }catch(e){client?.logout();client=null;session=null;el('password').value='';message('Login or initial refresh failed: '+e.message)}
 finally{busy=false;buttons()}
});
el('refresh').addEventListener('click',refresh);
el('logout').addEventListener('click',()=>{
 if(busy)return;
 try{session?.lock()}catch(_){}
 client?.logout();client=null;session=null;el('revision').textContent='Cloud not connected';el('stations').replaceChildren();
 message('Signed out. Cloud editing disabled.','ok');buttons();
});
function argsFor(action,stationId){
 const at=Date.now(),businessDay=iraqBusinessDay(at),minutes=safeNumber('minutes');
 switch(action){
  case 'start':return ['start',{stationId,id:newId(),at}];
  case 'timed':return ['start',{stationId,id:newId(),at,minutes}];
  case 'extend':return ['extend',{stationId,minutes,at}];
  case 'discount':return ['discount',{stationId,type:el('discountType').value,value:safeNumber('discount')}];
  case 'finish':return ['finish',{stationId,endedAt:at,billId:newId(),movementId:newId(),businessDay}];
  case 'sale':return ['sale',{id:newId(),movementId:newId(),name:el('product').value.trim(),qty:safeNumber('qty'),price:safeNumber('price'),at,businessDay}];
  case 'cash':return ['cash',{id:newId(),amount:safeNumber('amount'),description:el('description').value.trim(),at,businessDay}];
  default:throw Error('Unsupported operation');
 }
}
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-action]');
 if(!target||!ready())return;
 const action=target.dataset.action,stationId=target.dataset.station;
 const [command,args]=argsFor(action,stationId);
 if(!confirm('This changes Supabase financial or session records. Confirm this is a backed-up TEST project and approve '+action+(stationId?' on '+stationId:'')+'?'))return;
 busy=true;buttons();
 try{
  const snapshot=await session.execute(command,args);
  message('Committed '+command+' at cloud revision '+snapshot.revision+'. Do not repeat this action.','ok');
 }catch(e){
  message('BLOCKED / OUTCOME MAY BE UNCERTAIN: '+e.message+'. Refresh and inspect cloud records before considering another action.');
 }finally{busy=false;buttons()}
});
buttons();
