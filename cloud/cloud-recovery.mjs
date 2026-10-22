/* Offline-safe cloud recovery helpers. No network writes or localStorage access. */
import {prepareCloudState,validateCloudState} from './cloud-state.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
export function createCloudRecoveryPackage(snapshot){
 if(!snapshot||!snapshot.initialized||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<1)throw Error('Initialized cloud revision required');
 const state=prepareCloudState(snapshot.state);
 return {format:'cyber-arena-cloud-recovery',version:1,sourceRevision:snapshot.revision,exportedAt:new Date().toISOString(),state};
}
export function inspectCloudRecoveryPackage(pkg){
 if(!pkg||pkg.format!=='cyber-arena-cloud-recovery'||pkg.version!==1||!Number.isSafeInteger(pkg.sourceRevision)||pkg.sourceRevision<1)throw Error('Invalid recovery package');
 const state=prepareCloudState(pkg.state);
 const report=validateCloudState(state);
 return {sourceRevision:pkg.sourceRevision,report,state:clone(state)};
}
export function planCloudRecovery(pkg,currentSnapshot){
 const recovered=inspectCloudRecoveryPackage(pkg);
 if(!currentSnapshot||!currentSnapshot.initialized||!Number.isSafeInteger(currentSnapshot.revision)||currentSnapshot.revision<1)throw Error('Current cloud state must be read and verified');
 validateCloudState(currentSnapshot.state);
 // Deliberately no automatic write. Recovery needs separate verified backup
 // of current cloud state and an explicit owner-confirmed revision-checked write.
 return {expectedRevision:currentSnapshot.revision,sourceRevision:recovered.sourceRevision,state:recovered.state,requiresOwnerConfirmation:true,requiresCurrentCloudBackup:true};
}
