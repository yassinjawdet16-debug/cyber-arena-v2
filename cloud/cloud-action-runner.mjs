/* Safe adapter between cloud commands and a UI.
   A UI must not display a financial mutation as committed until this resolves.
   Errors lock the coordinator; caller must refresh and review before retrying. */
import {cloudCommands} from './cloud-commands.mjs';
export function createCloudActionRunner(coordinator,{onCommitted=()=>{},onBlocked=()=>{}}={}){
 if(!coordinator||typeof coordinator.transact!=='function')throw TypeError('Cloud coordinator required');
 let pending=false;
 async function execute(name,args){
  if(pending)throw Error('Cloud action already in progress');
  if(!Object.hasOwn(cloudCommands,name))throw Error('Unsupported cloud action');
  pending=true;
  try{
   const snapshot=await coordinator.transact(cloudCommands[name](args));
   await onCommitted(snapshot);
   return snapshot;
  }catch(error){
   onBlocked(error);
   throw error;
  }finally{pending=false}
 }
 return Object.freeze({execute,isPending:()=>pending});
}
