/* Cloud-only UI transaction boundary. Never falls back to local writes. */
import {createCloudCoordinator} from './cloud-coordinator.mjs';
import {createCloudActionRunner} from './cloud-action-runner.mjs';

export function createCloudUiSession(client,{render=()=>{},onBlocked=()=>{}}={}){
 if(!client||typeof client.read!=='function'||typeof client.write!=='function')throw TypeError('Cloud client required');
 const coordinator=createCloudCoordinator(client);
 let blocked=true,reason='Refresh cloud state before editing',pending=false,view=null;
 const clone=x=>JSON.parse(JSON.stringify(x));
 function block(error){
  blocked=true;view=null;
  reason=String(error?.message||error||'Cloud sync blocked');
  try{onBlocked(reason)}catch(_){}
 }
 const runner=createCloudActionRunner(coordinator,{
  onCommitted:async snapshot=>{
   view=clone(snapshot);
   try{await render(clone(snapshot))}catch(e){block('Cloud committed but display failed; refresh before editing');throw e}
  },
  onBlocked:block
 });
 async function refresh(){
  if(pending||runner.isPending())throw Error('Cloud operation in progress');
  pending=true;blocked=true;view=null;
  try{
   const snapshot=await coordinator.refresh();
   await render(clone(snapshot));
   view=clone(snapshot);blocked=false;reason='';
   return clone(snapshot);
  }catch(e){block(e);throw e}
  finally{pending=false}
 }
 async function execute(name,args){
  if(blocked)throw Error(reason||'Cloud sync blocked');
  if(pending||runner.isPending())throw Error('Cloud operation in progress');
  pending=true;
  try{return await runner.execute(name,args)}
  catch(e){block(e);throw e}
  finally{pending=false}
 }
 function lock(){
  if(pending||runner.isPending())throw Error('Cloud operation in progress');
  coordinator.lock();block('Cloud session locked; refresh before editing');
 }
 return Object.freeze({
  refresh,execute,lock,
  status:()=>({ready:!blocked&&!pending&&!runner.isPending(),blocked,pending:pending||runner.isPending(),reason,revision:view?.revision??null}),
  current:()=>{if(blocked||!view)throw Error(reason);return clone(view)}
 });
}
