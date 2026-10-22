import {prepareCloudState,validateCloudState} from './cloud-state.mjs';
export class CloudSyncBlockedError extends Error {constructor(message){super(message);this.name='CloudSyncBlockedError'}}
export function createCloudCoordinator(client){
 if(!client||typeof client.read!=='function'||typeof client.write!=='function')throw new TypeError('Cloud client required');
 let snapshot=null,busy=false;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const ready=()=>{if(!snapshot)throw new CloudSyncBlockedError('Refresh cloud state before editing')};
 return Object.freeze({
  status(){return {ready:!!snapshot,busy,revision:snapshot?.revision??null}},
  lock(){if(busy)throw new CloudSyncBlockedError('Operation in progress');snapshot=null},
  async refresh(){
   if(busy)throw new CloudSyncBlockedError('Operation in progress');
   busy=true;snapshot=null;
   try{
    const s=await client.read();
    if(!s.initialized)throw new CloudSyncBlockedError('Initialize cloud before syncing');
    validateCloudState(s.state);
    snapshot={revision:s.revision,state:clone(s.state)};
    return clone(snapshot);
   }finally{busy=false}
  },
  current(){ready();return clone(snapshot)},
  async transact(mutate){
   ready();
   if(busy)throw new CloudSyncBlockedError('Operation in progress');
   if(typeof mutate!=='function')throw new TypeError('Mutator required');
   busy=true;
   try{
    const next=clone(snapshot.state);
    const result=mutate(next);
    if(result&&typeof result.then==='function')throw new CloudSyncBlockedError('Async mutators prohibited');
    const safe=prepareCloudState(next);
    const revision=await client.write(snapshot.revision,safe);
    if(revision!==snapshot.revision+1)throw new CloudSyncBlockedError('Unexpected revision');
    snapshot={revision,state:clone(safe)};
    return clone(snapshot);
   }catch(e){snapshot=null;throw e}
   finally{busy=false}
  }
 });
}
