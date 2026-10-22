/* Cloud action adapter. The authoritative coordinator commits first.
   UI render failures must not be confused with failed financial writes. */
import {cloudCommands} from './cloud-commands.mjs';
export class CloudPresentationError extends Error {
 constructor(message,cause){super(message,{cause});this.name='CloudPresentationError';this.cloudCommitted=true}
}
export function createCloudActionRunner(coordinator,{onCommitted=()=>{},onBlocked=()=>{}}={}){
 if(!coordinator||typeof coordinator.transact!=='function')throw TypeError('Cloud coordinator required');
 let pending=false;
 async function execute(name,args){
  if(pending)throw Error('Cloud action already in progress');
  if(!Object.hasOwn(cloudCommands,name))throw Error('Unsupported cloud action');
  pending=true;
  let snapshot;
  try{
   snapshot=await coordinator.transact(cloudCommands[name](args));
  }catch(error){
   try{onBlocked(error)}catch(_){}
   throw error;
  }finally{
   if(!snapshot)pending=false;
  }
  try{
   await onCommitted(snapshot);
   return snapshot;
  }catch(error){
   throw new CloudPresentationError('Cloud write committed, but the interface failed to update. Refresh; do not repeat the transaction.',error);
  }finally{pending=false}
 }
 return Object.freeze({execute,isPending:()=>pending});
}
