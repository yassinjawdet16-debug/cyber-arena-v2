import {createArenaCloudClient} from './arena-cloud-client.mjs';
import {createCloudRecoveryPackage,inspectCloudRecoveryPackage} from './cloud-recovery.mjs';
import {restoreCloudRecovery} from './cloud-restore.mjs';
const $=id=>document.getElementById(id);
let client=null,packageToRestore=null,backupRevision=null,busy=false;
const update=()=>{$('backup').disabled=busy||!client?.isLoggedIn();$('restore').disabled=busy||!client?.isLoggedIn()||!packageToRestore||backupRevision===null};
$('login').onclick=async()=>{
 if(busy)return;busy=true;update();
 try{
  client=createArenaCloudClient({url:$('url').value.trim(),publishableKey:$('key').value.trim()});
  await client.login($('email').value.trim(),$('password').value);
  $('password').value='';
  const snapshot=await client.read();
  $('status').textContent=snapshot.initialized?'Owner verified. Cloud revision '+snapshot.revision:'Cloud empty: recovery unavailable';
  backupRevision=null;
 }catch(e){client=null;$('status').textContent='Login failed: '+e.message}
 finally{busy=false;update()}
};
$('backup').onclick=async()=>{
 if(busy)return;busy=true;update();
 try{
  const snapshot=await client.read(),pkg=createCloudRecoveryPackage(snapshot);
  const blob=new Blob([JSON.stringify(pkg,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='cyber-arena-cloud-recovery-'+snapshot.revision+'.json';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  backupRevision=snapshot.revision;
  $('result').textContent='Backup download requested. Verify that the file is saved and readable before restoring.';
 }catch(e){backupRevision=null;$('result').textContent='Backup failed: '+e.message}
 finally{busy=false;update()}
};
$('inspect').onclick=async()=>{
 packageToRestore=null;update();
 try{
  const file=$('file').files[0];if(!file||file.size>25*1024*1024)throw Error('Select a JSON recovery file under 25 MB');
  const pkg=JSON.parse(await file.text()),info=inspectCloudRecoveryPackage(pkg);
  packageToRestore=pkg;
  $('info').textContent='Validated source revision '+info.sourceRevision+', completed sessions '+info.report.completedSessions+', active sessions '+info.report.activeSessions+'. No cloud data changed.';
 }catch(e){$('info').textContent='Invalid recovery: '+e.message}
 update();
};
$('restore').onclick=async()=>{
 if(busy||!packageToRestore||backupRevision===null)return;
 busy=true;update();
 try{
  const result=await restoreCloudRecovery({client,packageToRestore,
   saveCurrentBackup:async backup=>backup.sourceRevision===backupRevision&&confirm('Have you checked that your current cloud backup was actually saved and opens correctly?'),
   confirmRestore:async details=>confirm('Replace current cloud revision '+details.currentRevision+' with recovery revision '+details.sourceRevision+'? This changes income, bills and sessions.')});
  $('result').textContent='Restore completed at revision '+result.revision+'. Refresh all devices.';
  backupRevision=null;packageToRestore=null;
 }catch(e){backupRevision=null;$('result').textContent='Restore cancelled or uncertain: '+e.message+'. Read cloud before any retry.'}
 finally{busy=false;update()}
};
update();
