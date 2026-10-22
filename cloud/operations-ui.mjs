import {createArenaCloudClient} from './arena-cloud-client.mjs';
import {createCloudCoordinator} from './cloud-coordinator.mjs';
import {createCloudActionRunner} from './cloud-action-runner.mjs';
const el=id=>document.getElementById(id);
const stations=Array.from({length:16},(_,i)=>i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'));
for(const id of stations){const option=document.createElement('option');option.value=id;option.textContent=id;el('station').append(option)}
let coordinator,runner;
const show=message=>{el('result').textContent=message};
const dateKey=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time-21600000));
const id=()=>crypto.randomUUID();
async function refresh(){if(!coordinator)throw Error('Sign in first');const s=await coordinator.refresh();el('status').textContent='Cloud revision '+s.revision+', active stations '+Object.keys(s.state.active).length;return s}
el('login').onclick=async()=>{try{const client=createArenaCloudClient({url:el('url').value.trim(),publishableKey:el('key').value.trim()});await client.login(el('email').value.trim(),el('password').value);el('password').value='';coordinator=createCloudCoordinator(client);runner=createCloudActionRunner(coordinator);await refresh();show('Owner authenticated.')}catch(e){coordinator=null;runner=null;show('Login failed: '+e.message)}};
el('refresh').onclick=async()=>{try{await refresh();show('Cloud refreshed.')}catch(e){show('Refresh failed: '+e.message)}};
async function run(name,args){if(!runner)throw Error('Sign in first');const s=await runner.execute(name,args);el('status').textContent='Committed revision '+s.revision;show('Committed '+name+'. Do not repeat this transaction.')}
el('apply').onclick=async()=>{try{const stationId=el('station').value,action=el('action').value,n=Number(el('number').value),at=Date.now(),businessDay=dateKey(at);
if(action==='start')await run('start',{stationId,id:id(),at});
else if(action==='startTimed')await run('start',{stationId,id:id(),at,minutes:n});
else if(action==='extend')await run('extend',{stationId,minutes:n,at});
else if(action==='discount')await run('discount',{stationId,type:'fixed',value:n});
else if(action==='finish')await run('finish',{stationId,endedAt:at,billId:id(),movementId:id(),businessDay});
}catch(e){show('Blocked or uncertain: '+e.message+'. Refresh before retrying.')}};
el('sale').onclick=async()=>{try{const at=Date.now();await run('sale',{id:id(),movementId:id(),name:el('saleName').value,qty:Number(el('qty').value),price:Number(el('price').value),at,businessDay:dateKey(at)})}catch(e){show('Blocked or uncertain: '+e.message)}};
el('cash').onclick=async()=>{try{const at=Date.now();await run('cash',{id:id(),description:el('description').value,amount:Number(el('amount').value),at,businessDay:dateKey(at)})}catch(e){show('Blocked or uncertain: '+e.message)}};
