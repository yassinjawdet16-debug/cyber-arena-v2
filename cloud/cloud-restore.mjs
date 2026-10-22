import {createCloudRecoveryPackage,planCloudRecovery} from './cloud-recovery.mjs';
import {validateCloudState} from './cloud-state.mjs';
export async function restoreCloudRecovery({client,packageToRestore,saveCurrentBackup,confirmRestore}){
 if(!client||typeof client.read!=='function'||typeof client.write!=='function')throw Error('Cloud client required');
 if(typeof saveCurrentBackup!=='function'||typeof confirmRestore!=='function')throw Error('Backup and confirmation required');
 const current=await client.read();
 const plan=planCloudRecovery(packageToRestore,current);
 const saved=await saveCurrentBackup(createCloudRecoveryPackage(current));
 if(saved!==true)throw Error('Current backup not saved; restore cancelled');
 if(await confirmRestore({currentRevision:plan.expectedRevision,sourceRevision:plan.sourceRevision})!==true)throw Error('Restore not confirmed');
 const latest=await client.read();
 if(!latest.initialized||latest.revision!==plan.expectedRevision)throw Error('Cloud changed; restart recovery');
 if(plan.expectedRevision===Number.MAX_SAFE_INTEGER)throw Error('Cloud revision limit reached; recovery write blocked');
 validateCloudState(latest.state);
 if(JSON.stringify(latest.state)!==JSON.stringify(current.state))throw Error('Cloud content changed without revision; restart recovery');
 const revision=await client.write(plan.expectedRevision,plan.state);
 if(revision!==plan.expectedRevision+1)throw Error('Recovery result uncertain; refresh before retrying');
 return {restored:true,revision};
}
